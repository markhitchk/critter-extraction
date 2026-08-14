package com.harleystudios.critterextraction;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Handler;
import android.os.Looper;
import android.view.MotionEvent;
import android.view.View;

/**
 * Native reproduction of main/live/index.html + base.css menu/boot presentation.
 *
 * IMPORTANT: the menu is authored in a 1536x720 reference coordinate space and
 * scaled exactly once to the physical viewport. Do not convert menu coordinates
 * through Android dp density. The previous dp conversion made a 720px-tall
 * landscape viewport behave like a ~1700px design and caused the hero, buttons,
 * and dashboard cards to overlap on high-density phones.
 */
public final class LiveMenuView extends View {
    public interface Listener { void onPlaySolo(); void onNextCritter(); void onNextWeapon(); }

    private static final float DESIGN_W = 1536f;
    private static final float DESIGN_H = 720f;

    private static final int BG = 0xff111225;
    private static final int PANEL = 0xff26284c;
    private static final int TEXT = 0xfff7f7ff;
    private static final int MUTED = 0xffaeb2d1;
    private static final int MINT = 0xff7ef7d4;
    private static final int CYAN = 0xff63dff5;
    private static final int PURPLE = 0xff8e82ff;

    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final AssetLibrary assets;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final RectF playRect = new RectF();
    private final RectF critterRect = new RectF();
    private final RectF weaponRect = new RectF();

    private Bitmap logo;
    private Bitmap hero;
    private Bitmap critter;
    private Bitmap weapon;
    private Listener listener;
    private boolean boot = true;
    private float bootProgress;
    private final long bootStart = System.currentTimeMillis();

    // Transform used to map touch coordinates back into the 1536x720 design.
    private float menuScale = 1f;
    private float menuOffsetX;
    private float menuOffsetY;

    public LiveMenuView(Context context) {
        super(context);
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        assets = new AssetLibrary(context);
        logo = assets.loadBitmap("branding/HTG.png");
        hero = assets.loadBitmap("loading/cinematic-gameplay-fullhd.webp");
        critter = assets.renderSvg("characters/puppy.svg", 420);
        weapon = assets.renderSvg("weapons/pea_popper.svg", 240);
        p.setTypeface(android.graphics.Typeface.create("sans", android.graphics.Typeface.NORMAL));
        stroke.setStyle(Paint.Style.STROKE);
        handler.post(frame);
    }

    public void setListener(Listener value) { listener = value; }

    private final Runnable frame = new Runnable() {
        @Override public void run() {
            if (!boot) return;
            long elapsed = System.currentTimeMillis() - bootStart;
            bootProgress = Math.min(1f, elapsed / 1250f);
            if (bootProgress >= 1f) boot = false;
            invalidate();
            if (boot) handler.postDelayed(this, 16);
        }
    };

    @Override protected void onDetachedFromWindow() {
        handler.removeCallbacks(frame);
        super.onDetachedFromWindow();
    }

    @Override protected void onDraw(Canvas c) {
        super.onDraw(c);
        if (boot) drawBoot(c); else drawMenu(c);
    }

    private void drawBoot(Canvas c) {
        int w = getWidth(), h = getHeight();
        p.setShader(new LinearGradient(0, 0, w, h, 0xff15162b, 0xff090b15, Shader.TileMode.CLAMP));
        c.drawRect(0, 0, w, h, p);
        p.setShader(null);

        float scale = Math.min(w / DESIGN_W, h / DESIGN_H);
        float ox = (w - DESIGN_W * scale) * .5f;
        float oy = (h - DESIGN_H * scale) * .5f;
        c.save();
        c.translate(ox, oy);
        c.scale(scale, scale);

        RectF card = new RectF(420, 88, 1116, 632);
        panel(c, card, 0xee171932, 26, 0x4463dff5);
        if (logo != null) c.drawBitmap(logo, null, new RectF(668, 112, 868, 312), p);
        text(c, "HARLEY’S STUDIOS PRESENTS", 768, 354, 17, MINT, Paint.Align.CENTER, true);
        text(c, "Critter Extraction", 768, 405, 42, TEXT, Paint.Align.CENTER, true);
        text(c, "Cinematic critters. Tactical cover. Bigger extraction runs.", 768, 438, 16, MUTED, Paint.Align.CENTER, false);
        RectF track = new RectF(500, 531, 1036, 545);
        round(c, track, 0xff0d1021, 8);
        RectF fill = new RectF(track.left, track.top, track.left + track.width() * bootProgress, track.bottom);
        p.setShader(new LinearGradient(fill.left, 0, fill.right, 0, MINT, CYAN, Shader.TileMode.CLAMP));
        c.drawRoundRect(fill, 8, 8, p);
        p.setShader(null);
        text(c, "Loading refreshed critters, regional map assets, weapons, and HUD…", 768, 584, 14, MUTED, Paint.Align.CENTER, false);
        c.restore();
    }

