package com.harleystudios.critterextraction;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/** Canonical native copy of the gameplay databases in main/live/core/game/game-core.js. */
public final class NativeGameData {
    public static final int SAVE_SCHEMA = 18;
    public static final int PETAL_CAP = 1_000_000;
    public static final int BACKPACK_SLOTS = 20;
    public static final int STASH_SLOTS = 40;
    public static final int MOONBERRIES_TO_EXTRACT = 5;
    public static final float MATCH_SECONDS = 300f;

    public static final Map<String, Item> ITEMS = new LinkedHashMap<>();
    public static final Map<String, Weapon> WEAPONS = new LinkedHashMap<>();
    public static final Map<String, Armor> ARMORS = new LinkedHashMap<>();
    public static final Map<String, Loadout> LOADOUTS = new LinkedHashMap<>();
    public static final Map<String, Species> SPECIES = new LinkedHashMap<>();

    public static final String[] MERCHANT_BUY_IDS = {
            "pea_ammo","acorn_ammo","nectar_cells","carrot_shells","moon_slugs",
            "bandage","medkit","shield_pod","armor_plate"
    };
    public static final String[] SAFE_JUNK_IDS = {"scrap","crystal","seed_cache"};

    static {
        item("pea_ammo","Pea Ammo","items/pea_ammo.svg",.02f,96,1,"common",true,false,false,null,null,"Compressed garden peas used by the Pea Popper.");
        item("acorn_ammo","Acorn Rounds","items/acorn_ammo.svg",.025f,120,2,"common",true,false,false,null,null,"Tiny high-speed acorn rounds for the Acorn Sprayer.");
        item("nectar_cells","Nectar Cells","items/nectar_cells.svg",.035f,96,3,"uncommon",true,false,false,null,null,"Sticky energy cells for the Honeycomb Carbine.");
        item("carrot_shells","Carrot Shells","items/carrot_shells.svg",.07f,48,4,"uncommon",true,false,false,null,null,"Crunchy scatter shells loaded into the Carrot Scatter.");
        item("moon_slugs","Moon Slugs","items/moon_slugs.svg",.09f,30,8,"rare",true,false,false,null,null,"Precision crystal slugs for the Moonbeam Longshot.");
        item("bandage","Berry Patch","items/bandage.svg",.45f,5,35,"common",false,true,false,null,null,"Restores 35 health.");
        item("medkit","Picnic Medkit","items/medkit.svg",1.1f,2,95,"uncommon",false,true,false,null,null,"Restores 75 health.");
        item("shield_pod","Dew Shield Pod","items/shield_pod.svg",.7f,3,60,"uncommon",false,true,false,null,null,"Restores 35 shield points.");
        item("armor_plate","Bark Armor Plate","items/armor_plate.svg",1f,3,85,"uncommon",false,true,false,null,null,"Adds 30 shield up to the armor maximum.");
        item("zoomberry","Zoomberry Fizz","items/zoomberry.svg",.5f,3,75,"rare",false,true,false,null,null,"Boosts movement speed for 12 seconds.");
        item("moonberry","Moonberry","items/moonberry.svg",.18f,20,90,"rare",false,false,true,null,null,"Glowing extraction loot. Carry five to activate the beacon.");
        item("scrap","Toy Scrap","items/scrap.svg",.28f,20,18,"common",false,false,false,null,null,"Useful salvage recovered from meadow pests.");
        item("crystal","Prism Crystal","items/crystal.svg",.55f,10,135,"epic",false,false,false,null,null,"A rare crystal worth a large amount of stash value.");
        item("seed_cache","Ancient Seed Cache","items/seed_cache.svg",1.2f,3,220,"epic",false,false,false,null,null,"A sealed cache from the old Moonmeadow gardeners.");

        weapon("pea_popper","Pea Popper","Balanced semi-auto berry blaster","weapons/pea_popper.svg","pea_ammo",16,25,6.25f,1.35f,.006f,1,60,false,0xffffd36f);
        weapon("acorn_sprayer","Acorn Sprayer","Fast automatic critter SMG","weapons/acorn_sprayer.svg","acorn_ammo",28,12,11f,1.55f,.027f,1,42,true,0xfff0a25e);
        weapon("honey_carbine","Honeycomb Carbine","Accurate automatic nectar rifle","weapons/honey_carbine.svg","nectar_cells",24,20,7.5f,1.45f,.012f,1,58,true,0xffffb74f);
        weapon("carrot_scatter","Carrot Scatter","Close-range crunchy scatter blaster","weapons/carrot_scatter.svg","carrot_shells",6,14,1.45f,1.85f,.105f,6,25,false,0xffff8b52);
        weapon("moonbeam","Moonbeam Longshot","Slow precision crystal rifle","weapons/moonbeam.svg","moon_slugs",5,72,.9f,2.25f,.0025f,1,85,false,0xffa491ff);

        equipmentItem("weapon_pea_popper","Pea Popper","weapons/pea_popper.svg",3.2f,320,"common","weapon","pea_popper");
        equipmentItem("weapon_acorn_sprayer","Acorn Sprayer","weapons/acorn_sprayer.svg",3.8f,520,"uncommon","weapon","acorn_sprayer");
        equipmentItem("weapon_honey_carbine","Honeycomb Carbine","weapons/honey_carbine.svg",4.4f,690,"rare","weapon","honey_carbine");
        equipmentItem("weapon_carrot_scatter","Carrot Scatter","weapons/carrot_scatter.svg",4.8f,620,"uncommon","weapon","carrot_scatter");
        equipmentItem("weapon_moonbeam","Moonbeam Longshot","weapons/moonbeam.svg",5.1f,980,"epic","weapon","moonbeam");

        armor("leaf_vest","Leaf Vest","items/armor_leaf_vest.svg",50,0f);
        armor("feather_vest","Feather Vest","items/armor_feather_vest.svg",40,.22f);
        armor("bark_guard","Bark Guard","items/armor_bark_guard.svg",75,-.12f);
        armor("root_padding","Root Padding","items/armor_root_padding.svg",60,-.04f);
        armor("star_cloak","Star Cloak","items/armor_star_cloak.svg",55,.16f);
        equipmentItem("armor_leaf_vest","Leaf Vest","items/armor_leaf_vest.svg",2.3f,260,"common","armor","leaf_vest");
        equipmentItem("armor_feather_vest","Feather Vest","items/armor_feather_vest.svg",1.8f,380,"uncommon","armor","feather_vest");
        equipmentItem("armor_bark_guard","Bark Guard","items/armor_bark_guard.svg",3.8f,610,"rare","armor","bark_guard");
        equipmentItem("armor_root_padding","Root Padding","items/armor_root_padding.svg",3.1f,500,"uncommon","armor","root_padding");
        equipmentItem("armor_star_cloak","Star Cloak","items/armor_star_cloak.svg",2.1f,820,"epic","armor","star_cloak");

        loadout("meadow_scout","Meadow Scout","BALANCED","pea_popper","leaf_vest","Critter Pack",25,50,5.4f,"A forgiving all-round kit for learning the meadow.",new String[]{"pea_ammo:80","bandage:2"});
        loadout("acorn_rush","Acorn Rush","FAST","acorn_sprayer","feather_vest","Swift Satchel",22,35,6.15f,"High fire rate and movement speed for aggressive looting.",new String[]{"acorn_ammo:112","bandage:1","zoomberry:1"});
        loadout("honey_guard","Honey Guard","CONTROL","honey_carbine","bark_guard","Honey Pack",28,65,5.05f,"Accurate sustained fire with stronger starting armor.",new String[]{"nectar_cells:96","bandage:1","armor_plate:1"});
        loadout("carrot_breacher","Carrot Breacher","CLOSE RANGE","carrot_scatter","root_padding","Burrow Bag",30,55,5.15f,"A hard-hitting scatter blaster and a full picnic medkit.",new String[]{"carrot_shells:36","medkit:1"});
        loadout("moon_ranger","Moon Ranger","PRECISION","moonbeam","star_cloak","Moon Pack",24,45,5.35f,"Long-range crystal shots reward careful aim and timing.",new String[]{"moon_slugs:24","shield_pod:1","bandage:1"});
        LOADOUTS.put("custom", new Loadout("custom","Custom Loadout","YOUR ITEMS",null,null,"Custom Critter Pack",30,0,5.4f,"Pack exactly what you want to risk from Account Stash.",new String[0],true));

        species("puppy","Puppy","Trail Scout","characters/puppy.svg","#d9a06f","#7b4d35","#f3d7bd","#277d78");
        species("bunny","Bunny","Field Medic","characters/bunny.svg","#f0ede8","#d6a6bd","#fff6f3","#a65f82");
        species("kitty","Kitty","Night Ranger","characters/kitty.svg","#9ca7b5","#465266","#e4c9b8","#435f86");
        species("fox","Fox","Pathfinder","characters/fox.svg","#e98b4c","#fff0d9","#fff0d9","#9a573c");
        species("panda","Panda","Shield Guard","characters/panda.svg","#f2f2ee","#292b38","#f2f2ee","#3e6f68");
        species("bear","Bear","Heavy Support","characters/bear.svg","#a36f4c","#6b4432","#e8c7a8","#76563d");
        species("raccoon","Raccoon","Loot Runner","characters/raccoon.svg","#8f98a3","#353846","#c8cbd0","#545778");
        species("redpanda","Red Panda","Moon Tracker","characters/redpanda.svg","#bd5b3e","#f6e0c5","#f6e0c5","#77466b");

        for (Item item : ITEMS.values()) {
            item.sellPrice = item.value;
            item.buyPrice = Math.max(item.sellPrice + 1, (int)Math.ceil(item.sellPrice * (item.equipmentType != null ? 1.55 : 1.8)));
            item.canSell = !item.objective;
        }
    }

