package com.harleystudios.critterextraction;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;
import org.webrtc.CandidatePairChangeEvent;
import org.webrtc.DataChannel;
import org.webrtc.IceCandidate;
import org.webrtc.MediaConstraints;
import org.webrtc.MediaStream;
import org.webrtc.PeerConnection;
import org.webrtc.PeerConnectionFactory;
import org.webrtc.RtpReceiver;
import org.webrtc.RtpTransceiver;
import org.webrtc.SdpObserver;
import org.webrtc.SessionDescription;

import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

/**
 * Native PeerJS-compatible signaling + WebRTC data-channel transport.
 * It mirrors main/live: 6-digit harleys-critter rooms, four players, co-op/PvP,
 * Google/Cloudflare STUN and PeerJS TURN relays.
 */
public final class NativeMultiplayerManager {
    public interface Listener {
        void onStatus(String status);
        void onPeerCount(int count);
        void onGameStart(long seed);
        void onError(String error);
    }
    public static final int MAX_PLAYERS=4;
    private static final Handler MAIN=new Handler(Looper.getMainLooper());
    private static boolean WEBRTC_INITIALIZED;
    private final Context context;private final NativeProfileStore store;private final OkHttpClient http=new OkHttpClient.Builder().pingInterval(20,TimeUnit.SECONDS).build();private final Map<String,Link> links=new ConcurrentHashMap<>();private final Map<String,RemoteState> remoteStates=new ConcurrentHashMap<>();private final ScheduledExecutorService ticks=Executors.newSingleThreadScheduledExecutor();
    private PeerConnectionFactory factory;private WebSocket signal;private Listener listener;private boolean host,signalReady,started,closed;private String roomCode="",peerId="",hostPeerId="",mode="coop";private long matchSeed;private NativeMatch match;

    public NativeMultiplayerManager(Context context,NativeProfileStore store){this.context=context.getApplicationContext();this.store=store;initWebRtc();ticks.scheduleAtFixedRate(this::networkTick,100,100,TimeUnit.MILLISECONDS);}
    private synchronized void initWebRtc(){if(!WEBRTC_INITIALIZED){PeerConnectionFactory.initialize(PeerConnectionFactory.InitializationOptions.builder(context).setEnableInternalTracer(false).createInitializationOptions());WEBRTC_INITIALIZED=true;}factory=PeerConnectionFactory.builder().createPeerConnectionFactory();}

    public String host(String mode,Listener listener){this.listener=listener;this.host=true;this.mode="pvp".equalsIgnoreCase(mode)?"pvp":"coop";this.roomCode=String.format(java.util.Locale.US,"%06d",100000+new Random().nextInt(900000));this.peerId="harleys-critter-"+roomCode;this.hostPeerId=peerId;openSignal();return roomCode;}
    public void join(String code,Listener listener){this.listener=listener;this.host=false;this.mode="coop";roomCode=(code==null?"":code.replaceAll("[^0-9]","")).trim();if(roomCode.length()!=6){error("Room code must be six digits.");return;}hostPeerId="harleys-critter-"+roomCode;peerId="harleys-critter-guest-"+UUID.randomUUID().toString().replace("-","").substring(0,12);openSignal();}
    public boolean isHost(){return host;}public String roomCode(){return roomCode;}public String mode(){return mode;}public int peerCount(){int n=1;for(Link l:links.values())if(l.open)n++;return n;}public long matchSeed(){return matchSeed;}public boolean started(){return started;}
    public void startGame(){if(!host||closed)return;if(matchSeed==0)matchSeed=new Random().nextLong();started=true;JSONObject o=new JSONObject();put(o,"type","start");put(o,"seed",matchSeed);put(o,"mode",mode);broadcast(o);notifyGameStart(matchSeed);}
    public void attachMatch(NativeMatch match){this.match=match;if(match!=null){match.networkMode=host?("HOST "+mode.toUpperCase()):(mode.toUpperCase()+" GUEST");match.localNetworkId=peerId;}}