    private void drawMenu(Canvas c) {
        int w = getWidth(), h = getHeight();
        p.setShader(new LinearGradient(0, 0, w, h, 0xff26264d, BG, Shader.TileMode.CLAMP));
        c.drawRect(0, 0, w, h, p);
        p.setShader(null);

        menuScale = Math.min(w / DESIGN_W, h / DESIGN_H);
        menuOffsetX = (w - DESIGN_W * menuScale) * .5f;
        menuOffsetY = (h - DESIGN_H * menuScale) * .5f;

        c.save();
        c.translate(menuOffsetX, menuOffsetY);
        c.scale(menuScale, menuScale);
        drawMenuReference(c);
        c.restore();
    }

    /** Pixel-aligned layout for the user's 1536x720 landscape reference. */
    private void drawMenuReference(Canvas c) {
        // Top bar. Keep the title block independent from the action buttons.
        round(c, new RectF(0, 0, DESIGN_W, 118), 0xee0e0f1f, 0);
        if (logo != null) c.drawBitmap(logo, null, new RectF(64, 10, 150, 100), p);
        text(c, "Critter Extraction", 195, 51, 36, TEXT, Paint.Align.LEFT, true);
        text(c, "v0.22.0 • Harley’s Studios • Cartoon-Realistic Extraction Shooter", 195, 81, 18, MUTED, Paint.Align.LEFT, false);

        chip(c, "Controls", 805, 25, 170, 68, false);
        chip(c, "Settings", 990, 25, 170, 68, false);
        chip(c, "🌸 0 Petals", 1175, 25, 200, 68, true);
        chip(c, "New Critter", 1390, 25, 128, 68, false);

        // Hero: all copy and actions stay above y=425; cards begin at y=444.
        RectF heroCard = new RectF(72, 145, 1464, 425);
        panel(c, heroCard, 0xf226284c, 24, 0x22ffffff);

        RectF heroImage = new RectF(860, heroCard.top, heroCard.right, heroCard.bottom);
        if (hero != null) {
            Rect src = crop(hero, heroImage);
            c.save();
            c.clipRect(heroImage);
            c.drawBitmap(hero, src, heroImage, p);
            c.restore();
        } else {
            round(c, heroImage, 0xff438d70, 24);
        }
        p.setShader(new LinearGradient(860, 0, 1010, 0, 0xf226284c, 0x0026284c, Shader.TileMode.CLAMP));
        c.drawRect(860, heroCard.top, 1030, heroCard.bottom, p);
        p.setShader(null);

        text(c, "HARLEY’S STUDIOS • MODERN-BROWSER READY • PROCEDURAL MAPS", 112, 195, 16, MINT, Paint.Align.LEFT, true);
        text(c, "Choose your critter. Build your kit.", 112, 247, 39, TEXT, Paint.Align.LEFT, true);
        text(c, "Bring the loot home.", 112, 292, 39, TEXT, Paint.Align.LEFT, true);
        text(c, "Drop into a colorful procedural region, fight raiders, collect Moonberries,", 112, 327, 17, 0xffc8cae1, Paint.Align.LEFT, false);
        text(c, "complete the contract, and reach the extraction beacon alive.", 112, 350, 17, 0xffc8cae1, Paint.Align.LEFT, false);

        float btnY = 365, btnH = 46;
        playRect.set(112, btnY, 335, btnY + btnH);
        gradientButton(c, playRect, "Play Solo", MINT, CYAN, true);
        gradientButton(c, new RectF(350, btnY, 606, btnY + btnH), "Host Multiplayer", PURPLE, 0xff5d57b5, false);
        gradientButton(c, new RectF(621, btnY, 845, btnY + btnH), "Join Multiplayer", PURPLE, 0xff5d57b5, false);

        // Dashboard cards. Fixed 256px height prevents the bottom controls from being cut off.
        float cardsTop = 444, cardsBottom = 704, gap = 14;
        float margin = 72;
        float cardW = (DESIGN_W - margin * 2 - gap * 2) / 3f;
        RectF profile = new RectF(margin, cardsTop, margin + cardW, cardsBottom);
        RectF career = new RectF(profile.right + gap, cardsTop, profile.right + gap + cardW, cardsBottom);
        RectF loadout = new RectF(career.right + gap, cardsTop, DESIGN_W - margin, cardsBottom);
        panel(c, profile, 0xf226284c, 20, 0x22ffffff);
        panel(c, career, 0xf226284c, 20, 0x22ffffff);
        panel(c, loadout, 0xf226284c, 20, 0x22ffffff);

        // Active account.
        text(c, "ACTIVE ACCOUNT", profile.left + 24, profile.top + 34, 15, MINT, Paint.Align.LEFT, true);
        text(c, "New Critter", profile.left + 24, profile.top + 75, 34, TEXT, Paint.Align.LEFT, true);
        if (critter != null) c.drawBitmap(critter, null, new RectF(profile.left + 24, profile.top + 91, profile.left + 116, profile.top + 183), p);
        text(c, "@rookie", profile.left + 138, profile.top + 126, 21, TEXT, Paint.Align.LEFT, true);
        text(c, "Ready for the meadow.", profile.left + 138, profile.top + 158, 16, MUTED, Paint.Align.LEFT, false);
        text(c, "Level 1", profile.left + 24, profile.bottom - 50, 16, MUTED, Paint.Align.LEFT, false);
        round(c, new RectF(profile.left + 24, profile.bottom - 31, profile.right - 24, profile.bottom - 20), 0xff111328, 6);
        p.setShader(new LinearGradient(profile.left + 24, 0, profile.left + 180, 0, MINT, PURPLE, Shader.TileMode.CLAMP));
        c.drawRoundRect(new RectF(profile.left + 24, profile.bottom - 31, profile.left + 165, profile.bottom - 20), 6, 6, p);
        p.setShader(null);

        // Career.
        text(c, "CAREER", career.left + 24, career.top + 34, 15, MINT, Paint.Align.LEFT, true);
        text(c, "Extraction Record", career.left + 24, career.top + 75, 34, TEXT, Paint.Align.LEFT, true);
        float statW = (career.width() - 66) / 2f;
        stat(c, career.left + 24, career.top + 94, statW, "0", "EXTRACTS");
        stat(c, career.left + 42 + statW, career.top + 94, statW, "0", "BERRIES");
        stat(c, career.left + 24, career.top + 168, statW, "0", "CRITTERS");
        stat(c, career.left + 42 + statW, career.top + 168, statW, "0", "DROPS");

        // Selected loadout.
        text(c, "SELECTED LOADOUT", loadout.left + 24, loadout.top + 34, 15, MINT, Paint.Align.LEFT, true);
        text(c, "Meadow Scout", loadout.left + 24, loadout.top + 75, 34, TEXT, Paint.Align.LEFT, true);
        weaponRect.set(loadout.left + 22, loadout.top + 94, loadout.right - 22, loadout.top + 168);
        round(c, weaponRect, 0x18ffffff, 14);
        if (weapon != null) c.drawBitmap(weapon, null, new RectF(weaponRect.left + 10, weaponRect.top + 8, weaponRect.left + 76, weaponRect.bottom - 8), p);
        text(c, "Pea Popper", weaponRect.left + 92, weaponRect.top + 31, 20, TEXT, Paint.Align.LEFT, true);
        text(c, "Balanced semi-auto berry blaster", weaponRect.left + 92, weaponRect.top + 56, 15, MUTED, Paint.Align.LEFT, false);
        critterRect.set(loadout.left + 22, loadout.bottom - 60, loadout.right - 22, loadout.bottom - 18);
        gradientButton(c, critterRect, "Character  •  Change Critter", PURPLE, 0xff5d57b5, false);
    }

