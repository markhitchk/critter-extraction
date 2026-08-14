package com.harleystudios.critterextraction;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.os.SystemClock;
import android.view.HapticFeedbackConstants;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * Fully native Android gameplay view for Critter Extraction.
 * No WebView, HTML, JavaScript runtime, CDN, or network is used.
 */
public final class GameView extends View {
    private static final float WORLD_W = 3600f;
    private static final float WORLD_H = 2400f;
    private static final float PLAYER_R = 34f;
    private static final float JOYSTICK_R = 104f;
    private static final int LOOT_TO_EXTRACT = 8;
    private static final int PETAL_CAP = 1_000_000;

    private static final int STATE_MENU = 0;
    private static final int STATE_PLAYING = 1;
    private static final int STATE_PAUSED = 2;
    private static final int STATE_SUCCESS = 3;
    private static final int STATE_GAME_OVER = 4;

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Random random = new Random();
    private final SharedPreferences prefs;
    private final AssetLibrary assetLibrary;
    private final Bitmap htgLogo;

    private final List<Enemy> enemies = new ArrayList<>();
    private final List<Bullet> bullets = new ArrayList<>();
    private final List<Loot> loot = new ArrayList<>();
    private final List<Particle> particles = new ArrayList<>();

    private int state = STATE_MENU;
    private int selectedCritter;
    private int selectedWeapon;
    private int selectedArmor;
    private int bestExtraction;
    private int totalPetals;
    private int lifetimeRuns;

    private float playerX = WORLD_W * .5f;
    private float playerY = WORLD_H * .5f;
    private float playerHp = 100f;
    private float lastAimX = 1f;
    private float lastAimY = 0f;
    private int carriedLoot;
    private int runPetals;
    private int medkits = 2;
    private float extractionProgress;
    private boolean extractionUnlocked;
    private final float extractionX = WORLD_W - 430f;
    private final float extractionY = 430f;
    private float spawnTimer;
    private float fireTimer;
    private float damageFlash;
    private float dashCooldown;
    private float playerInvulnerable;
    private long runStartMs;

    private long lastFrameNanos;
    private final long bootUntilMs = SystemClock.uptimeMillis() + 950L;
    private boolean lifecycleRunning = true;

    private int movePointerId = -1;
    private int aimPointerId = -1;
    private float moveBaseX, moveBaseY, moveTouchX, moveTouchY;
    private float aimBaseX, aimBaseY, aimTouchX, aimTouchY;
    private float moveX, moveY, aimX, aimY;

    private final RectF pauseButton = new RectF();
    private final RectF dashButton = new RectF();
    private final RectF healButton = new RectF();
    private final RectF primaryButton = new RectF();
    private final RectF critterLeft = new RectF();
    private final RectF critterRight = new RectF();
    private final RectF weaponLeft = new RectF();
    private final RectF weaponRight = new RectF();
    private final RectF armorLeft = new RectF();
    private final RectF armorRight = new RectF();

    public GameView(Context context) {
        super(context);
        setFocusable(true);
        setFocusableInTouchMode(true);
        requestFocus();
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(3f);

        prefs = context.getSharedPreferences("critter_native_save_v2", Context.MODE_PRIVATE);
        selectedCritter = clampIndex(prefs.getInt("selected_critter", 0), AssetLibrary.CRITTER_NAMES.length);
        selectedWeapon = clampIndex(prefs.getInt("selected_weapon", 0), AssetLibrary.WEAPON_NAMES.length);
        selectedArmor = clampIndex(prefs.getInt("selected_armor", 0), AssetLibrary.ARMOR_NAMES.length);
        bestExtraction = prefs.getInt("best_extraction", 0);
        totalPetals = prefs.getInt("petals", 0);
        lifetimeRuns = prefs.getInt("runs", 0);

        assetLibrary = new AssetLibrary(context);
        htgLogo = assetLibrary.loadBitmap("HTG.png");
    }

    public void resumeGameLoop() {
        lifecycleRunning = true;
        lastFrameNanos = 0L;
        postInvalidateOnAnimation();
    }

    public void pauseForLifecycle() {
        lifecycleRunning = false;
        if (state == STATE_PLAYING) state = STATE_PAUSED;
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        long nowNanos = System.nanoTime();
        float dt = lastFrameNanos == 0L ? 0f : (nowNanos - lastFrameNanos) / 1_000_000_000f;
        lastFrameNanos = nowNanos;
        dt = Math.min(dt, .033f);

        if (SystemClock.uptimeMillis() < bootUntilMs) drawBoot(canvas);
        else if (state == STATE_MENU) drawMenu(canvas);
        else {
            if (state == STATE_PLAYING && lifecycleRunning) updateGame(dt);
            drawWorld(canvas);
            drawHud(canvas);
            if (state == STATE_PAUSED) drawPauseOverlay(canvas);
            if (state == STATE_SUCCESS) drawEndOverlay(canvas, true);
            if (state == STATE_GAME_OVER) drawEndOverlay(canvas, false);
        }
        if (lifecycleRunning) postInvalidateOnAnimation();
    }