    private void openSignal(){try{String token=UUID.randomUUID().toString().replace("-","");String url="wss://0.peerjs.com/peerjs?key=peerjs&id="+URLEncoder.encode(peerId,"UTF-8")+"&token="+URLEncoder.encode(token,"UTF-8")+"&version=1.5.5";status("Connecting to direct-room signaling…");Request req=new Request.Builder().url(url).header("Origin","https://peerjs.com").build();signal=http.newWebSocket(req,new WebSocketListener(){@Override public void onOpen(WebSocket ws,Response response){status("Signaling socket connected…");}@Override public void onMessage(WebSocket ws,String text){handleSignal(text);}@Override public void onFailure(WebSocket ws,Throwable t,Response response){error("Signaling failed: "+(t==null?"unknown":t.getMessage()));}@Override public void onClosed(WebSocket ws,int code,String reason){if(!closed)status("Signaling closed: "+reason);}});}catch(Exception e){error("Unable to open signaling: "+e.getMessage());}}
    private void handleSignal(String text){try{JSONObject msg=new JSONObject(text);String type=msg.optString("type","").toUpperCase();if("OPEN".equals(type)){signalReady=true;if(host){status("Room "+roomCode+" ready • "+mode.toUpperCase());peerCountChanged();}else{status("Room found. Creating direct WebRTC connection…");createOutgoing(hostPeerId);}return;}if("ID-TAKEN".equals(type)){error(host?"That room code was already in use. Try Host again.":"Peer ID was rejected.");return;}if("ERROR".equals(type)){error(msg.optString("payload","Peer signaling error"));return;}String src=msg.optString("src","");JSONObject payload=msg.optJSONObject("payload");if(src.isEmpty()||payload==null)return;if("OFFER".equals(type)){if(!host||links.size()>=MAX_PLAYERS-1){sendLeave(src);return;}handleOffer(src,payload);}else if("ANSWER".equals(type))handleAnswer(src,payload);else if("CANDIDATE".equals(type))handleCandidate(src,payload);else if("LEAVE".equals(type)||"EXPIRE".equals(type))removePeer(src);}catch(Exception e){status("Ignored malformed signal packet.");}}

    private PeerConnection.RTCConfiguration rtcConfig(){List<PeerConnection.IceServer> ice=new ArrayList<>();ice.add(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer());ice.add(PeerConnection.IceServer.builder("stun:stun.cloudflare.com:3478").createIceServer());ice.add(PeerConnection.IceServer.builder(Arrays.asList("turn:eu-0.turn.peerjs.com:3478","turn:us-0.turn.peerjs.com:3478")).setUsername("peerjs").setPassword("peerjsp").createIceServer());PeerConnection.RTCConfiguration cfg=new PeerConnection.RTCConfiguration(ice);cfg.continualGatheringPolicy=PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY;return cfg;}
    private Link newLink(String remote,String connectionId){Link existing=links.get(remote);if(existing!=null)return existing;Link link=new Link(remote,connectionId);PeerConnection pc=factory.createPeerConnection(rtcConfig(),new PeerObserver(link));if(pc==null){error("Could not create WebRTC peer connection.");return null;}link.pc=pc;links.put(remote,link);return link;}
    private void createOutgoing(String remote){String cid="dc_"+UUID.randomUUID().toString().replace("-","").substring(0,12);Link link=newLink(remote,cid);if(link==null)return;DataChannel.Init init=new DataChannel.Init();init.ordered=true;link.channel=link.pc.createDataChannel("critter-data",init);bindChannel(link,link.channel);link.pc.createOffer(new CreateSdp(link,true),new MediaConstraints());}
    private void handleOffer(String src,JSONObject payload){String cid=payload.optString("connectionId","dc_"+UUID.randomUUID().toString().substring(0,8));Link link=newLink(src,cid);if(link==null)return;JSONObject sdp=payload.optJSONObject("sdp");if(sdp==null)return;SessionDescription desc=new SessionDescription(SessionDescription.Type.OFFER,sdp.optString("sdp",""));link.pc.setRemoteDescription(new SetRemoteSdp(link,()->link.pc.createAnswer(new CreateSdp(link,false),new MediaConstraints())),desc);}
    private void handleAnswer(String src,JSONObject payload){Link link=links.get(src);if(link==null)return;JSONObject sdp=payload.optJSONObject("sdp");if(sdp==null)return;link.pc.setRemoteDescription(new SetRemoteSdp(link,null),new SessionDescription(SessionDescription.Type.ANSWER,sdp.optString("sdp","")));}
    private void handleCandidate(String src,JSONObject payload){Link link=links.get(src);if(link==null)return;JSONObject c=payload.optJSONObject("candidate");if(c==null)return;IceCandidate candidate=new IceCandidate(c.optString("sdpMid",null),c.optInt("sdpMLineIndex",0),c.optString("candidate",""));if(link.remoteSet)link.pc.addIceCandidate(candidate);else link.pending.add(candidate);}

