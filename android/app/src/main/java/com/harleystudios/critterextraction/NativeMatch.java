package com.harleystudios.critterextraction;

import android.content.Context;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/** Native match simulation that follows the current /live extraction rules. */
public final class NativeMatch {
    public static final float WORLD=42f;
    private static final float GRAVITY=17.5f;
    public final NativeProfileStore store;
    public final Random random;
    public final long seed;
    public final ArrayList<Enemy> enemies=new ArrayList<>();
    public final ArrayList<Bullet> bullets=new ArrayList<>();
    public final ArrayList<Pickup> pickups=new ArrayList<>();
    public final ArrayList<Chest> chests=new ArrayList<>();
    public final ArrayList<NativeProfileStore.Stack> backpack=new ArrayList<>();
    public final ArrayList<NativeProfileStore.Stack> extractedLoot=new ArrayList<>();
    public final ConcurrentHashMap<String,RemotePlayer> remotePlayers=new ConcurrentHashMap<>();

    public volatile float playerX=0f,playerY=0f,playerZ=8f,hp=100f,shield=0f,maxShield=50f;
    public volatile float aimX=0f,aimZ=-1f,moveX,moveZ,matchTime=NativeGameData.MATCH_SECONDS,extractProgress;
    public volatile boolean aiming,crouched,interacting,firstPerson,shoulderRight=true,ended,extracted;
    public volatile int kills,chestsOpened,moonberries,mag,reserve;
    public volatile String banner="DROP IN • COMPLETE THE CONTRACT • EXTRACT";
    public volatile float bannerTime;
    public volatile String mapName,networkMode="SOLO",localNetworkId="";
    public volatile int groundColor,treeColor,rockColor,skyColor,fogColor;
    public volatile Contract primary,bonus;
    public volatile float extractX,extractZ;

    private final NativeProfileStore.Account account;
    private NativeGameData.Loadout loadout;
    private NativeGameData.Weapon weapon;
    private NativeGameData.Armor armor;
    private float fireCooldown,reloadRemaining,verticalVelocity,spawnTimer=8f,interactGate;
    private int pendingShots;

    public NativeMatch(Context context,NativeProfileStore store){this(context,store,System.nanoTime()^(long)store.active().id.hashCode());}
    public NativeMatch(Context context,NativeProfileStore store,long seed){this.store=store;this.account=store.active();this.seed=seed;this.random=new Random(seed);configureLoadout();generateWorld();}

    private void configureLoadout(){
        loadout=account.loadout();if(loadout==null)loadout=NativeGameData.LOADOUTS.get("meadow_scout");String wid=loadout.custom?account.equippedWeaponId:loadout.weaponId;String aid=loadout.custom?account.equippedArmorId:loadout.armorId;weapon=NativeGameData.WEAPONS.get(wid);if(weapon==null)weapon=NativeGameData.WEAPONS.get("pea_popper");armor=NativeGameData.ARMORS.get(aid);if(armor==null)armor=NativeGameData.ARMORS.get("leaf_vest");maxShield=armor.shield;shield=maxShield;mag=weapon.mag;
        if(loadout.custom){for(NativeProfileStore.Stack s:account.prepared)add(backpack,s.itemId,s.qty);}else for(String spec:loadout.items){String[] p=spec.split(":");if(p.length==2)add(backpack,p[0],Integer.parseInt(p[1]));}reserve=count(backpack,weapon.ammoItem);
    }

    private void generateWorld(){
        Region[] regions=Region.values();Region region=regions[random.nextInt(regions.length)];mapName=region.title;groundColor=region.ground;treeColor=region.trees;rockColor=region.rocks;skyColor=region.sky;fogColor=region.fog;
        double angle=random.nextDouble()*Math.PI*2;extractX=(float)Math.cos(angle)*31f;extractZ=(float)Math.sin(angle)*31f;
        primary=random.nextBoolean()?new Contract("RAIDER HUNT","Defeat meadow raiders",Contract.KILL,6):new Contract("SUPPLY SCOUT","Open supply chests",Contract.CHESTS,3);
        bonus=primary.kind==Contract.KILL?new Contract("DEEP SEARCH","Open bonus supply chests",Contract.CHESTS,2):new Contract("CLEAN SWEEP","Defeat bonus raiders",Contract.KILL,4);
        for(int i=0;i<12;i++)spawnEnemy();for(int i=0;i<12;i++)spawnChest(i);for(int i=0;i<10;i++)spawnLoosePickup(i);
    }

