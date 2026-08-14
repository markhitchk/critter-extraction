package com.harleystudios.critterextraction;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Native schema-18 multi-account save/stash/economy store modeled on main/live. */
public final class NativeProfileStore {
    private static final String PREFS="critter_native_profile_v18";
    private static final String KEY="database";
    private final SharedPreferences prefs;
    private final ArrayList<Account> accounts=new ArrayList<>();
    private String activeId;

    public NativeProfileStore(Context context){prefs=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);load();}

    public synchronized Account active(){
        for(Account a:accounts)if(a.id.equals(activeId))return a;
        if(accounts.isEmpty())accounts.add(defaultAccount());
        activeId=accounts.get(0).id;save();return accounts.get(0);
    }
    public synchronized List<Account> accounts(){return new ArrayList<>(accounts);}
    public synchronized Account createAccount(String displayName){Account a=defaultAccount();a.displayName=cleanName(displayName);a.username=handleFrom(a.displayName);accounts.add(a);activeId=a.id;save();return a;}
    public synchronized boolean switchAccount(String id){for(Account a:accounts)if(a.id.equals(id)){activeId=id;save();return true;}return false;}
    public synchronized boolean deleteAccount(String id){if(accounts.size()<=1)return false;for(int i=0;i<accounts.size();i++)if(accounts.get(i).id.equals(id)){accounts.remove(i);if(id.equals(activeId))activeId=accounts.get(0).id;save();return true;}return false;}
    public synchronized void updateProfile(String display,String username,String bio,String species){Account a=active();a.displayName=cleanName(display);a.username=cleanHandle(username);a.bio=bio==null?"":limit(bio.trim(),90);if(NativeGameData.SPECIES.containsKey(species))a.speciesId=species;save();}
    public synchronized void selectSpecies(String id){if(NativeGameData.SPECIES.containsKey(id)){active().speciesId=id;save();}}
    public synchronized void selectLoadout(String id){if(NativeGameData.LOADOUTS.containsKey(id)){Account a=active();a.loadoutId=id;NativeGameData.Loadout l=NativeGameData.LOADOUTS.get(id);if(!l.custom){a.equippedWeaponId=l.weaponId;a.equippedArmorId=l.armorId;}save();}}
    public synchronized void updateSettings(NativeGameData.Settings s){active().settings=copySettings(s);save();}

    public synchronized boolean addToStash(String itemId,int qty){boolean ok=addStack(active().stash,NativeGameData.STASH_SLOTS,itemId,qty);if(ok)save();return ok;}
    public synchronized boolean removeFromStash(String itemId,int qty){boolean ok=removeStack(active().stash,itemId,qty);if(ok)save();return ok;}
    public synchronized int stashCount(String itemId){return count(active().stash,itemId);}
    public synchronized int preparedCount(String itemId){return count(active().prepared,itemId);}
    public synchronized boolean moveStashToPrepared(String itemId,int qty){Account a=active();if(count(a.stash,itemId)<qty)return false;if(!canAdd(a.prepared,NativeGameData.BACKPACK_SLOTS,itemId,qty))return false;removeStack(a.stash,itemId,qty);addStack(a.prepared,NativeGameData.BACKPACK_SLOTS,itemId,qty);save();return true;}
    public synchronized boolean movePreparedToStash(String itemId,int qty){Account a=active();if(count(a.prepared,itemId)<qty)return false;if(!canAdd(a.stash,NativeGameData.STASH_SLOTS,itemId,qty))return false;removeStack(a.prepared,itemId,qty);addStack(a.stash,NativeGameData.STASH_SLOTS,itemId,qty);save();return true;}

    public synchronized String buy(String itemId,int qty){NativeGameData.Item item=NativeGameData.ITEMS.get(itemId);Account a=active();if(item==null||qty<=0)return "Unknown item.";long cost=(long)item.buyPrice*qty;if(cost>a.petals)return "Not enough Petals.";if(!canAdd(a.stash,NativeGameData.STASH_SLOTS,itemId,qty))return "Stash is full.";a.petals=NativeGameData.clampPetals((int)(a.petals-cost));addStack(a.stash,NativeGameData.STASH_SLOTS,itemId,qty);a.transactions.add(0,"BUY "+qty+"x "+item.name+" -"+cost);trimTransactions(a);save();return "Bought "+qty+"x "+item.name+".";}
    public synchronized String sell(String itemId,int qty){NativeGameData.Item item=NativeGameData.ITEMS.get(itemId);Account a=active();if(item==null||!item.canSell)return "That item cannot be sold.";if(qty<=0||count(a.stash,itemId)<qty)return "Not enough in stash.";long room=NativeGameData.PETAL_CAP-a.petals;long value=(long)item.sellPrice*qty;if(value>room)return "Petal cap would be exceeded.";removeStack(a.stash,itemId,qty);a.petals=NativeGameData.clampPetals((int)(a.petals+value));a.transactions.add(0,"SELL "+qty+"x "+item.name+" +"+value);trimTransactions(a);save();return "Sold "+qty+"x "+item.name+".";}
    public synchronized String sellSafeJunk(){Account a=active();int earned=0,count=0;for(String id:NativeGameData.SAFE_JUNK_IDS){NativeGameData.Item item=NativeGameData.ITEMS.get(id);int qty=count(a.stash,id);if(item==null||qty<=0)continue;int max=(NativeGameData.PETAL_CAP-a.petals-earned)/Math.max(1,item.sellPrice);int sell=Math.min(qty,max);if(sell<=0)continue;removeStack(a.stash,id,sell);earned+=sell*item.sellPrice;count+=sell;}a.petals=NativeGameData.clampPetals(a.petals+earned);if(count>0){a.transactions.add(0,"SELL JUNK "+count+" items +"+earned);trimTransactions(a);save();}return count>0?"Sold "+count+" junk items for "+earned+" Petals.":"No safe junk to sell.";}

    public synchronized void recordMatch(boolean extracted,int berries,int kills,int xpReward,int petalReward,List<Stack> banked){Account a=active();a.stats.matches++;a.stats.kills+=Math.max(0,kills);if(extracted){a.stats.extracts++;a.stats.berries+=Math.max(0,berries);a.xp=Math.max(0,a.xp+Math.max(0,xpReward));a.petals=NativeGameData.clampPetals(a.petals+Math.max(0,petalReward));if(banked!=null)for(Stack s:banked)if(!isAmmo(s.itemId))addStack(a.stash,NativeGameData.STASH_SLOTS,s.itemId,s.qty);}save();}
    public synchronized void setPetalsForTesting(int value){active().petals=NativeGameData.clampPetals(value);save();}

    public synchronized String exportJson(){try{return toJson().toString(2);}catch(Exception e){return "{}";}}
    public synchronized boolean importJson(String source){try{JSONObject root=new JSONObject(source);ArrayList<Account> incoming=new ArrayList<>();JSONArray arr=root.optJSONArray("accounts");if(arr==null)return false;for(int i=0;i<arr.length();i++)incoming.add(Account.fromJson(arr.getJSONObject(i)));if(incoming.isEmpty())return false;accounts.clear();accounts.addAll(incoming);activeId=root.optString("activeAccountId",accounts.get(0).id);save();return true;}catch(Exception e){return false;}}

    private void load(){accounts.clear();try{String raw=prefs.getString(KEY,"");if(raw!=null&&!raw.isEmpty()){JSONObject root=new JSONObject(raw);JSONArray arr=root.optJSONArray("accounts");if(arr!=null)for(int i=0;i<arr.length();i++)accounts.add(Account.fromJson(arr.getJSONObject(i)));activeId=root.optString("activeAccountId","");}}catch(Exception ignored){}if(accounts.isEmpty()){Account a=defaultAccount();accounts.add(a);activeId=a.id;save();}if(activeId==null||activeId.isEmpty())activeId=accounts.get(0).id;}
    public synchronized void save(){prefs.edit().putString(KEY,toJson().toString()).apply();}
    private JSONObject toJson(){JSONObject root=new JSONObject();try{root.put("schemaVersion",NativeGameData.SAVE_SCHEMA);root.put("activeAccountId",activeId);JSONArray arr=new JSONArray();for(Account a:accounts)arr.put(a.toJson());root.put("accounts",arr);}catch(Exception ignored){}return root;}

    private static Account defaultAccount(){Account a=new Account();a.id="acct-"+UUID.randomUUID().toString().substring(0,8);a.username="rookie";a.displayName="New Critter";a.bio="Ready for the meadow.";a.speciesId="puppy";a.loadoutId="meadow_scout";a.equippedWeaponId="pea_popper";a.equippedArmorId="leaf_vest";return a;}
    private static boolean isAmmo(String id){NativeGameData.Item i=NativeGameData.ITEMS.get(id);return i!=null&&i.ammo;}
    private static String cleanName(String value){String s=value==null?"":value.trim();return s.isEmpty()?"New Critter":limit(s,24);}
    private static String cleanHandle(String value){String s=value==null?"":value.trim().replaceFirst("^@","").replaceAll("[^A-Za-z0-9_.-]","");return s.isEmpty()?"rookie":limit(s,20);}
    private static String handleFrom(String display){return cleanHandle(display.toLowerCase(Locale.US).replace(" ","_"));}
    private static String limit(String s,int n){return s.length()<=n?s:s.substring(0,n);}
    private static void trimTransactions(Account a){while(a.transactions.size()>30)a.transactions.remove(a.transactions.size()-1);}

    private static int count(List<Stack> list,String id){int n=0;for(Stack s:list)if(s.itemId.equals(id))n+=s.qty;return n;}
    private static boolean canAdd(List<Stack> list,int maxSlots,String id,int qty){NativeGameData.Item item=NativeGameData.ITEMS.get(id);if(item==null||qty<=0)return false;int left=qty;for(Stack s:list)if(s.itemId.equals(id)){left-=Math.max(0,item.stack-s.qty);if(left<=0)return true;}int slotsNeeded=(left+item.stack-1)/item.stack;return list.size()+slotsNeeded<=maxSlots;}
    private static boolean addStack(List<Stack> list,int maxSlots,String id,int qty){NativeGameData.Item item=NativeGameData.ITEMS.get(id);if(item==null||qty<=0||!canAdd(list,maxSlots,id,qty))return false;int left=qty;for(Stack s:list){if(!s.itemId.equals(id)||s.qty>=item.stack)continue;int add=Math.min(left,item.stack-s.qty);s.qty+=add;left-=add;if(left<=0)return true;}while(left>0){int add=Math.min(left,item.stack);list.add(new Stack(id,add));left-=add;}return true;}
    private static boolean removeStack(List<Stack> list,String id,int qty){if(qty<=0||count(list,id)<qty)return false;int left=qty;for(int i=list.size()-1;i>=0&&left>0;i--){Stack s=list.get(i);if(!s.itemId.equals(id))continue;int take=Math.min(left,s.qty);s.qty-=take;left-=take;if(s.qty<=0)list.remove(i);}return left==0;}
    private static NativeGameData.Settings copySettings(NativeGameData.Settings s){NativeGameData.Settings o=new NativeGameData.Settings();o.cameraMode=s.cameraMode;o.shoulderSide=s.shoulderSide;o.difficulty=s.difficulty;o.enemyRespawnRate=s.enemyRespawnRate;o.quality=s.quality;o.fov=s.fov;o.sensitivity=s.sensitivity;o.renderScale=s.renderScale;o.hudScale=s.hudScale;o.volume=s.volume;o.invertY=s.invertY;o.aimAssist=s.aimAssist;o.autoReload=s.autoReload;o.showHints=s.showHints;o.showHitboxes=s.showHitboxes;o.fogEnabled=s.fogEnabled;o.compatibilityMode=s.compatibilityMode;o.reducedMotion=s.reducedMotion;o.touchAlways=s.touchAlways;return o;}

    public static int levelForXp(int xp){return Math.max(1,(int)Math.floor(Math.sqrt(Math.max(0,xp)/100.0))+1);}
    public static int xpForLevel(int level){int l=Math.max(1,level)-1;return l*l*100;}

    public static final class Stack {
        public String itemId; public int qty;
        public Stack(String itemId,int qty){this.itemId=itemId;this.qty=qty;}
        JSONObject toJson(){JSONObject o=new JSONObject();try{o.put("itemId",itemId);o.put("qty",qty);}catch(Exception ignored){}return o;}
        static Stack fromJson(JSONObject o){return new Stack(o.optString("itemId","scrap"),Math.max(1,o.optInt("qty",1)));}
        @Override public String toString(){NativeGameData.Item i=NativeGameData.ITEMS.get(itemId);return (i==null?itemId:i.name)+" ×"+qty;}
    }
    public static final class Stats { public int extracts,berries,kills,matches; JSONObject toJson(){JSONObject o=new JSONObject();try{o.put("extracts",extracts);o.put("berries",berries);o.put("kills",kills);o.put("matches",matches);}catch(Exception ignored){}return o;} static Stats fromJson(JSONObject o){Stats s=new Stats();if(o!=null){s.extracts=o.optInt("extracts");s.berries=o.optInt("berries");s.kills=o.optInt("kills");s.matches=o.optInt("matches");}return s;} }
    public static final class Account {
        public String id,username,displayName,bio,speciesId,loadoutId,equippedWeaponId,equippedArmorId;public int xp,petals;public Stats stats=new Stats();public NativeGameData.Settings settings=new NativeGameData.Settings();public final ArrayList<Stack> stash=new ArrayList<>(),prepared=new ArrayList<>();public final ArrayList<String> transactions=new ArrayList<>();
        public int level(){return levelForXp(xp);} public NativeGameData.Loadout loadout(){NativeGameData.Loadout l=NativeGameData.LOADOUTS.get(loadoutId);return l==null?NativeGameData.LOADOUTS.get("meadow_scout"):l;}
        JSONObject toJson(){JSONObject o=new JSONObject();try{o.put("id",id);o.put("username",username);o.put("displayName",displayName);o.put("bio",bio);o.put("speciesId",speciesId);o.put("loadoutId",loadoutId);o.put("equippedWeaponId",equippedWeaponId);o.put("equippedArmorId",equippedArmorId);o.put("xp",xp);o.put("petals",NativeGameData.clampPetals(petals));o.put("stats",stats.toJson());o.put("settings",settingsJson(settings));o.put("stash",stacksJson(stash));o.put("prepared",stacksJson(prepared));o.put("economyTransactions",new JSONArray(transactions));}catch(Exception ignored){}return o;}
        static Account fromJson(JSONObject o){Account a=defaultAccount();a.id=o.optString("id",a.id);a.username=cleanHandle(o.optString("username",a.username));a.displayName=cleanName(o.optString("displayName",a.displayName));a.bio=limit(o.optString("bio",a.bio),90);String sp=o.optString("speciesId",a.speciesId);if(NativeGameData.SPECIES.containsKey(sp))a.speciesId=sp;String lo=o.optString("loadoutId",a.loadoutId);if(NativeGameData.LOADOUTS.containsKey(lo))a.loadoutId=lo;a.equippedWeaponId=o.optString("equippedWeaponId",a.equippedWeaponId);a.equippedArmorId=o.optString("equippedArmorId",a.equippedArmorId);a.xp=Math.max(0,o.optInt("xp",0));a.petals=NativeGameData.clampPetals(o.optInt("petals",0));a.stats=Stats.fromJson(o.optJSONObject("stats"));a.settings=settingsFromJson(o.optJSONObject("settings"));readStacks(o.optJSONArray("stash"),a.stash,NativeGameData.STASH_SLOTS);readStacks(o.optJSONArray("prepared"),a.prepared,NativeGameData.BACKPACK_SLOTS);JSONArray tx=o.optJSONArray("economyTransactions");if(tx!=null)for(int i=0;i<tx.length()&&i<30;i++)a.transactions.add(tx.optString(i));return a;}
    }

    private static JSONArray stacksJson(List<Stack> list){JSONArray a=new JSONArray();for(Stack s:list)a.put(s.toJson());return a;}
    private static void readStacks(JSONArray arr,List<Stack> out,int limit){out.clear();if(arr==null)return;for(int i=0;i<arr.length()&&out.size()<limit;i++){JSONObject o=arr.optJSONObject(i);if(o==null)continue;Stack s=Stack.fromJson(o);if(NativeGameData.ITEMS.containsKey(s.itemId))out.add(s);}}
    private static JSONObject settingsJson(NativeGameData.Settings s){JSONObject o=new JSONObject();try{o.put("cameraMode",s.cameraMode);o.put("shoulderSide",s.shoulderSide);o.put("fov",s.fov);o.put("sensitivity",s.sensitivity);o.put("invertY",s.invertY);o.put("difficulty",s.difficulty);o.put("enemyRespawnRate",s.enemyRespawnRate);o.put("aimAssist",s.aimAssist);o.put("autoReload",s.autoReload);o.put("showHints",s.showHints);o.put("showHitboxes",s.showHitboxes);o.put("quality",s.quality);o.put("renderScale",s.renderScale);o.put("fogEnabled",s.fogEnabled);o.put("compatibilityMode",s.compatibilityMode);o.put("reducedMotion",s.reducedMotion);o.put("hudScale",s.hudScale);o.put("volume",s.volume);o.put("touchAlways",s.touchAlways);}catch(Exception ignored){}return o;}
    private static NativeGameData.Settings settingsFromJson(JSONObject o){NativeGameData.Settings s=new NativeGameData.Settings();if(o==null)return s;s.cameraMode=o.optString("cameraMode",s.cameraMode);s.shoulderSide=o.optString("shoulderSide",s.shoulderSide);s.fov=(float)o.optDouble("fov",s.fov);s.sensitivity=(float)o.optDouble("sensitivity",s.sensitivity);s.invertY=o.optBoolean("invertY",s.invertY);s.difficulty=o.optString("difficulty",s.difficulty);s.enemyRespawnRate=o.optString("enemyRespawnRate",s.enemyRespawnRate);s.aimAssist=o.optBoolean("aimAssist",s.aimAssist);s.autoReload=o.optBoolean("autoReload",s.autoReload);s.showHints=o.optBoolean("showHints",s.showHints);s.showHitboxes=o.optBoolean("showHitboxes",s.showHitboxes);s.quality=o.optString("quality",s.quality);s.renderScale=(float)o.optDouble("renderScale",s.renderScale);s.fogEnabled=o.optBoolean("fogEnabled",s.fogEnabled);s.compatibilityMode=o.optBoolean("compatibilityMode",s.compatibilityMode);s.reducedMotion=o.optBoolean("reducedMotion",s.reducedMotion);s.hudScale=o.optInt("hudScale",s.hudScale);s.volume=o.optInt("volume",s.volume);s.touchAlways=o.optBoolean("touchAlways",s.touchAlways);return s;}
}