    @Override public boolean onTouchEvent(MotionEvent e) {
        if (boot || e.getActionMasked() != MotionEvent.ACTION_UP) return true;
        float x = (e.getX() - menuOffsetX) / Math.max(.001f, menuScale);
        float y = (e.getY() - menuOffsetY) / Math.max(.001f, menuScale);
        if (playRect.contains(x, y)) {
            if (listener != null) listener.onPlaySolo();
            return true;
        }
        if (critterRect.contains(x, y)) {
            if (listener != null) listener.onNextCritter();
            invalidate();
            return true;
        }
        if (weaponRect.contains(x, y)) {
            if (listener != null) listener.onNextWeapon();
            invalidate();
            return true;
        }
        return true;
    }

    private void stat(Canvas c, float x, float y, float width, String value, String label) {
        round(c, new RectF(x, y, x + width, y + 58), 0x12ffffff, 13);
        text(c, value, x + 14, y + 31, 31, TEXT, Paint.Align.LEFT, true);
        text(c, label, x + 14, y + 50, 12, MUTED, Paint.Align.LEFT, true);
    }

    private Rect crop(Bitmap b, RectF dst) {
        float br = b.getWidth() / (float)b.getHeight();
        float dr = dst.width() / dst.height();
        if (br > dr) {
            int sw = Math.round(b.getHeight() * dr), sx = (b.getWidth() - sw) / 2;
            return new Rect(sx, 0, sx + sw, b.getHeight());
        }
        int sh = Math.round(b.getWidth() / dr), sy = (b.getHeight() - sh) / 2;
        return new Rect(0, sy, b.getWidth(), sy + sh);
    }