    private NativeGameData() {}

    private static void item(String id,String name,String asset,float weight,int stack,int value,String rarity,boolean ammo,boolean consumable,boolean objective,String equipmentType,String equipmentId,String description){
        ITEMS.put(id,new Item(id,name,asset,weight,stack,value,rarity,ammo,consumable,objective,equipmentType,equipmentId,description));
    }
    private static void equipmentItem(String id,String name,String asset,float weight,int value,String rarity,String type,String equipmentId){
        item(id,name,asset,weight,1,value,rarity,false,false,false,type,equipmentId,"Recovered "+name+" equipment.");
    }
    private static void weapon(String id,String name,String subtitle,String asset,String ammo,int mag,int damage,float rate,float reload,float spread,int pellets,float range,boolean auto,int color){
        WEAPONS.put(id,new Weapon(id,name,subtitle,asset,ammo,mag,damage,rate,reload,spread,pellets,range,auto,color));
    }
    private static void armor(String id,String name,String asset,int shield,float speed){ ARMORS.put(id,new Armor(id,name,asset,shield,speed)); }
    private static void loadout(String id,String name,String tag,String weapon,String armor,String pack,float weight,int shield,float speed,String desc,String[] items){ LOADOUTS.put(id,new Loadout(id,name,tag,weapon,armor,pack,weight,shield,speed,desc,items,false)); }
    private static void species(String id,String name,String role,String asset,String body,String accent,String paw,String vest){ SPECIES.put(id,new Species(id,name,role,asset,body,accent,paw,vest)); }