    private final class CreateSdp implements SdpObserver {final Link link;final boolean offer;CreateSdp(Link l,boolean offer){link=l;this.offer=offer;}public void onCreateSuccess(SessionDescription d){link.pc.setLocalDescription(new SimpleSdp(),d);JSONObject sdp=new JSONObject();put(sdp,"type",offer?"offer":"answer");put(sdp,"sdp",d.description);JSONObject payload=new JSONObject();put(payload,"sdp",sdp);put(payload,"type","data");put(payload,"connectionId",link.connectionId);put(payload,"reliable",true);put(payload,"serialization","json");put(payload,"label","critter-data");put(payload,"browser","Android");sendSignal(offer?"OFFER":"ANSWER",link.remote,payload);}public void onSetSuccess(){}public void onCreateFailure(String s){error("WebRTC SDP failed: "+s);}public void onSetFailure(String s){error("WebRTC local description failed: "+s);}}
    private static final class SimpleSdp implements SdpObserver {public void onCreateSuccess(SessionDescription d){}public void onSetSuccess(){}public void onCreateFailure(String s){}public void onSetFailure(String s){}}
    private final class SetRemoteSdp implements SdpObserver {final Link link;final Runnable next;SetRemoteSdp(Link l,Runnable n){link=l;next=n;}public void onCreateSuccess(SessionDescription d){}public void onSetSuccess(){link.remoteSet=true;for(IceCandidate c:link.pending)link.pc.addIceCandidate(c);link.pending.clear();if(next!=null)next.run();}public void onCreateFailure(String s){}public void onSetFailure(String s){error("WebRTC remote description failed: "+s);}}

    private final class PeerObserver implements PeerConnection.Observer {final Link link;PeerObserver(Link l){link=l;}public void onSignalingChange(PeerConnection.SignalingState s){}public void onIceConnectionChange(PeerConnection.IceConnectionState s){if(s==PeerConnection.IceConnectionState.FAILED)status("ICE failed for "+link.remote+"; trying relay candidates…");}public void onStandardizedIceConnectionChange(PeerConnection.IceConnectionState s){}public void onConnectionChange(PeerConnection.PeerConnectionState s){if(s==PeerConnection.PeerConnectionState.FAILED||s==PeerConnection.PeerConnectionState.CLOSED)removePeer(link.remote);}public void onIceConnectionReceivingChange(boolean b){}public void onIceGatheringChange(PeerConnection.IceGatheringState s){}public void onIceCandidate(IceCandidate c){JSONObject cc=new JSONObject();put(cc,"candidate",c.sdp);put(cc,"sdpMid",c.sdpMid);put(cc,"sdpMLineIndex",c.sdpMLineIndex);JSONObject payload=new JSONObject();put(payload,"candidate",cc);put(payload,"type","data");put(payload,"connectionId",link.connectionId);sendSignal("CANDIDATE",link.remote,payload);}public void onIceCandidatesRemoved(IceCandidate[] c){}public void onSelectedCandidatePairChanged(CandidatePairChangeEvent e){}public void onAddStream(MediaStream s){}public void onRemoveStream(MediaStream s){}public void onDataChannel(DataChannel d){link.channel=d;bindChannel(link,d);}public void onRenegotiationNeeded(){}public void onAddTrack(RtpReceiver r,MediaStream[] streams){}public void onTrack(RtpTransceiver transceiver){} }
    private void bindChannel(Link link,DataChannel channel){if(channel==null)return;channel.registerObserver(new DataChannel.Observer(){public void onBufferedAmountChange(long l){}public void onStateChange(){if(channel.state()==DataChannel.State.OPEN){link.open=true;status("Direct peer connected: "+link.remote);sendHello(link);peerCountChanged();if(host&&started)sendStart(link);}}public void onMessage(DataChannel.Buffer b){ByteBuffer data=b.data;byte[] bytes=new byte[data.remaining()];data.get(bytes);handleData(link,new String(bytes,StandardCharsets.UTF_8));}});}