    private void updateGame(float dt) {
        if (dt <= 0f) return;
        fireTimer = Math.max(0f, fireTimer - dt);
        damageFlash = Math.max(0f, damageFlash - dt);
        dashCooldown = Math.max(0f, dashCooldown - dt);
        playerInvulnerable = Math.max(0f, playerInvulnerable - dt);

        float moveLen = length(moveX, moveY);
        if (moveLen > .05f) {
            float nx = moveX / Math.max(1f, moveLen);
            float ny = moveY / Math.max(1f, moveLen);
            float speed = 360f * armorSpeedMultiplier();
            float strength = Math.min(1f, moveLen);
            playerX = clamp(playerX + nx * speed * strength * dt, PLAYER_R, WORLD_W - PLAYER_R);
            playerY = clamp(playerY + ny * speed * strength * dt, PLAYER_R, WORLD_H - PLAYER_R);
        }

        float aimLen = length(aimX, aimY);
        if (aimLen > .23f) {
            lastAimX = aimX / aimLen;
            lastAimY = aimY / aimLen;
            if (fireTimer <= 0f) fireWeapon();
        }

        spawnTimer -= dt;
        if (spawnTimer <= 0f && enemies.size() < 34) {
            spawnEnemy();
            float difficulty = Math.min(.75f, (SystemClock.uptimeMillis() - runStartMs) / 120_000f);
            spawnTimer = 1.25f - difficulty;
        }

        for (Enemy e : enemies) {
            float dx = playerX - e.x;
            float dy = playerY - e.y;
            float d = Math.max(1f, length(dx, dy));
            e.x += (dx / d) * e.speed * dt;
            e.y += (dy / d) * e.speed * dt;
            e.flash = Math.max(0f, e.flash - dt);
            e.attackCooldown = Math.max(0f, e.attackCooldown - dt);
            if (d < e.radius + PLAYER_R + 8f && e.attackCooldown <= 0f && playerInvulnerable <= 0f) {
                float incoming = e.damage * (1f - armorDamageReduction());
                playerHp -= incoming;
                e.attackCooldown = .62f;
                damageFlash = .16f;
                performHapticFeedback(HapticFeedbackConstants.REJECT);
                burst(playerX, playerY, 0xffff6b6b, 7);
            }
        }

        Iterator<Bullet> bulletIt = bullets.iterator();
        while (bulletIt.hasNext()) {
            Bullet b = bulletIt.next();
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            boolean remove = b.life <= 0f || b.x < 0f || b.y < 0f || b.x > WORLD_W || b.y > WORLD_H;
            if (!remove) {
                for (Enemy e : enemies) {
                    if (e.hp <= 0f) continue;
                    float dx = b.x - e.x;
                    float dy = b.y - e.y;
                    if (dx * dx + dy * dy < (e.radius + 9f) * (e.radius + 9f)) {
                        e.hp -= b.damage;
                        e.flash = .09f;
                        burst(b.x, b.y, 0xffa8efff, 3);
                        if (--b.pierce < 0) remove = true;
                        break;
                    }
                }
            }
            if (remove) bulletIt.remove();
        }

        Iterator<Enemy> enemyIt = enemies.iterator();
        while (enemyIt.hasNext()) {
            Enemy e = enemyIt.next();
            if (e.hp <= 0f) {
                int value = 1 + random.nextInt(3);
                loot.add(new Loot(e.x, e.y, value));
                runPetals += 4 + random.nextInt(8);
                burst(e.x, e.y, 0xff7ee787, 11);
                enemyIt.remove();
            }
        }

        Iterator<Loot> lootIt = loot.iterator();
        while (lootIt.hasNext()) {
            Loot l = lootIt.next();
            float dx = playerX - l.x;
            float dy = playerY - l.y;
            if (dx * dx + dy * dy < 95f * 95f) {
                carriedLoot += l.value;
                runPetals += l.value * 2;
                performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK);
                burst(l.x, l.y, 0xffffd166, 6);
                lootIt.remove();
                if (!extractionUnlocked && carriedLoot >= LOOT_TO_EXTRACT) {
                    extractionUnlocked = true;
                    performHapticFeedback(HapticFeedbackConstants.CONFIRM);
                }
            }
        }

        if (extractionUnlocked) {
            float dx = playerX - extractionX;
            float dy = playerY - extractionY;
            if (dx * dx + dy * dy < 145f * 145f) {
                extractionProgress += dt;
                if (extractionProgress >= 3f) completeExtraction();
            } else extractionProgress = Math.max(0f, extractionProgress - dt * 1.7f);
        }

        Iterator<Particle> particleIt = particles.iterator();
        while (particleIt.hasNext()) {
            Particle p = particleIt.next();
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= .96f;
            p.vy *= .96f;
            if (p.life <= 0f) particleIt.remove();
        }