    public static boolean safeJunk(String id){ for(String s:SAFE_JUNK_IDS) if(s.equals(id)) return true; return false; }
    public static int clampPetals(int value){ return Math.max(0,Math.min(PETAL_CAP,value)); }
    public static String formatPetals(int value){ return String.format(Locale.US,"%,d Petal%s",clampPetals(value),clampPetals(value)==1?"":"s"); }
    public static String weaponItemId(String id){ return "weapon_"+id; }
    public static String armorItemId(String id){ return "armor_"+id; }

    public static final class Item {
        public final String id,name,asset,rarity,equipmentType,equipmentId,description;
        public final float weight; public final int stack,value; public final boolean ammo,consumable,objective;
        public int sellPrice,buyPrice; public boolean canSell;
        Item(String id,String name,String asset,float weight,int stack,int value,String rarity,boolean ammo,boolean consumable,boolean objective,String equipmentType,String equipmentId,String description){this.id=id;this.name=name;this.asset=asset;this.weight=weight;this.stack=stack;this.value=value;this.rarity=rarity;this.ammo=ammo;this.consumable=consumable;this.objective=objective;this.equipmentType=equipmentType;this.equipmentId=equipmentId;this.description=description;}
    }
    public static final class Weapon {
        public final String id,name,subtitle,asset,ammoItem; public final int mag,damage,pellets,color; public final float fireRate,reload,spread,range; public final boolean auto;
        Weapon(String id,String name,String subtitle,String asset,String ammo,int mag,int damage,float rate,float reload,float spread,int pellets,float range,boolean auto,int color){this.id=id;this.name=name;this.subtitle=subtitle;this.asset=asset;this.ammoItem=ammo;this.mag=mag;this.damage=damage;this.fireRate=rate;this.reload=reload;this.spread=spread;this.pellets=pellets;this.range=range;this.auto=auto;this.color=color;}
    }
    public static final class Armor { public final String id,name,asset; public final int shield; public final float speedMod; Armor(String id,String name,String asset,int shield,float speedMod){this.id=id;this.name=name;this.asset=asset;this.shield=shield;this.speedMod=speedMod;} }
    public static final class Loadout {
        public final String id,name,tag,weaponId,armorId,backpack,description; public final float maxWeight,speed; public final int shield; public final String[] items; public final boolean custom;
        Loadout(String id,String name,String tag,String weaponId,String armorId,String backpack,float maxWeight,int shield,float speed,String description,String[] items,boolean custom){this.id=id;this.name=name;this.tag=tag;this.weaponId=weaponId;this.armorId=armorId;this.backpack=backpack;this.maxWeight=maxWeight;this.shield=shield;this.speed=speed;this.description=description;this.items=items;this.custom=custom;}
    }
    public static final class Species { public final String id,name,role,asset,body,accent,paw,vest; Species(String id,String name,String role,String asset,String body,String accent,String paw,String vest){this.id=id;this.name=name;this.role=role;this.asset=asset;this.body=body;this.accent=accent;this.paw=paw;this.vest=vest;} }

    public static final class Settings {
        public String cameraMode="third", shoulderSide="right", difficulty="cozy", enemyRespawnRate="normal", quality="medium";
        public float fov=75f,sensitivity=1f,renderScale=1f; public int hudScale=100,volume=70;
        public boolean invertY=false,aimAssist=true,autoReload=true,showHints=true,showHitboxes=false,fogEnabled=true,compatibilityMode=false,reducedMotion=false,touchAlways=false;
    }
}
