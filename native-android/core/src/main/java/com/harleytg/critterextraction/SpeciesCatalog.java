package com.harleytg.critterextraction;

import com.badlogic.gdx.graphics.Color;
import java.util.LinkedHashMap;
import java.util.Map;

public final class SpeciesCatalog {
    public record Species(String id, String name, String role, Color body, Color accent, Color paw, Color vest, String icon) {}

    private static Color c(String hex) { return Color.valueOf(hex.replace("#", "")); }

    public static final Map<String, Species> ALL = new LinkedHashMap<>();
    static {
        add("puppy", "Puppy", "Trail Scout", "d9a06f", "7b4d35", "f3d7bd", "277d78");
        add("bunny", "Bunny", "Field Medic", "f0ede8", "d6a6bd", "fff6f3", "a65f82");
        add("kitty", "Kitty", "Night Ranger", "9ca7b5", "465266", "e4c9b8", "435f86");
        add("fox", "Fox", "Pathfinder", "e98b4c", "fff0d9", "fff0d9", "9a573c");
        add("panda", "Panda", "Shield Guard", "f2f2ee", "292b38", "f2f2ee", "3e6f68");
        add("bear", "Bear", "Heavy Support", "a36f4c", "6b4432", "e8c7a8", "76563d");
        add("raccoon", "Raccoon", "Loot Runner", "8f98a3", "353846", "c8cbd0", "545778");
        add("redpanda", "Red Panda", "Moon Tracker", "bd5b3e", "f6e0c5", "f6e0c5", "77466b");
        add("penguin", "Penguin", "Frozen Explorer", "26364b", "f4f7fb", "f4f7fb", "466b88");
        add("crow", "Crow", "Shiny Collector", "202430", "515a70", "303746", "4e5573");
        add("frog", "Frog", "Marsh Jumper", "71b85a", "d6ee8e", "c7e991", "4f7961");
        add("arcticfox", "Arctic Fox", "Winter Pathfinder", "eef5fb", "b9d4e8", "f9fcff", "67859a");
        add("capybara", "Capybara", "Relaxed Support", "ad7651", "6d4734", "d7ab84", "6a6353");
        add("axolotl", "Axolotl", "Aquatic Scout", "f1a9bd", "cf638f", "f5c7d4", "667ea4");
        add("otter", "Otter", "Cuddle Diver", "765039", "d7aa7c", "d7aa7c", "386c78");
    }

    private static void add(String id, String name, String role, String body, String accent, String paw, String vest) {
        ALL.put(id, new Species(id, name, role, c(body), c(accent), c(paw), c(vest), "characters/" + id + ".png"));
    }

    public static Species get(String id) { return ALL.getOrDefault(id, ALL.get("puppy")); }
    private SpeciesCatalog() {}
}