    public void update(float dt){if(ended)return;matchTime=Math.max(0f,matchTime-dt);if(matchTime<=0f){finish(false,"DROP CLOSED");return;}if(bannerTime>0){bannerTime-=dt;if(bannerTime<=0)banner="";}fireCooldown=Math.max(0,fireCooldown-dt);interactGate=Math.max(0,interactGate-dt);if(reloadRemaining>0){reloadRemaining-=dt;if(reloadRemaining<=0)finishReload();}
        float len=(float)Math.hypot(moveX,moveZ);if(len>.05f){float speed=loadout.speed+armor.speedMod;if(crouched)speed*=.58f;if(aiming)speed*=.78f;playerX=clamp(playerX+(moveX/len)*speed*dt,-WORLD,WORLD);playerZ=clamp(playerZ+(moveZ/len)*speed*dt,-WORLD,WORLD);}
        if(playerY>0||verticalVelocity>0){verticalVelocity-=GRAVITY*dt;playerY+=verticalVelocity*dt;if(playerY<=0){playerY=0;verticalVelocity=0;}}
        if((pendingShots>0||fireHeld())&&fireCooldown<=0&&reloadRemaining<=0){shoot();if(pendingShots>0)pendingShots--;}
        if(weapon!=null&&mag<=0&&account.settings.autoReload&&reserve>0&&reloadRemaining<=0)reload();
        updateBullets(dt);updateEnemies(dt);if(interacting)interactUpdate(dt);else extractProgress=Math.max(0,extractProgress-dt*2f);
        spawnTimer-=dt;if(spawnTimer<=0&&respawnEnabled()&&enemies.size()<14){spawnEnemy();spawnTimer=respawnDelay();}
    }

    private boolean fireHeldFlag;public void setFireHeld(boolean v){fireHeldFlag=v;}private boolean fireHeld(){return fireHeldFlag;}
    public void fireOnce(){pendingShots++;}
    public void setMove(float x,float z){moveX=x;moveZ=z;}
    public void setLook(float x,float z){float l=(float)Math.hypot(x,z);if(l>.08f){aimX=x/l;aimZ=z/l;}}
    public void setAiming(boolean v){aiming=v;}
    public void setInteracting(boolean v){interacting=v;if(!v)interactGate=0;}
    public void toggleCrouch(){crouched=!crouched;if(crouched&&playerY>0)crouched=false;message(crouched?"CROUCHED":"STANDING",.65f);}
    public void jump(){if(playerY<=.001f&&!crouched){verticalVelocity=6.4f;playerY=.01f;}}
    public void toggleCamera(){firstPerson=!firstPerson;message(firstPerson?"FIRST PERSON":"THIRD PERSON",.7f);}
    public void toggleShoulder(){shoulderRight=!shoulderRight;message(shoulderRight?"RIGHT SHOULDER":"LEFT SHOULDER",.6f);}

    public void reload(){if(weapon==null||reloadRemaining>0||mag>=weapon.mag)return;reserve=count(backpack,weapon.ammoItem);if(reserve<=0){message("NO "+weapon.name.toUpperCase(Locale.US)+" AMMO",.8f);return;}reloadRemaining=weapon.reload;message("RELOADING",weapon.reload);}
    private void finishReload(){int need=weapon.mag-mag;int have=count(backpack,weapon.ammoItem);int take=Math.min(need,have);remove(backpack,weapon.ammoItem,take);mag+=take;reserve=count(backpack,weapon.ammoItem);}
    public void heal(){if(hp>=100){message("HEALTH FULL",.6f);return;}if(count(backpack,"medkit")>0){remove(backpack,"medkit",1);hp=Math.min(100,hp+75);message("PICNIC MEDKIT +75",.8f);}else if(count(backpack,"bandage")>0){remove(backpack,"bandage",1);hp=Math.min(100,hp+35);message("BERRY PATCH +35",.8f);}else message("NO HEALING ITEMS",.7f);}
    public void useQuickItem(String id){if("shield_pod".equals(id)&&count(backpack,id)>0&&shield<maxShield){remove(backpack,id,1);shield=Math.min(maxShield,shield+35);message("SHIELD +35",.7f);}else if("armor_plate".equals(id)&&count(backpack,id)>0&&shield<maxShield){remove(backpack,id,1);shield=Math.min(maxShield,shield+30);message("ARMOR +30",.7f);}}