    private void sendHello(Link link){NativeProfileStore.Account a=store.active();JSONObject o=new JSONObject();put(o,"type","hello");put(o,"name",a.displayName);put(o,"username",a.username);put(o,"species",a.speciesId);put(o,"mode",mode);put(o,"version","v0.22.0-native");sendData(link,o);}
    private void sendStart(Link link){JSONObject o=new JSONObject();put(o,"type","start");put(o,"seed",matchSeed);put(o,"mode",mode);sendData(link,o);}
    private void handleData(Link link,String raw){try{JSONObject o=new JSONObject(raw);String type=o.optString("type","");if("hello".equals(type)){RemoteState r=remoteStates.computeIfAbsent(link.remote,k->new RemoteState());r.id=link.remote;r.name=o.optString("name","Critter");r.species=o.optString("species","puppy");String remoteMode=o.optString("mode",mode);if(!host)mode=remoteMode;status(r.name+" joined the room");peerCountChanged();if(host&&started)sendStart(link);}else if("start".equals(type)&&!host){matchSeed=o.optLong("seed",0);mode=o.optString("mode","coop");started=true;notifyGameStart(matchSeed);}else if("state".equals(type)&&host){acceptGuestState(link,o);}else if("snapshot".equals(type)&&!host){applySnapshot(o);}else if("ping".equals(type)){JSONObject pong=new JSONObject();put(pong,"type","pong");sendData(link,pong);}}catch(Exception ignored){}}
    private void acceptGuestState(Link link,JSONObject o){RemoteState r=remoteStates.computeIfAbsent(link.remote,k->new RemoteState());long now=System.nanoTime();float nx=(float)o.optDouble("x",r.x),nz=(float)o.optDouble("z",r.z);if(r.lastNs!=0){float dt=Math.min(.5f,(now-r.lastNs)/1_000_000_000f);float max=8.5f*dt+1.2f;float dx=nx-r.x,dz=nz-r.z,d=(float)Math.hypot(dx,dz);if(d>max&&d>0){nx=r.x+dx/d*max;nz=r.z+dz/d*max;}}r.lastNs=now;r.x=nx;r.z=nz;r.hp=clamp((float)o.optDouble("hp",100),0,100);r.shield=clamp((float)o.optDouble("shield",0),0,100);r.species=o.optString("species",r.species==null?"puppy":r.species);r.name=o.optString("name",r.name==null?"Critter":r.name);if(match!=null)match.upsertRemote(r.id,r.name,r.species,r.x,r.z,r.hp,r.shield);}
    private void applySnapshot(JSONObject o){JSONArray players=o.optJSONArray("players");if(players==null||match==null)return;for(int i=0;i<players.length();i++){JSONObject p=players.optJSONObject(i);if(p==null)continue;String id=p.optString("id","");if(id.isEmpty()||id.equals(peerId))continue;match.upsertRemote(id,p.optString("name","Critter"),p.optString("species","puppy"),(float)p.optDouble("x",0),(float)p.optDouble("z",0),(float)p.optDouble("hp",100),(float)p.optDouble("shield",0));}}
    private void networkTick(){if(closed||!started||match==null)return;try{if(host){JSONObject snap=new JSONObject();put(snap,"type","snapshot");JSONArray players=new JSONArray();players.put(localState());for(RemoteState r:remoteStates.values())players.put(r.json());put(snap,"players",players);broadcast(snap);}else{Link h=links.get(hostPeerId);if(h!=null&&h.open){JSONObject state=localState();put(state,"type","state");sendData(h,state);}}}catch(Exception ignored){}}
    private JSONObject localState(){JSONObject o=new JSONObject();NativeProfileStore.Account a=store.active();put(o,"id",peerId);put(o,"name",a.displayName);put(o,"species",a.speciesId);if(match!=null){put(o,"x",match.playerX);put(o,"z",match.playerZ);put(o,"hp",match.hp);put(o,"shield",match.shield);put(o,"aimX",match.aimX);put(o,"aimZ",match.aimZ);}return o;}

