(() => {
  'use strict';
  if (!Array.isArray(window.__CRITTER_ARENA_PATCHES__)) throw new Error('Private chat censor notice fix loaded before patch runtime');

  const replaceFunction=(source,name,nextName,replacement)=>{
    const start=source.indexOf(`  function ${name}(`),end=start>=0?source.indexOf(`  function ${nextName}(`,start):-1;
    if(start<0||end<0){console.warn(`Optional LIVE patch missing: ${name} function boundary`);return source;}
    return source.slice(0,start)+replacement.trimEnd()+'\n'+source.slice(end);
  };

  window.__CRITTER_ARENA_PATCHES__.push(source=>{
    if(source.includes('__CRITTER_PRIVATE_CHAT_CENSOR_NOTICE__'))return source;
    const audienceAnchor='  function roomChatAudienceMatches(senderId,recipientId){';
    if(source.includes(audienceAnchor)){
      const helpers=String.raw`  function roomChatPlainText(value){return String(value||'').replace(/[<>\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,180);}
  function roomChatWasCensored(value){return cleanRoomChatText(value)!==roomChatPlainText(value);}
  function appendPrivateChatCensorNotice(){
    const message='Your message contained blocked language and was censored. Only you can see this warning.';
    const root=document.getElementById('multiplayerChatMessages');
    if(root){const row=document.createElement('div');row.className='multiplayer-chat-message multiplayer-chat-private-warning';const sender=document.createElement('strong');sender.textContent='SYSTEM';const text=document.createElement('span');text.textContent=message;row.append(sender,text);root.append(row);while(root.children.length>10)root.firstElementChild.remove();root.scrollTop=root.scrollHeight;}
    window.CritterNotifications?.push?.({type:'moderation',title:'Chat message filtered',message,source:'Room Chat'});toast('Message censored — private warning added',2600);
  }
  window.__CRITTER_PRIVATE_CHAT_CENSOR_NOTICE__=appendPrivateChatCensorNotice;
`;
      source=source.replace(audienceAnchor,helpers+audienceAnchor);
    }else console.warn('Optional LIVE patch missing: private chat censorship helper anchor');

    source=replaceFunction(source,'hostRoomChat','closeRoomChatInput',String.raw`  function hostRoomChat(senderId,text){
    const clean=cleanRoomChatText(text),player=players[senderId],violated=roomChatWasCensored(text);if(!clean||!player)return false;
    const packet={type:'roomChat',id:uid(),senderId,sender:safeText(player.profile?.displayName||senderId,24),team:player.team||'',text:clean,at:Date.now()};
    if(violated){if(senderId==='host')appendPrivateChatCensorNotice();else sendNet({type:'chatCensorNotice'},senderId);}
    if(roomChatAudienceMatches(senderId,localPlayerId))appendRoomChat(packet);relayRoomChat(packet);return true;
  }
`);
    source=replaceFunction(source,'submitRoomChat','sendMultiplayerPings',String.raw`  function submitRoomChat(value){
    if(!match||match.role==='solo')return false;
    const inputEl=document.getElementById('multiplayerChatInput'),raw=String(value??inputEl?.value??''),text=cleanRoomChatText(raw);
    if(!text){closeRoomChatInput();return false;}
    if(networkRole==='host')hostRoomChat('host',raw);else{if(roomChatWasCensored(raw))appendPrivateChatCensorNotice();sendNet({type:'roomChat',text});}
    if(inputEl)inputEl.value='';closeRoomChatInput();return true;
  }
`);
    const handlerAnchor="  function handleNet(msg,sourceId='host'){\n";
    if(source.includes(handlerAnchor))source=source.replace(handlerAnchor,handlerAnchor+String.raw`    if(msg.type==='chatCensorNotice'){if(networkRole!=='host'&&sourceId==='host')appendPrivateChatCensorNotice();return;}
`);else console.warn('Optional LIVE patch missing: private censorship notice handler');
    return source;
  });

  const previousUi=window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__=function injectPrivateCensorNoticeStyle(){
    previousUi?.();if(document.getElementById('privateCensorNoticeStyles'))return;
    const style=document.createElement('style');style.id='privateCensorNoticeStyles';style.textContent=`.multiplayer-chat-private-warning{padding:6px 7px;border:1px solid rgba(255,211,111,.3);border-radius:8px;background:rgba(255,211,111,.08)}.multiplayer-chat-private-warning strong{color:#ffd36f!important}.multiplayer-chat-private-warning span{color:#fff2c8!important;font-weight:700}`;document.head.appendChild(style);
  };
})();