    private void shoot(){if(mag<=0){reload();return;}mag--;reserve=count(backpack,weapon.ammoItem);fireCooldown=1f/weapon.fireRate;float base=(float)Math.atan2(aimX,-aimZ);float spread=weapon.spread*(aiming?.42f:1f);for(int i=0;i<weapon.pellets;i++){float a=base+(random.nextFloat()-.5f)*spread*2f;float dx=(float)Math.sin(a),dz=-(float)Math.cos(a);bullets.add(new Bullet(playerX+dx*.8f,1.35f+playerY,playerZ+dz*.8f,dx*32f,dz*32f,weapon.damage,weapon.range/32f));}}
    private void updateBullets(float dt){Iterator<Bullet> it=bullets.iterator();while(it.hasNext()){Bullet b=it.next();b.x+=b.vx*dt;b.z+=b.vz*dt;b.life-=dt;boolean remove=b.life<=0;for(Enemy e:enemies){if(remove||e.hp<=0)continue;float dx=b.x-e.x,dz=b.z-e.z;if(dx*dx+dz*dz<.70f){e.hp-=b.damage;remove=true;if(e.hp<=0)kill(e);}}if(remove)it.remove();}enemies.removeIf(e->e.hp<=0);}
    private void kill(Enemy e){e.hp=0;kills++;primary.update(this);bonus.update(this);if(random.nextFloat()<.72f)pickups.add(new Pickup(e.x,e.z,randomLoot(),1));if(random.nextFloat()<.26f)pickups.add(new Pickup(e.x+.45f,e.z-.35f,"moonberry",1));}
    private void updateEnemies(float dt){for(Enemy e:enemies){float dx=playerX-e.x,dz=playerZ-e.z,d=Math.max(.01f,(float)Math.hypot(dx,dz));e.attack-=dt;if(d<18f){e.x+=dx/d*e.speed*dt;e.z+=dz/d*e.speed*dt;}if(d<1.15f&&e.attack<=0){float damage=8+random.nextInt(5);if(shield>0){float absorb=Math.min(shield,damage);shield-=absorb;damage-=absorb;}hp-=damage;e.attack=.8f;if(hp<=0){hp=0;finish(false,"CRITTER DOWN");return;}}}}

    private void interactUpdate(float dt){Pickup nearPickup=nearestPickup(1.55f);if(nearPickup!=null&&interactGate<=0){if(add(backpack,nearPickup.itemId,nearPickup.qty)){if("moonberry".equals(nearPickup.itemId))moonberries=count(backpack,"moonberry");extractedLoot.add(new NativeProfileStore.Stack(nearPickup.itemId,nearPickup.qty));pickups.remove(nearPickup);primary.update(this);bonus.update(this);message("PICKED UP "+itemName(nearPickup.itemId),.65f);}else message("BACKPACK FULL",.65f);interactGate=.28f;return;}Chest chest=nearestChest(1.9f);if(chest!=null&&!chest.opened&&interactGate<=0){chest.opened=true;chestsOpened++;for(NativeProfileStore.Stack s:chest.contents){if(add(backpack,s.itemId,s.qty))extractedLoot.add(new NativeProfileStore.Stack(s.itemId,s.qty));}moonberries=count(backpack,"moonberry");primary.update(this);bonus.update(this);message("SUPPLY CHEST OPENED",.7f);interactGate=.5f;return;}float dx=playerX-extractX,dz=playerZ-extractZ;if(dx*dx+dz*dz<3.1f){if(!primary.complete){extractProgress=0;message("COMPLETE PRIMARY CONTRACT",.45f);return;}moonberries=count(backpack,"moonberry");if(moonberries<NativeGameData.MOONBERRIES_TO_EXTRACT){extractProgress=0;message("NEED "+NativeGameData.MOONBERRIES_TO_EXTRACT+" MOONBERRIES",.45f);return;}extractProgress+=dt;if(extractProgress>=2f)finish(true,"EXTRACTED");}}