    private void sendData(Link link,JSONObject o){if(link==null||link.channel==null||link.channel.state()!=DataChannel.State.OPEN)return;byte[] bytes=o.toString().getBytes(StandardCharsets.UTF_8);link.channel.send(new DataChannel.Buffer(ByteBuffer.wrap(bytes),false));}
    private void broadcast(JSONObject o){for(Link l:links.values())if(l.open)sendData(l,o);}
    private void sendSignal(String type,String dst,JSONObject payload){JSONObject o=new JSONObject();put(o,"type",type);put(o,"dst",dst);put(o,"payload",payload);WebSocket ws=signal;if(ws!=null)ws.send(o.toString());}
    private void sendLeave(String dst){JSONObject o=new JSONObject();put(o,"type","LEAVE");put(o,"dst",dst);WebSocket ws=signal;if(ws!=null)ws.send(o.toString());}
    private void removePeer(String id){Link l=links.remove(id);remoteStates.remove(id);if(l!=null){try{if(l.channel!=null)l.channel.close();}catch(Throwable ignored){}try{if(l.pc!=null)l.pc.close();}catch(Throwable ignored){}}if(match!=null)match.removeRemote(id);peerCountChanged();}
    public void close(){closed=true;ticks.shutdownNow();for(String id:new ArrayList<>(links.keySet()))removePeer(id);try{if(signal!=null)signal.close(1000,"leaving");}catch(Throwable ignored){}try{if(factory!=null)factory.dispose();}catch(Throwable ignored){}http.dispatcher().executorService().shutdown();}

    private void status(String s){Listener l=listener;if(l!=null)MAIN.post(()->l.onStatus(s));}private void error(String s){Listener l=listener;if(l!=null)MAIN.post(()->l.onError(s));}private void peerCountChanged(){Listener l=listener;if(l!=null)MAIN.post(()->l.onPeerCount(peerCount()));}private void notifyGameStart(long seed){Listener l=listener;if(l!=null)MAIN.post(()->l.onGameStart(seed));}
    private static void put(JSONObject o,String k,Object v){try{o.put(k,v);}catch(Exception ignored){}}private static float clamp(float v,float lo,float hi){return Math.max(lo,Math.min(hi,v));}
    private static final class Link {final String remote,connectionId;PeerConnection pc;DataChannel channel;boolean remoteSet,open;final ArrayList<IceCandidate> pending=new ArrayList<>();Link(String r,String c){remote=r;connectionId=c;}}
    private static final class RemoteState {String id,name="Critter",species="puppy";float x,z,hp=100,shield;long lastNs;JSONObject json(){JSONObject o=new JSONObject();put(o,"id",id);put(o,"name",name);put(o,"species",species);put(o,"x",x);put(o,"z",z);put(o,"hp",hp);put(o,"shield",shield);return o;}}
}