        if (playerHp <= 0f) {
            playerHp = 0f;
            state = STATE_GAME_OVER;
            finishRun(false);
        }
    }

    private void fireWeapon() {
        float damage;
        float speed;
        float cooldown;
        int pellets = 1;
        float spread = 0f;
        int pierce = 0;

        switch (selectedWeapon) {
            case 1: // Acorn Sprayer
                damage = 20f; speed = 1080f; cooldown = .082f; break;
            case 2: // Carrot Scatter
                damage = 15f; speed = 900f; cooldown = .58f; pellets = 5; spread = .16f; break;
            case 3: // Honey Carbine
                damage = 31f; speed = 1120f; cooldown = .19f; break;
            case 4: // Moonbeam
                damage = 56f; speed = 1250f; cooldown = .52f; pierce = 2; break;
            default: // Pea Popper
                damage = 34f; speed = 980f; cooldown = .145f; break;
        }

        float baseAngle = (float) Math.atan2(lastAimY, lastAimX);
        for (int i = 0; i < pellets; i++) {
            float offset = pellets == 1 ? 0f : (i - (pellets - 1) * .5f) * spread;
            float angle = baseAngle + offset;
            float nx = (float) Math.cos(angle);
            float ny = (float) Math.sin(angle);
            bullets.add(new Bullet(
                    playerX + nx * (PLAYER_R + 15f), playerY + ny * (PLAYER_R + 15f),
                    nx * speed, ny * speed, damage, 1.35f, pierce
            ));
        }
        fireTimer = cooldown;
    }

    private void startRun() {
        state = STATE_PLAYING;
        playerX = WORLD_W * .5f;
        playerY = WORLD_H * .5f;
        playerHp = 100f;
        carriedLoot = 0;
        runPetals = 0;
        medkits = selectedArmor == 4 ? 3 : 2;
        extractionProgress = 0f;
        extractionUnlocked = false;
        spawnTimer = .4f;
        fireTimer = 0f;
        dashCooldown = 0f;
        playerInvulnerable = 0f;
        enemies.clear(); bullets.clear(); loot.clear(); particles.clear();
        releaseControls();
        runStartMs = SystemClock.uptimeMillis();
        for (int i = 0; i < 7; i++) spawnEnemy();
        persistLoadout();
        performHapticFeedback(HapticFeedbackConstants.CONFIRM);
    }

    private void completeExtraction() {
        if (state != STATE_PLAYING) return;
        state = STATE_SUCCESS;
        runPetals += carriedLoot * 12;
        finishRun(true);
        burst(playerX, playerY, 0xff57e389, 30);
        performHapticFeedback(HapticFeedbackConstants.CONFIRM);
    }

    private void finishRun(boolean success) {
        lifetimeRuns++;
        if (success) bestExtraction = Math.max(bestExtraction, carriedLoot);
        totalPetals = Math.min(PETAL_CAP, totalPetals + Math.max(0, runPetals));
        prefs.edit()
                .putInt("selected_critter", selectedCritter)
                .putInt("selected_weapon", selectedWeapon)
                .putInt("selected_armor", selectedArmor)
                .putInt("best_extraction", bestExtraction)
                .putInt("petals", totalPetals)
                .putInt("runs", lifetimeRuns)
                .apply();
    }

    private void persistLoadout() {
        prefs.edit()
                .putInt("selected_critter", selectedCritter)
                .putInt("selected_weapon", selectedWeapon)
                .putInt("selected_armor", selectedArmor)
                .apply();
    }

    private float armorDamageReduction() {
        switch (selectedArmor) {
            case 1: return .16f;
            case 2: return .08f;
            case 3: return .24f;
            case 4: return .12f;
            case 5: return .30f;
            default: return .06f;
        }
    }

    private float armorSpeedMultiplier() {
        switch (selectedArmor) {
            case 2: return 1.10f;
            case 3: return .92f;
            case 5: return .86f;
            default: return 1f;
        }
    }

    private void dash() {
        if (state != STATE_PLAYING || dashCooldown > 0f) return;
        float dx = moveX, dy = moveY;
        float len = length(dx, dy);
        if (len < .15f) { dx = lastAimX; dy = lastAimY; len = Math.max(.01f, length(dx, dy)); }
        dx /= len; dy /= len;
        playerX = clamp(playerX + dx * 250f, PLAYER_R, WORLD_W - PLAYER_R);
        playerY = clamp(playerY + dy * 250f, PLAYER_R, WORLD_H - PLAYER_R);
        dashCooldown = selectedArmor == 4 ? 1.75f : 2.25f;
        playerInvulnerable = .24f;
        burst(playerX, playerY, 0xff59d7ff, 15);
        performHapticFeedback(HapticFeedbackConstants.CONTEXT_CLICK);
    }

    private void heal() {
        if (state != STATE_PLAYING || medkits <= 0 || playerHp >= 99.5f) return;
        medkits--;
        playerHp = Math.min(100f, playerHp + 42f);
        burst(playerX, playerY, 0xff7ee787, 18);
        performHapticFeedback(HapticFeedbackConstants.CONFIRM);
    }

    private void spawnEnemy() {
        float angle = random.nextFloat() * (float) (Math.PI * 2.0);
        float distance = 600f + random.nextFloat() * 700f;
        float x = clamp(playerX + (float) Math.cos(angle) * distance, 55f, WORLD_W - 55f);
        float y = clamp(playerY + (float) Math.sin(angle) * distance, 55f, WORLD_H - 55f);
        float scale = .85f + random.nextFloat() * .45f;
        enemies.add(new Enemy(x, y, 31f * scale, 72f * scale, 118f + random.nextFloat() * 62f,
                8f + random.nextFloat() * 6f, random.nextInt(AssetLibrary.CRITTER_PATHS.length)));
    }

    private void burst(float x, float y, int color, int count) {
        for (int i = 0; i < count && particles.size() < 180; i++) {
            float a = random.nextFloat() * (float) Math.PI * 2f;
            float s = 50f + random.nextFloat() * 190f;
            particles.add(new Particle(x, y, (float) Math.cos(a) * s, (float) Math.sin(a) * s,
                    .22f + random.nextFloat() * .42f, color));
        }
    }

    private void drawBoot(Canvas c) {
        c.drawColor(0xff071117);
        float w = getWidth(), h = getHeight();
        if (htgLogo != null) {
            float maxW = Math.min(w * .20f, 230f);
            float ratio = htgLogo.getHeight() / (float) Math.max(1, htgLogo.getWidth());
            RectF dst = new RectF(w * .5f - maxW * .5f, h * .18f, w * .5f + maxW * .5f, h * .18f + maxW * ratio);
            c.drawBitmap(htgLogo, null, dst, paint);
        } else {
            drawCritterAsset(c, w * .5f, h * .34f, 120f, selectedCritter, 0xff59d7ff);
        }
        text(c, "CRITTER EXTRACTION", w * .5f, h * .61f, 40f, 0xffeaf8ff, Paint.Align.CENTER, true);
        text(c, "NATIVE MOBILE • v0.24.0", w * .5f, h * .68f, 17f, 0xff59d7ff, Paint.Align.CENTER, true);
        text(c, assetLibrary.catalogSummary(), w * .5f, h * .73f, 13f, 0xff91aab5, Paint.Align.CENTER, false);
        float p = clamp(1f - (bootUntilMs - SystemClock.uptimeMillis()) / 950f, 0f, 1f);
        RectF bar = new RectF(w * .5f - 150f, h * .79f, w * .5f + 150f, h * .79f + 7f);
        paint.setColor(0xff17303a); c.drawRoundRect(bar, 4f, 4f, paint);
        paint.setColor(0xff59d7ff); c.drawRoundRect(new RectF(bar.left, bar.top, bar.left + bar.width() * p, bar.bottom), 4f, 4f, paint);
    }

    private void drawMenu(Canvas c) {
        c.drawColor(0xff071117);
        float w = getWidth(), h = getHeight();
        paint.setColor(0xff0c222c);
        for (int i = 0; i < 22; i++) {
            float x = (i * 173f + SystemClock.uptimeMillis() * .012f) % (w + 120f) - 60f;
            float y = (i * 97f) % Math.max(1f, h);
            c.drawCircle(x, y, 2.5f + (i % 3), paint);
        }

        text(c, "CRITTER EXTRACTION", w * .5f, 55f, 33f, 0xfff2fbff, Paint.Align.CENTER, true);
        text(c, "ANDROID 14+ • FULL NATIVE MOBILE ALPHA", w * .5f, 82f, 13f, 0xff68d9ff, Paint.Align.CENTER, true);

        float cardW = Math.min(760f, w * .72f);
        float left = w * .5f - cardW * .5f;
        float right = w * .5f + cardW * .5f;
        float top = Math.max(100f, h * .16f);
        float bottom = Math.min(h - 112f, h * .73f);
        RectF card = new RectF(left, top, right, bottom);
        paint.setColor(0xff0d1d24); c.drawRoundRect(card, 28f, 28f, paint);
        stroke.setColor(0xff245163); stroke.setStrokeWidth(3f); c.drawRoundRect(card, 28f, 28f, stroke);

        float artSize = Math.min(180f, card.height() * .52f);
        drawCritterAsset(c, left + 125f, card.centerY() - 5f, artSize, selectedCritter, critterColor(selectedCritter));

        float rowLeft = left + 235f;
        float rowRight = right - 22f;
        float rowH = Math.max(50f, card.height() / 3.45f);
        float y1 = top + 16f;
        float y2 = y1 + rowH + 8f;
        float y3 = y2 + rowH + 8f;

        drawLoadoutRow(c, new RectF(rowLeft, y1, rowRight, y1 + rowH), "CRITTER",
                AssetLibrary.CRITTER_NAMES[selectedCritter], AssetLibrary.CRITTER_PATHS[selectedCritter],
                critterLeft, critterRight, 0xff59d7ff);
        drawLoadoutRow(c, new RectF(rowLeft, y2, rowRight, y2 + rowH), "WEAPON",
                AssetLibrary.WEAPON_NAMES[selectedWeapon], AssetLibrary.WEAPON_PATHS[selectedWeapon],
                weaponLeft, weaponRight, 0xffffd166);
        drawLoadoutRow(c, new RectF(rowLeft, y3, rowRight, y3 + rowH), "ARMOR",
                AssetLibrary.ARMOR_NAMES[selectedArmor], AssetLibrary.ARMOR_PATHS[selectedArmor],
                armorLeft, armorRight, 0xff7ee787);

        primaryButton.set(w * .5f - 170f, h - 90f, w * .5f + 170f, h - 25f);
        paint.setColor(0xff59d7ff); c.drawRoundRect(primaryButton, 22f, 22f, paint);
        text(c, "DEPLOY", primaryButton.centerX(), primaryButton.centerY() + 8f, 23f, 0xff041017, Paint.Align.CENTER, true);

        text(c, "Best " + bestExtraction + "  •  Petals " + totalPetals + "  •  Runs " + lifetimeRuns,
                22f, h - 32f, 12f, 0xff9eb7c2, Paint.Align.LEFT, false);
        text(c, assetLibrary.totalCatalogCount() + " packaged shared assets", w - 22f, h - 32f, 12f, 0xff9eb7c2, Paint.Align.RIGHT, false);
    }

    private void drawLoadoutRow(Canvas c, RectF row, String label, String name, String assetPath,
                                RectF leftButton, RectF rightButton, int accent) {
        paint.setColor(0xff102630); c.drawRoundRect(row, 16f, 16f, paint);
        stroke.setColor(0xff284855); stroke.setStrokeWidth(2f); c.drawRoundRect(row, 16f, 16f, stroke);

        float buttonW = 46f;
        leftButton.set(row.left + 7f, row.top + 7f, row.left + 7f + buttonW, row.bottom - 7f);
        rightButton.set(row.right - 7f - buttonW, row.top + 7f, row.right - 7f, row.bottom - 7f);
        drawArrow(c, leftButton, false); drawArrow(c, rightButton, true);

        float iconSize = Math.max(40f, row.height() - 15f);
        RectF icon = new RectF(leftButton.right + 8f, row.centerY() - iconSize * .5f,
                leftButton.right + 8f + iconSize, row.centerY() + iconSize * .5f);
        assetLibrary.drawSvgOrFallback(c, assetPath, icon, accent, name);

        float textX = icon.right + 12f;
        text(c, label, textX, row.centerY() - 5f, 10f, 0xff7f9aa5, Paint.Align.LEFT, true);
        text(c, name, textX, row.centerY() + 17f, 16f, 0xffeefaff, Paint.Align.LEFT, true);
    }

    private void drawWorld(Canvas c) {
        c.drawColor(0xff071117);
        float camX = clamp(playerX - getWidth() * .5f, 0f, Math.max(0f, WORLD_W - getWidth()));
        float camY = clamp(playerY - getHeight() * .5f, 0f, Math.max(0f, WORLD_H - getHeight()));
        c.save();
        c.translate(-camX, -camY);
        drawGround(c, camX, camY);
        if (extractionUnlocked) drawExtractionZone(c);
        for (Loot l : loot) drawLoot(c, l);
        for (Enemy e : enemies) drawEnemy(c, e);
        for (Bullet b : bullets) {
            paint.setColor(selectedWeapon == 4 ? 0xffd996ff : 0xffa8efff);
            c.drawCircle(b.x, b.y, selectedWeapon == 4 ? 10f : 7f, paint);
            stroke.setColor(0x7059d7ff); stroke.setStrokeWidth(7f);
            c.drawLine(b.x - b.vx * .025f, b.y - b.vy * .025f, b.x, b.y, stroke);
        }
        for (Particle p : particles) {
            int alpha = (int) (255f * clamp(p.life / .55f, 0f, 1f));
            paint.setColor((p.color & 0x00ffffff) | (alpha << 24));
            c.drawCircle(p.x, p.y, 4f, paint);
        }
        if (playerInvulnerable <= 0f || ((int) (SystemClock.uptimeMillis() / 55L) & 1) == 0) {
            drawCritterAsset(c, playerX, playerY, 90f, selectedCritter, critterColor(selectedCritter));
            paint.setColor(0xffd9f6ff); paint.setStrokeWidth(5f);
            c.drawLine(playerX + lastAimX * 22f, playerY + lastAimY * 22f,
                    playerX + lastAimX * 57f, playerY + lastAimY * 57f, paint);
        }
        c.restore();
        if (damageFlash > 0f) {
            paint.setColor(0x48ff354f); c.drawRect(0f, 0f, getWidth(), getHeight(), paint);
        }
    }

    private void drawGround(Canvas c, float camX, float camY) {
        paint.setColor(0xff0b1c20); c.drawRect(0f, 0f, WORLD_W, WORLD_H, paint);
        float grid = 160f;
        stroke.setStrokeWidth(2f); stroke.setColor(0xff123039);
        float startX = (float) Math.floor(camX / grid) * grid;
        for (float x = startX; x <= camX + getWidth() + grid; x += grid) c.drawLine(x, 0f, x, WORLD_H, stroke);
        float startY = (float) Math.floor(camY / grid) * grid;
        for (float y = startY; y <= camY + getHeight() + grid; y += grid) c.drawLine(0f, y, WORLD_W, y, stroke);
        paint.setColor(0xff10272b);
        for (int i = 0; i < 30; i++) c.drawCircle(130f + ((i * 547) % 3250), 120f + ((i * 313) % 2100), 25f + (i % 5) * 9f, paint);
        stroke.setColor(0xff2b5a63); stroke.setStrokeWidth(8f); c.drawRect(4f, 4f, WORLD_W - 4f, WORLD_H - 4f, stroke);
    }

    private void drawExtractionZone(Canvas c) {
        float pulse = .5f + .5f * (float) Math.sin(SystemClock.uptimeMillis() * .006);
        paint.setColor(Color.argb(35 + (int) (35 * pulse), 87, 227, 137)); c.drawCircle(extractionX, extractionY, 150f, paint);
        stroke.setColor(0xff57e389); stroke.setStrokeWidth(6f); c.drawCircle(extractionX, extractionY, 150f, stroke);
        c.drawCircle(extractionX, extractionY, 106f + pulse * 12f, stroke);
        text(c, "EXTRACT", extractionX, extractionY + 7f, 22f, 0xffd8ffe7, Paint.Align.CENTER, true);
    }

    private void drawHud(Canvas c) {
        float w = getWidth(), h = getHeight();
        RectF hpBg = new RectF(28f, 24f, Math.min(350f, w * .32f), 50f);
        paint.setColor(0xcc0a1115); c.drawRoundRect(hpBg, 13f, 13f, paint);
        RectF hp = new RectF(hpBg.left + 3f, hpBg.top + 3f,
                hpBg.left + 3f + (hpBg.width() - 6f) * (playerHp / 100f), hpBg.bottom - 3f);
        paint.setColor(playerHp > 35f ? 0xff57e389 : 0xffff5c6c); c.drawRoundRect(hp, 10f, 10f, paint);
        text(c, Math.round(playerHp) + " HP", hpBg.left + 10f, 72f, 13f, 0xffe7f7fc, Paint.Align.LEFT, true);

        String objective = extractionUnlocked
                ? "EXTRACTION OPEN • HOLD ZONE " + Math.min(100, Math.round(extractionProgress / 3f * 100f)) + "%"
                : "LOOT " + carriedLoot + "/" + LOOT_TO_EXTRACT;
        text(c, objective, w * .5f, 42f, 17f, extractionUnlocked ? 0xff57e389 : 0xffffd166, Paint.Align.CENTER, true);
        text(c, "RUN +" + runPetals + " PETALS", w * .5f, 67f, 12f, 0xff9eb7c2, Paint.Align.CENTER, false);

        pauseButton.set(w - 76f, 20f, w - 20f, 76f);
        paint.setColor(0xbb0b171d); c.drawRoundRect(pauseButton, 16f, 16f, paint);
        stroke.setColor(0xff3f6978); stroke.setStrokeWidth(2f); c.drawRoundRect(pauseButton, 16f, 16f, stroke);
        paint.setColor(0xffd8eef5);
        c.drawRect(pauseButton.centerX() - 10f, pauseButton.centerY() - 13f, pauseButton.centerX() - 3f, pauseButton.centerY() + 13f, paint);
        c.drawRect(pauseButton.centerX() + 3f, pauseButton.centerY() - 13f, pauseButton.centerX() + 10f, pauseButton.centerY() + 13f, paint);

        float rightX = w - 105f;
        dashButton.set(rightX - 42f, h - 122f, rightX + 42f, h - 38f);
        healButton.set(rightX - 143f, h - 112f, rightX - 73f, h - 42f);
        drawActionButton(c, dashButton, dashCooldown > 0f ? String.format(Locale.US, "%.1f", dashCooldown) : "DASH", 0xff59d7ff);
        drawActionButton(c, healButton, "MED " + medkits, 0xff57e389);

        RectF weaponIcon = new RectF(w - 210f, 19f, w - 156f, 73f);
        assetLibrary.drawSvgOrFallback(c, AssetLibrary.WEAPON_PATHS[selectedWeapon], weaponIcon, 0xffffd166,
                AssetLibrary.WEAPON_NAMES[selectedWeapon]);
        text(c, AssetLibrary.WEAPON_NAMES[selectedWeapon], weaponIcon.left - 8f, 51f, 11f, 0xffd7e8ef, Paint.Align.RIGHT, true);

        drawJoystick(c, movePointerId >= 0, moveBaseX, moveBaseY, moveTouchX, moveTouchY, 0xff59d7ff);
        drawJoystick(c, aimPointerId >= 0, aimBaseX, aimBaseY, aimTouchX, aimTouchY, 0xffffd166);
    }

    private void drawActionButton(Canvas c, RectF r, String label, int accent) {
        paint.setColor(0xcc0b171d); c.drawOval(r, paint);
        stroke.setColor(accent); stroke.setStrokeWidth(3f); c.drawOval(r, stroke);
        text(c, label, r.centerX(), r.centerY() + 5f, 12f, accent, Paint.Align.CENTER, true);
    }

    private void drawJoystick(Canvas c, boolean active, float bx, float by, float tx, float ty, int accent) {
        if (!active) return;
        paint.setColor(0x3323a6cf); c.drawCircle(bx, by, JOYSTICK_R, paint);
        stroke.setColor(accent); stroke.setStrokeWidth(3f); c.drawCircle(bx, by, JOYSTICK_R, stroke);
        float dx = tx - bx, dy = ty - by, len = length(dx, dy);
        if (len > JOYSTICK_R) { dx = dx / len * JOYSTICK_R; dy = dy / len * JOYSTICK_R; }
        paint.setColor(0xaaeafaff); c.drawCircle(bx + dx, by + dy, 38f, paint);
    }

    private void drawPauseOverlay(Canvas c) {
        float w = getWidth(), h = getHeight();
        paint.setColor(0xb9000000); c.drawRect(0f, 0f, w, h, paint);
        text(c, "PAUSED", w * .5f, h * .43f, 38f, 0xffffffff, Paint.Align.CENTER, true);
        text(c, "Tap to resume", w * .5f, h * .52f, 17f, 0xff9ec4d2, Paint.Align.CENTER, false);
        text(c, AssetLibrary.CRITTER_NAMES[selectedCritter] + " • " + AssetLibrary.WEAPON_NAMES[selectedWeapon] + " • " + AssetLibrary.ARMOR_NAMES[selectedArmor],
                w * .5f, h * .59f, 13f, 0xff59d7ff, Paint.Align.CENTER, true);
    }

    private void drawEndOverlay(Canvas c, boolean success) {
        float w = getWidth(), h = getHeight();
        paint.setColor(0xc6000000); c.drawRect(0f, 0f, w, h, paint);
        text(c, success ? "EXTRACTION COMPLETE" : "RUN LOST", w * .5f, h * .32f, 34f,
                success ? 0xff57e389 : 0xffff6b6b, Paint.Align.CENTER, true);
        text(c, "Loot " + carriedLoot + "  •  +" + runPetals + " petals", w * .5f, h * .42f, 18f, 0xffe8f7fc, Paint.Align.CENTER, true);
        primaryButton.set(w * .5f - 155f, h * .52f, w * .5f + 155f, h * .52f + 64f);
        paint.setColor(0xff59d7ff); c.drawRoundRect(primaryButton, 20f, 20f, paint);
        text(c, "DEPLOY AGAIN", primaryButton.centerX(), primaryButton.centerY() + 7f, 19f, 0xff041017, Paint.Align.CENTER, true);
        text(c, "Tap outside the button for loadout", w * .5f, h * .68f, 13f, 0xff8aa8b4, Paint.Align.CENTER, false);
    }

    private void drawEnemy(Canvas c, Enemy e) {
        int index = Math.floorMod(e.variant, AssetLibrary.CRITTER_PATHS.length);
        drawCritterAsset(c, e.x, e.y, e.radius * 2.45f, index, e.flash > 0f ? 0xffffffff : enemyColor(index));
        float hpW = e.radius * 2.1f;
        RectF bg = new RectF(e.x - hpW * .5f, e.y - e.radius - 31f, e.x + hpW * .5f, e.y - e.radius - 25f);
        paint.setColor(0xaa000000); c.drawRoundRect(bg, 3f, 3f, paint);
        paint.setColor(0xffff6b6b);
        c.drawRoundRect(new RectF(bg.left, bg.top, bg.left + bg.width() * clamp(e.hp / e.maxHp, 0f, 1f), bg.bottom), 3f, 3f, paint);
    }

    private void drawLoot(Canvas c, Loot l) {
        float pulse = 1f + .09f * (float) Math.sin(SystemClock.uptimeMillis() * .008 + l.x);
        RectF art = new RectF(l.x - 21f * pulse, l.y - 21f * pulse, l.x + 21f * pulse, l.y + 21f * pulse);
        assetLibrary.drawSvgOrFallback(c, "items/crystal.svg", art, 0xffffd166, "Crystal");
        text(c, "+" + l.value, l.x, l.y + 39f, 11f, 0xffffe69a, Paint.Align.CENTER, true);
    }

    private void drawCritterAsset(Canvas c, float x, float y, float size, int index, int fallbackColor) {
        int safe = Math.floorMod(index, AssetLibrary.CRITTER_PATHS.length);
        RectF dst = new RectF(x - size * .5f, y - size * .5f, x + size * .5f, y + size * .5f);
        assetLibrary.drawSvgOrFallback(c, AssetLibrary.CRITTER_PATHS[safe], dst, fallbackColor, AssetLibrary.CRITTER_NAMES[safe]);
    }

    private void drawArrow(Canvas c, RectF r, boolean right) {
        paint.setColor(0xff173541); c.drawRoundRect(r, 14f, 14f, paint);
        Path p = new Path();
        if (right) {
            p.moveTo(r.centerX() - 6f, r.centerY() - 11f); p.lineTo(r.centerX() + 7f, r.centerY()); p.lineTo(r.centerX() - 6f, r.centerY() + 11f);
        } else {
            p.moveTo(r.centerX() + 6f, r.centerY() - 11f); p.lineTo(r.centerX() - 7f, r.centerY()); p.lineTo(r.centerX() + 6f, r.centerY() + 11f);
        }
        p.close(); paint.setColor(0xff8ee6ff); c.drawPath(p, paint);
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        int action = event.getActionMasked();
        int actionIndex = event.getActionIndex();
        if (SystemClock.uptimeMillis() < bootUntilMs) return true;

        if (action == MotionEvent.ACTION_DOWN || action == MotionEvent.ACTION_POINTER_DOWN) {
            float x = event.getX(actionIndex), y = event.getY(actionIndex);
            int id = event.getPointerId(actionIndex);

            if (state == STATE_MENU) {
                if (primaryButton.contains(x, y)) startRun();
                else if (critterLeft.contains(x, y)) changeCritter(-1);
                else if (critterRight.contains(x, y)) changeCritter(1);
                else if (weaponLeft.contains(x, y)) changeWeapon(-1);
                else if (weaponRight.contains(x, y)) changeWeapon(1);
                else if (armorLeft.contains(x, y)) changeArmor(-1);
                else if (armorRight.contains(x, y)) changeArmor(1);
                return true;
            }
            if (state == STATE_PAUSED) {
                state = STATE_PLAYING; lastFrameNanos = 0L;
                performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK);
                return true;
            }
            if (state == STATE_SUCCESS || state == STATE_GAME_OVER) {
                if (primaryButton.contains(x, y)) startRun(); else state = STATE_MENU;
                return true;
            }
            if (pauseButton.contains(x, y)) { state = STATE_PAUSED; releaseControls(); return true; }
            if (dashButton.contains(x, y)) { dash(); return true; }
            if (healButton.contains(x, y)) { heal(); return true; }

            if (x < getWidth() * .48f && movePointerId < 0) {
                movePointerId = id; moveBaseX = moveTouchX = x; moveBaseY = moveTouchY = y; updateMoveVector();
            } else if (aimPointerId < 0) {
                aimPointerId = id; aimBaseX = aimTouchX = x; aimBaseY = aimTouchY = y; updateAimVector();
            }
            return true;
        }

        if (action == MotionEvent.ACTION_MOVE) {
            for (int i = 0; i < event.getPointerCount(); i++) {
                int id = event.getPointerId(i);
                if (id == movePointerId) { moveTouchX = event.getX(i); moveTouchY = event.getY(i); updateMoveVector(); }
                else if (id == aimPointerId) { aimTouchX = event.getX(i); aimTouchY = event.getY(i); updateAimVector(); }
            }
            return true;
        }

        if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_POINTER_UP || action == MotionEvent.ACTION_CANCEL) {
            int id = event.getPointerId(actionIndex);
            if (id == movePointerId) { movePointerId = -1; moveX = moveY = 0f; }
            if (id == aimPointerId) { aimPointerId = -1; aimX = aimY = 0f; }
            if (action == MotionEvent.ACTION_CANCEL) releaseControls();
            return true;
        }
        return true;
    }

    private void updateMoveVector() {
        float dx = moveTouchX - moveBaseX, dy = moveTouchY - moveBaseY, len = length(dx, dy);
        if (len > JOYSTICK_R) { dx = dx / len * JOYSTICK_R; dy = dy / len * JOYSTICK_R; }
        moveX = dx / JOYSTICK_R; moveY = dy / JOYSTICK_R;
    }

    private void updateAimVector() {
        float dx = aimTouchX - aimBaseX, dy = aimTouchY - aimBaseY, len = length(dx, dy);
        if (len > JOYSTICK_R) { dx = dx / len * JOYSTICK_R; dy = dy / len * JOYSTICK_R; }
        aimX = dx / JOYSTICK_R; aimY = dy / JOYSTICK_R;
    }

    private void releaseControls() {
        movePointerId = -1; aimPointerId = -1;
        moveX = moveY = aimX = aimY = 0f;
    }

    private void changeCritter(int delta) {
        selectedCritter = Math.floorMod(selectedCritter + delta, AssetLibrary.CRITTER_NAMES.length);
        persistLoadout(); hapticTick();
    }

    private void changeWeapon(int delta) {
        selectedWeapon = Math.floorMod(selectedWeapon + delta, AssetLibrary.WEAPON_NAMES.length);
        persistLoadout(); hapticTick();
    }

    private void changeArmor(int delta) {
        selectedArmor = Math.floorMod(selectedArmor + delta, AssetLibrary.ARMOR_NAMES.length);
        persistLoadout(); hapticTick();
    }

    private void hapticTick() { performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK); }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_BUTTON_START) {
            if (state == STATE_PLAYING) { state = STATE_PAUSED; releaseControls(); }
            else if (state == STATE_PAUSED) state = STATE_PLAYING;
            else if (state != STATE_MENU) state = STATE_MENU;
            return true;
        }
        if (state == STATE_PLAYING && keyCode == KeyEvent.KEYCODE_BUTTON_R1) { fireWeapon(); return true; }
        if (state == STATE_PLAYING && keyCode == KeyEvent.KEYCODE_BUTTON_A) { dash(); return true; }
        if (state == STATE_PLAYING && keyCode == KeyEvent.KEYCODE_BUTTON_B) { heal(); return true; }
        return super.onKeyDown(keyCode, event);
    }

    private void text(Canvas c, String value, float x, float y, float size, int color, Paint.Align align, boolean bold) {
        paint.setStyle(Paint.Style.FILL);
        paint.setTextSize(size);
        paint.setColor(color);
        paint.setTextAlign(align);
        paint.setTypeface(bold ? android.graphics.Typeface.DEFAULT_BOLD : android.graphics.Typeface.DEFAULT);
        c.drawText(value, x, y, paint);
    }

    private int critterColor(int index) {
        int[] colors = {0xffc58b5c, 0xffe77b4f, 0xffe8f6ff, 0xffff8fb5, 0xff9b704d, 0xffe7d7cf,
                0xffad8260, 0xff46515f, 0xff63c878, 0xff8f9ca7, 0xff8a6a50, 0xfff0f0ed, 0xff202935};
        return colors[Math.floorMod(index, colors.length)];
    }

    private int enemyColor(int variant) {
        int[] colors = {0xff9f6475, 0xff6c8f7b, 0xff8c754f, 0xff6e748e, 0xff8d6250};
        return colors[Math.floorMod(variant, colors.length)];
    }

    private static float length(float x, float y) { return (float) Math.sqrt(x * x + y * y); }
    private static float clamp(float v, float min, float max) { return Math.max(min, Math.min(max, v)); }
    private static int clampIndex(int value, int size) { return size <= 0 ? 0 : Math.floorMod(value, size); }

    private static final class Enemy {
        float x, y, radius, hp, maxHp, speed, damage, flash, attackCooldown;
        int variant;
        Enemy(float x, float y, float radius, float hp, float speed, float damage, int variant) {
            this.x = x; this.y = y; this.radius = radius; this.hp = hp; this.maxHp = hp;
            this.speed = speed; this.damage = damage; this.variant = variant;
        }
    }

    private static final class Bullet {
        float x, y, vx, vy, damage, life;
        int pierce;
        Bullet(float x, float y, float vx, float vy, float damage, float life, int pierce) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.damage = damage; this.life = life; this.pierce = pierce;
        }
    }

    private static final class Loot {
        float x, y; int value;
        Loot(float x, float y, int value) { this.x = x; this.y = y; this.value = value; }
    }

    private static final class Particle {
        float x, y, vx, vy, life; int color;
        Particle(float x, float y, float vx, float vy, float life, int color) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = life; this.color = color;
        }
    }
}