    private void finish(boolean success,String reason){if(ended)return;ended=true;extracted=success;banner=reason;bannerTime=999;int berries=count(backpack,"moonberry");int xp=success?60+berries*18+kills*12+inventoryValue()/50:0;int petals=success?15+(bonus.complete?10:0):0;store.recordMatch(success,berries,kills,xp,petals,success?new ArrayList<>(extractedLoot):null);}
    private int inventoryValue(){int v=0;for(NativeProfileStore.Stack s:backpack){NativeGameData.Item i=NativeGameData.ITEMS.get(s.itemId);if(i!=null)v+=i.value*s.qty;}return v;}

    private void spawnEnemy(){double a=random.nextDouble()*Math.PI*2;float d=12+random.nextFloat()*23,x=clamp(playerX+(float)Math.cos(a)*d,-WORLD+2,WORLD-2),z=clamp(playerZ+(float)Math.sin(a)*d,-WORLD+2,WORLD-2);enemies.add(new Enemy(x,z,62+random.nextInt(38),2.05f+random.nextFloat()*.85f,random.nextInt(8)));}
    private void spawnChest(int i){float x=-34+(i*17%68),z=-32+(i*23%64);Chest c=new Chest(x,z);c.contents.add(new NativeProfileStore.Stack(randomLoot(),1+random.nextInt(2)));if(i%3==0)c.contents.add(new NativeProfileStore.Stack("moonberry",1));if(i%4==0)c.contents.add(new NativeProfileStore.Stack("bandage",1));chests.add(c);}
    private void spawnLoosePickup(int i){float x=-30+(i*29%61),z=-29+(i*31%59);String id=i<5?"moonberry":randomLoot();pickups.add(new Pickup(x,z,id,1));}
    private String randomLoot(){String[] ids={"scrap","scrap","crystal","seed_cache","bandage","shield_pod","armor_plate","zoomberry"};return ids[random.nextInt(ids.length)];}
    private Pickup nearestPickup(float radius){Pickup best=null;float bd=radius*radius;for(Pickup p:pickups){float dx=playerX-p.x,dz=playerZ-p.z,d=dx*dx+dz*dz;if(d<bd){bd=d;best=p;}}return best;}
    private Chest nearestChest(float radius){Chest best=null;float bd=radius*radius;for(Chest p:chests){float dx=playerX-p.x,dz=playerZ-p.z,d=dx*dx+dz*dz;if(d<bd){bd=d;best=p;}}return best;}
    private boolean respawnEnabled(){return !"off".equals(account.settings.enemyRespawnRate);}private float respawnDelay(){switch(account.settings.enemyRespawnRate){case"slow":return 16f;case"fast":return 5f;default:return 9f;}}
    public String interactionHint(){if(nearestPickup(1.7f)!=null)return "USE • PICK UP";Chest c=nearestChest(2f);if(c!=null&&!c.opened)return "USE • OPEN SUPPLY";float dx=playerX-extractX,dz=playerZ-extractZ;if(dx*dx+dz*dz<10f)return primary.complete&&moonberries>=5?"HOLD USE • EXTRACT":"EXTRACTION LOCKED";return "";}
    public String objectiveTitle(){if(!primary.complete)return primary.title;if(moonberries<5)return "COLLECT MOONBERRIES";return "REACH EXTRACTION BEACON";}
    public String objectiveDetail(){if(!primary.complete)return primary.progress(this);if(moonberries<5)return moonberries+" / 5 collected";return "Hold USE at the gold beacon for 2 seconds";}
    public NativeGameData.Weapon weapon(){return weapon;}public NativeGameData.Loadout loadout(){return loadout;}public NativeGameData.Armor armor(){return armor;}public NativeProfileStore.Account account(){return account;}
    public int reserveAmmo(){return count(backpack,weapon.ammoItem);}public int medkits(){return count(backpack,"medkit");}public int bandages(){return count(backpack,"bandage");}
    public boolean contractComplete(){return primary.complete;}public boolean bonusComplete(){return bonus.complete;}

    public void upsertRemote(String id,String name,String species,float x,float z,float hp,float shield){if(id==null||id.isEmpty()||id.equals(localNetworkId))return;RemotePlayer r=remotePlayers.computeIfAbsent(id,k->new RemotePlayer());r.id=id;r.name=name;r.species=species;r.x=x;r.z=z;r.hp=hp;r.shield=shield;r.lastSeen=System.nanoTime();}
    public void removeRemote(String id){if(id!=null)remotePlayers.remove(id);}public int networkPlayerCount(){return 1+remotePlayers.size();}

