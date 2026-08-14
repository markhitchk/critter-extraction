package com.harleystudios.critterextraction;

import android.graphics.Color;

/**
 * Native port of the canonical Critter Extraction species catalog in
 * live/core/rendering/model-library.js. The Android renderer consumes the same 39
 * species identities, roles, colors, ear/tail recipes and gameplay ordering.
 */
public final class SpeciesCatalog3D {
    public static final class Species {
        public final String id, name, role, body, accent, paw, vest, head, ears, tail, limb;
        Species(String id, String name, String role, String body, String accent, String paw,
                String vest, String head, String ears, String tail, String limb) {
            this.id=id; this.name=name; this.role=role; this.body=body; this.accent=accent;
            this.paw=paw; this.vest=vest; this.head=head; this.ears=ears; this.tail=tail; this.limb=limb;
        }
        public int bodyColor(){ return parse(body); }
        public int accentColor(){ return parse(accent); }
        public int pawColor(){ return parse(paw); }
        public int vestColor(){ return parse(vest); }
    }

    private static Species s(String id,String name,String role,String body,String accent,String paw,
                             String vest,String head,String ears,String tail,String limb){
        return new Species(id,name,role,body,accent,paw,vest,head,ears,tail,limb);
    }

    public static final Species[] ALL = {
        s("puppy","Puppy","Trail Scout","#d9a06f","#7b4d35","#f3d7bd","#277d78","canine","floppy","canine","paw"),
        s("bunny","Bunny","Field Medic","#f0ede8","#d6a6bd","#fff6f3","#a65f82","rabbit","upright","puff","paw"),
        s("kitty","Kitty","Night Ranger","#9ca7b5","#465266","#e4c9b8","#435f86","feline","triangle","feline","paw"),
        s("fox","Fox","Pathfinder","#e98b4c","#fff0d9","#fff0d9","#9a573c","fox","triangle","brush","paw"),
        s("panda","Panda","Shield Guard","#f2f2ee","#292b38","#f2f2ee","#3e6f68","bear","round","bear","paw"),
        s("bear","Bear","Heavy Support","#a36f4c","#6b4432","#e8c7a8","#76563d","bear","round","bear","paw"),
        s("raccoon","Raccoon","Loot Runner","#8f98a3","#353846","#c8cbd0","#545778","raccoon","round","ringed","paw"),
        s("redpanda","Red Panda","Moon Tracker","#bd5b3e","#f6e0c5","#f6e0c5","#77466b","redpanda","round","ringed","paw"),
        s("penguin","Penguin","Frozen Explorer","#26364b","#f4f7fb","#f4f7fb","#466b88","bird","penguin","feather","flipper"),
        s("crow","Crow","Shiny Collector","#202430","#515a70","#303746","#4e5573","bird","crow","feather","wing"),
        s("frog","Frog","Marsh Jumper","#71b85a","#d6ee8e","#c7e991","#4f7961","frog","none","none","webbed-paw"),
        s("arcticfox","Arctic Fox","Winter Pathfinder","#eef5fb","#b9d4e8","#f9fcff","#67859a","fox","triangle","brush","paw"),
        s("capybara","Capybara","Relaxed Support","#ad7651","#6d4734","#d7ab84","#6a6353","rodent","round","stub","paw"),
        s("axolotl","Axolotl","Aquatic Scout","#f1a9bd","#cf638f","#f5c7d4","#667ea4","axolotl","gills","fin","webbed-paw"),
        s("otter","Otter","Cuddle Diver","#765039","#d7aa7c","#d7aa7c","#386c78","mustelid","round","otter","webbed-paw"),
        s("wolf","Wolf","Pack Leader","#7d8794","#d8dde4","#c6ccd3","#465870","canine","upright","wolf","paw"),
        s("deer","Deer","Forest Runner","#bd875d","#f4dfc5","#e8c19a","#5d7a58","deer","antler","deer","hoof"),
        s("koala","Koala","Eucalyptus Medic","#9ca3aa","#d6d9dc","#c3c8cd","#5d7c73","koala","round","stub","paw"),
        s("hedgehog","Hedgehog","Spiked Defender","#9b7657","#4c3b33","#d5b89c","#6d5d49","hedgehog","small","stub","paw"),
        s("squirrel","Squirrel","Supply Hoarder","#b87946","#f1c79f","#e7b889","#6e5b3f","rodent","round","curl","paw"),
        s("bat","Bat","Cave Scout","#403f58","#a69ac8","#7b739b","#31334f","bat","bat","none","wing"),
        s("owl","Owl","Night Watcher","#8b7359","#e7d4ab","#c6b38e","#4f5871","bird","owl","feather","wing"),
        s("mouse","Mouse","Tiny Infiltrator","#b8a9a5","#e9c4c8","#e5d5d2","#596678","rodent","round","thin","paw"),
        s("hamster","Hamster","Gear Carrier","#d7a86f","#fff0d4","#f0c894","#7a644d","rodent","round","stub","paw"),
        s("ferret","Ferret","Tunnel Sneak","#b99b7f","#4d4038","#decab7","#4d5965","mustelid","round","ferret","paw"),
        s("duck","Duck","Pond Patrol","#f1d45c","#e88942","#f7df76","#4c7a86","bird","duck","feather","wing"),
        s("seal","Seal","Ice Swimmer","#aebbc7","#e8eef2","#dbe4ea","#526d82","seal","none","none","flipper"),
        s("polarbear","Polar Bear","Frozen Tank","#f2f4f3","#b9cad5","#ffffff","#55758a","bear","round","bear","paw"),
        s("sloth","Sloth","Patient Sniper","#97856f","#594f48","#c4ae91","#566169","sloth","round","stub","paw"),
        s("chameleon","Chameleon","Hidden Tracker","#73ad69","#d4c34e","#9fc98c","#4f6c55","reptile","crest","curl","claw"),
        s("beaver","Beaver","Fort Builder","#8f6548","#d9ad7f","#bd8e65","#6b5b45","rodent","round","beaver","paw"),
        s("goat","Goat","Mountain Climber","#d8d0c2","#8d7d6f","#efe8dc","#63706b","goat","horn","goat","hoof"),
        s("possum","Possum","Survival Expert","#a8a3a6","#ece4df","#d7c9c8","#5f5960","possum","round","thin","paw"),
        s("lemur","Lemur","Tree Jumper","#9c9ba0","#393b45","#d8d5d0","#55516c","primate","round","ringed","paw"),
        s("alpaca","Alpaca","Soft Support","#e8d9c2","#a9856b","#f5ead9","#766758","alpaca","upright","alpaca","hoof"),
        s("meerkat","Meerkat","Lookout Scout","#c79b6f","#514239","#e2bd94","#5f6754","meerkat","round","thin","paw"),
        s("platypus","Platypus","Swamp Specialist","#8b6a54","#d28b57","#b79070","#4e706c","platypus","none","beaver","webbed-paw"),
        s("tiger","Tiger","Strike Hunter","#e58a3e","#342b2c","#f4c28f","#74483d","feline","round","feline","paw"),
        s("snowleopard","Snow Leopard","Silent Stalker","#d9dde0","#777d86","#f2f4f5","#596678","feline","round","snowleopard","paw")
    };

    public static int indexOf(String id) {
        if (id == null) return 0;
        for (int i=0;i<ALL.length;i++) if (ALL[i].id.equalsIgnoreCase(id)) return i;
        return 0;
    }

    private static int parse(String value) {
        try { return Color.parseColor(value); } catch (Throwable ignored) { return Color.GRAY; }
    }

    private SpeciesCatalog3D() {}
}