    private void chip(Canvas c, String s, float x, float y, float w, float h, boolean mint) {
        RectF r = new RectF(x, y, x + w, y + h);
        panel(c, r, mint ? 0x227ef7d4 : 0x12ffffff, 22, mint ? 0x667ef7d4 : 0x22ffffff);
        text(c, s, r.centerX(), r.centerY() + 7, 18, mint ? MINT : TEXT, Paint.Align.CENTER, true);
    }

    private void gradientButton(Canvas c, RectF r, String s, int a, int b, boolean darkText) {
        p.setShader(new LinearGradient(r.left, r.top, r.right, r.bottom, a, b, Shader.TileMode.CLAMP));
        c.drawRoundRect(r, 16, 16, p);
        p.setShader(null);
        text(c, s, r.centerX(), r.centerY() + 7, 18, darkText ? 0xff111526 : TEXT, Paint.Align.CENTER, true);
    }

    private void panel(Canvas c, RectF r, int color, float radius, int border) {
        round(c, r, color, radius);
        stroke.setColor(border);
        stroke.setStrokeWidth(1.5f);
        c.drawRoundRect(r, radius, radius, stroke);
    }

    private void round(Canvas c, RectF r, int color, float radius) {
        p.setShader(null);
        p.setColor(color);
        p.setStyle(Paint.Style.FILL);
        c.drawRoundRect(r, radius, radius, p);
    }

    private void text(Canvas c, String s, float x, float y, float size, int color, Paint.Align align, boolean bold) {
        p.setShader(null);
        p.setColor(color);
        p.setTextSize(size);
        p.setTextAlign(align);
        p.setTypeface(android.graphics.Typeface.create("sans", bold ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL));
        c.drawText(s, x, y, p);
    }
}