    private void message(String text,float seconds){banner=text;bannerTime=seconds;}
    private static String itemName(String id){NativeGameData.Item i=NativeGameData.ITEMS.get(id);return i==null?id:i.name.toUpperCase(Locale.US);}
    private static float clamp(float v,float lo,float hi){return Math.max(lo,Math.min(hi,v));}
    private static int count(List<NativeProfileStore.Stack> list,String id){int n=0;for(NativeProfileStore.Stack s:list)if(s.itemId.equals(id))n+=s.qty;return n;}
    private static boolean add(List<NativeProfileStore.Stack> list,String id,int qty){NativeGameData.Item item=NativeGameData.ITEMS.get(id);if(item==null||qty<=0)return false;int left=qty;for(NativeProfileStore.Stack s:list)if(s.itemId.equals(id)&&s.qty<item.stack){int n=Math.min(left,item.stack-s.qty);s.qty+=n;left-=n;if(left<=0)return true;}while(left>0){if(list.size()>=NativeGameData.BACKPACK_SLOTS)return false;int n=Math.min(left,item.stack);list.add(new NativeProfileStore.Stack(id,n));left-=n;}return true;}
    private static boolean remove(List<NativeProfileStore.Stack> list,String id,int qty){int left=qty;for(int i=list.size()-1;i>=0&&left>0;i--){NativeProfileStore.Stack s=list.get(i);if(!s.itemId.equals(id))continue;int n=Math.min(left,s.qty);s.qty-=n;left-=n;if(s.qty<=0)list.remove(i);}return left==0;}

    public static final class Contract {public static final int KILL=1,CHESTS=2;public final String title,description;public final int kind,target;public boolean complete;Contract(String t,String d,int k,int target){title=t;description=d;kind=k;this.target=target;}void update(NativeMatch m){complete=(kind==KILL?m.kills:m.chestsOpened)>=target;}String progress(NativeMatch m){int n=kind==KILL?m.kills:m.chestsOpened;return description+" • "+Math.min(n,target)+" / "+target;}}
    public static final class Enemy {public float x,z,hp,speed,attack;public int species;Enemy(float x,float z,float hp,float speed,int species){this.x=x;this.z=z;this.hp=hp;this.speed=speed;this.species=species;}}
    public static final class Bullet {public float x,y,z,vx,vz,damage,life;Bullet(float x,float y,float z,float vx,float vz,float damage,float life){this.x=x;this.y=y;this.z=z;this.vx=vx;this.vz=vz;this.damage=damage;this.life=life;}}
    public static final class Pickup {public float x,z;public String itemId;public int qty;Pickup(float x,float z,String itemId,int qty){this.x=x;this.z=z;this.itemId=itemId;this.qty=qty;}}
    public static final class Chest {public float x,z;public boolean opened;public final ArrayList<NativeProfileStore.Stack> contents=new ArrayList<>();Chest(float x,float z){this.x=x;this.z=z;}}
    public static final class RemotePlayer {public String id="",name="Critter",species="puppy";public float x,z,hp=100,shield;public long lastSeen;}
    private enum Region {
        PINE("PINE VALLEY",0xff31583f,0xff1f5f47,0xff71807b,0xff74b8d4,0xff6b9eaa),AMBER("AMBER JUNCTION",0xff695437,0xff52643b,0xff8a765d,0xffe5a95f,0xffb78358),MARSH("MOONBERRY MARSH",0xff294f50,0xff275b52,0xff536c70,0xff668da0,0xff4a737c),CLOVER("CLOVER HIGHLANDS",0xff42704a,0xff2f6841,0xff70816c,0xff7dc2d8,0xff6fa6a2),FROST("FROSTFLOWER RIDGE",0xff788a86,0xff496d64,0xff9aa8aa,0xff9cc9da,0xff90b5bd),REDWOOD("REDWOOD RUN",0xff574b37,0xff33543d,0xff756451,0xffd28a66,0xffa46d5f);
        final String title;final int ground,trees,rocks,sky,fog;Region(String t,int g,int tr,int r,int s,int f){title=t;ground=g;trees=tr;rocks=r;sky=s;fog=f;}}
}
