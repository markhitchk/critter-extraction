package com.harleystudios.critterextraction;

import android.content.Context;
import android.content.res.AssetManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;

import com.caverock.androidsvg.SVG;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Native Android access to the shared Critter Extraction art library.
 *
 * The files come from live/assets and are bundled into the APK by Gradle. SVG files are
 * parsed locally with AndroidSVG. No WebView, JavaScript engine, CDN, or network access is used.
 */
public final class AssetLibrary {
    public static final String[] CRITTER_NAMES = {
            "Puppy", "Fox", "Arctic Fox", "Axolotl", "Bear", "Bunny", "Capybara",
            "Crow", "Frog", "Kitty", "Otter", "Panda", "Penguin"
    };

    public static final String[] CRITTER_PATHS = {
            "characters/puppy.svg", "characters/fox.svg", "characters/arcticfox.svg",
            "characters/axolotl.svg", "characters/bear.svg", "characters/bunny.svg",
            "characters/capybara.svg", "characters/crow.svg", "characters/frog.svg",
            "characters/kitty.svg", "characters/otter.svg", "characters/panda.svg",
            "characters/penguin.svg"
    };

    public static final String[] WEAPON_NAMES = {
            "Pea Popper", "Acorn Sprayer", "Carrot Scatter", "Honey Carbine", "Moonbeam"
    };

    public static final String[] WEAPON_PATHS = {
            "weapons/pea_popper.svg", "weapons/acorn_sprayer.svg", "weapons/carrot_scatter.svg",
            "weapons/honey_carbine.svg", "weapons/moonbeam.svg"
    };

    public static final String[] ARMOR_NAMES = {
            "Leaf Vest", "Bark Guard", "Feather Vest", "Root Padding", "Star Cloak", "Plate Armor"
    };

    public static final String[] ARMOR_PATHS = {
            "items/armor_leaf_vest.svg", "items/armor_bark_guard.svg", "items/armor_feather_vest.svg",
            "items/armor_root_padding.svg", "items/armor_star_cloak.svg", "items/armor_plate.svg"
    };

    private static final int CACHE_LIMIT = 48;

    private final AssetManager assets;
    private final Map<String, Bitmap> bitmapCache = new LinkedHashMap<String, Bitmap>(CACHE_LIMIT, .75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Bitmap> eldest) {
            return size() > CACHE_LIMIT;
        }
    };

    private final List<String> allCharacters;
    private final List<String> allItems;
    private final List<String> allWeapons;
    private final List<String> allBranding;
    private final List<String> allLoading;

    public AssetLibrary(Context context) {
        assets = context.getAssets();
        allCharacters = listDirectory("characters");
        allItems = listDirectory("items");
        allWeapons = listDirectory("weapons");
        allBranding = listDirectory("branding");
        allLoading = listDirectory("loading");
    }

    public int characterCount() { return allCharacters.size(); }
    public int itemCount() { return allItems.size(); }
    public int weaponCount() { return allWeapons.size(); }
    public int brandingCount() { return allBranding.size(); }
    public int loadingCount() { return allLoading.size(); }
    public int totalCatalogCount() {
        return characterCount() + itemCount() + weaponCount() + brandingCount() + loadingCount();
    }

    public List<String> characters() { return Collections.unmodifiableList(allCharacters); }
    public List<String> items() { return Collections.unmodifiableList(allItems); }
    public List<String> weapons() { return Collections.unmodifiableList(allWeapons); }

    public boolean hasAsset(String path) {
        try (InputStream ignored = assets.open(path)) {
            return true;
        } catch (IOException ignored) {
            return false;
        }
    }

    public Bitmap loadBitmap(String path) {
        String key = "bitmap:" + path;
        Bitmap cached = bitmapCache.get(key);
        if (cached != null && !cached.isRecycled()) return cached;
        try (InputStream in = assets.open(path)) {
            Bitmap bitmap = BitmapFactory.decodeStream(in);
            if (bitmap != null) bitmapCache.put(key, bitmap);
            return bitmap;
        } catch (IOException ignored) {
            return null;
        }
    }

    public Bitmap renderSvg(String path, int requestedSizePx) {
        int size = Math.max(32, Math.min(512, requestedSizePx));
        String key = "svg:" + path + "@" + size;
        Bitmap cached = bitmapCache.get(key);
        if (cached != null && !cached.isRecycled()) return cached;

        try {
            SVG svg = SVG.getFromAsset(assets, path);
            svg.setDocumentWidth(size);
            svg.setDocumentHeight(size);
            Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            svg.renderToCanvas(canvas);
            bitmapCache.put(key, bitmap);
            return bitmap;
        } catch (Throwable ignored) {
            return null;
        }
    }

    public void drawSvgOrFallback(Canvas canvas, String path, RectF destination, int fallbackColor, String fallbackLabel) {
        int size = Math.round(Math.max(destination.width(), destination.height()));
        Bitmap bitmap = renderSvg(path, size);
        if (bitmap != null) {
            canvas.drawBitmap(bitmap, null, destination, null);
            return;
        }

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(fallbackColor);
        canvas.drawRoundRect(destination, Math.min(24f, destination.width() * .18f), Math.min(24f, destination.height() * .18f), paint);
        paint.setColor(Color.WHITE);
        paint.setTextAlign(Paint.Align.CENTER);
        paint.setTextSize(Math.max(12f, destination.width() * .14f));
        paint.setFakeBoldText(true);
        String label = fallbackLabel == null || fallbackLabel.isEmpty() ? "?" : fallbackLabel.substring(0, 1).toUpperCase(Locale.US);
        canvas.drawText(label, destination.centerX(), destination.centerY() + paint.getTextSize() * .35f, paint);
    }

    public String catalogSummary() {
        return characterCount() + " critter art • " + weaponCount() + " weapons • " + itemCount() + " items";
    }

    public static String prettyName(String fileName) {
        if (fileName == null) return "Unknown";
        String name = fileName;
        int slash = name.lastIndexOf('/');
        if (slash >= 0) name = name.substring(slash + 1);
        int dot = name.lastIndexOf('.');
        if (dot > 0) name = name.substring(0, dot);
        name = name.replace('-', ' ').replace('_', ' ');
        String[] words = name.trim().split("\\s+");
        StringBuilder out = new StringBuilder();
        for (String word : words) {
            if (word.isEmpty()) continue;
            if (out.length() > 0) out.append(' ');
            out.append(Character.toUpperCase(word.charAt(0)));
            if (word.length() > 1) out.append(word.substring(1));
        }
        return out.toString();
    }

    private List<String> listDirectory(String directory) {
        try {
            String[] names = assets.list(directory);
            if (names == null) return new ArrayList<>();
            Arrays.sort(names, String.CASE_INSENSITIVE_ORDER);
            List<String> result = new ArrayList<>(names.length);
            for (String name : names) {
                if (name == null || name.startsWith(".")) continue;
                result.add(directory + "/" + name);
            }
            return result;
        } catch (IOException ignored) {
            return new ArrayList<>();
        }
    }
}
