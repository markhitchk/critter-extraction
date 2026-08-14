package com.harleystudios.critterextraction;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
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

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * Native Android gameplay renderer for Critter Extraction.
 * No WebView, HTML renderer, JavaScript engine, browser bridge, or network is used.
 */
public final class GameView extends View {
    private static final float WORLD_W = 3600f;
    private static final float WORLD_H = 2400f;
    private static final float PLAYER_SPEED = 360f;
    private static final float BULLET_SPEED = 980f;
    private static final float JOYSTICK_R = 104f;
    private static final float PLAYER_R = 34f;
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
    private final List<Enemy> enemies = new ArrayList<>();
    private final List<Bullet> bullets = new ArrayList<>();
    private final List<Loot> loot = new ArrayList<>();
    private final List<Particle> particles = new ArrayList<>();

    private final String[] critters = {
            "Puppy", "Fox", "Arctic Fox", "Axolotl", "Bear", "Bunny", "Capybara",
            "Crow", "Frog", "Kitty", "Otter", "Panda", "Penguin"
    };

    private Bitmap htgLogo;
    private int state = STATE_MENU;
    private int selectedCritter = 0;
    private int bestExtraction;
    private int totalPetals;
    private int lifetimeRuns;

    private float playerX = WORLD_W * .5f;
    private float playerY = WORLD_H * .5f;
    private float playerHp = 100f;
    private float lastAimX = 1f;
    private float lastAimY = 0f;
    private int carriedLoot = 0;
    private int runPetals = 0;
    private int medkits = 2;
    private float extractionProgress = 0f;
    private boolean extractionUnlocked = false;
    private final float extractionX = WORLD_W - 430f;
    private final float extractionY = 430f;
    private float spawnTimer = 0f;
    private float fireTimer = 0f;
    private float damageFlash = 0f;
    private float dashCooldown = 0f;
    private float playerInvulnerable = 0f;
    private long runStartMs = 0L;

    private long lastFrameNanos = 0L;
    private final long bootUntilMs = SystemClock.uptimeMillis() + 1150L;
    private boolean lifecycleRunning = true;

    private int movePointerId = -1;
    private int aimPointerId = -1;
    private float moveBaseX, moveBaseY, moveTouchX, moveTouchY;
    private float aimBaseX, aimBaseY, aimTouchX, aimTouchY;
    private float moveX = 0f, moveY = 0f;
    private float aimX = 0f, aimY = 0f;

    private final RectF pauseButton = new RectF();
    private final RectF dashButton = new RectF();
    private final RectF healButton = new RectF();
    private final RectF primaryButton = new RectF();
    private final RectF leftPicker = new RectF();
    private final RectF rightPicker = new RectF();

    public GameView(Context context) {
        super(context);
        setFocusable(true);
        setFocusableInTouchMode(true);
        requestFocus();
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(3f);
        prefs = context.getSharedPreferences("critter_native_save", Context.MODE_PRIVATE);
        selectedCritter = prefs.getInt("selected_critter", 0);
        bestExtraction = prefs.getInt("best_extraction", 0);
        totalPetals = prefs.getInt("petals", 0);
        lifetimeRuns = prefs.getInt("runs", 0);
        try (InputStream in = context.getAssets().open("HTG.png")) {
            htgLogo = BitmapFactory.decodeStream(in);
        } catch (IOException ignored) {
            htgLogo = null;
        }
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
        dt = Math.min(dt, 0.033f);
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
        if (moveLen > 0.05f) {
            float nx = moveX / Math.max(1f, moveLen);
            float ny = moveY / Math.max(1f, moveLen);
            float speedScale = Math.min(1f, moveLen);
            playerX = clamp(playerX + nx * PLAYER_SPEED * speedScale * dt, PLAYER_R, WORLD_W - PLAYER_R);
            playerY = clamp(playerY + ny * PLAYER_SPEED * speedScale * dt, PLAYER_R, WORLD_H - PLAYER_R);
        }

        float aimLen = length(aimX, aimY);
        if (aimLen > .23f) {
            lastAimX = aimX / aimLen;
            lastAimY = aimY / aimLen;
            if (fireTimer <= 0f) {
                fireBullet(lastAimX, lastAimY);
                fireTimer = .145f;
            }
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
                playerHp -= e.damage;
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
                        remove = true;
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

    private void startRun() {
        state = STATE_PLAYING;
        playerX = WORLD_W * .5f;
        playerY = WORLD_H * .5f;
        playerHp = 100f;
        carriedLoot = 0;
        runPetals = 0;
        medkits = 2;
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
        prefs.edit().putInt("selected_critter", selectedCritter).putInt("best_extraction", bestExtraction)
                .putInt("petals", totalPetals).putInt("runs", lifetimeRuns).apply();
    }

    private void fireBullet(float nx, float ny) {
        bullets.add(new Bullet(playerX + nx * (PLAYER_R + 15f), playerY + ny * (PLAYER_R + 15f),
                nx * BULLET_SPEED, ny * BULLET_SPEED, 34f, 1.2f));
    }

    private void dash() {
        if (state != STATE_PLAYING || dashCooldown > 0f) return;
        float dx = moveX, dy = moveY;
        float len = length(dx, dy);
        if (len < .15f) { dx = lastAimX; dy = lastAimY; len = Math.max(.01f, length(dx, dy)); }
        dx /= len; dy /= len;
        playerX = clamp(playerX + dx * 250f, PLAYER_R, WORLD_W - PLAYER_R);
        playerY = clamp(playerY + dy * 250f, PLAYER_R, WORLD_H - PLAYER_R);
        dashCooldown = 2.25f;
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
                8f + random.nextFloat() * 6f, random.nextInt(5)));
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
        c.drawColor(Color.rgb(5, 13, 18));
        float w = getWidth(), h = getHeight();
        if (htgLogo != null) {
            float maxW = Math.min(w * .22f, 260f);
            float ratio = htgLogo.getHeight() / (float) htgLogo.getWidth();
            RectF dst = new RectF(w * .5f - maxW * .5f, h * .24f, w * .5f + maxW * .5f, h * .24f + maxW * ratio);
            c.drawBitmap(htgLogo, null, dst, paint);
        } else drawCritter(c, w * .5f, h * .34f, 1.5f, 0xff59d7ff, 1);
        text(c, "CRITTER EXTRACTION", w * .5f, h * .62f, 40f, 0xffeaf8ff, Paint.Align.CENTER, true);
        text(c, "NATIVE ANDROID", w * .5f, h * .69f, 17f, 0xff59d7ff, Paint.Align.CENTER, true);
        float p = clamp(1f - (bootUntilMs - SystemClock.uptimeMillis()) / 1150f, 0f, 1f);
        RectF bar = new RectF(w * .5f - 150f, h * .77f, w * .5f + 150f, h * .77f + 7f);
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
        text(c, "CRITTER EXTRACTION", w * .5f, 76f, 38f, 0xfff2fbff, Paint.Align.CENTER, true);
        text(c, "ANDROID 14+ • OFFLINE NATIVE BUILD", w * .5f, 108f, 14f, 0xff68d9ff, Paint.Align.CENTER, true);
        float cardW = Math.min(560f, w * .54f);
        RectF card = new RectF(w * .5f - cardW * .5f, h * .19f, w * .5f + cardW * .5f, h * .65f);
        paint.setColor(0xff0d1d24); c.drawRoundRect(card, 28f, 28f, paint);
        stroke.setColor(0xff245163); stroke.setStrokeWidth(3f); c.drawRoundRect(card, 28f, 28f, stroke);
        drawCritter(c, w * .5f, card.top + card.height() * .42f, 1.45f, critterColor(selectedCritter), selectedCritter);
        text(c, critters[selectedCritter].toUpperCase(Locale.US), w * .5f, card.bottom - 44f, 23f, 0xfff0fbff, Paint.Align.CENTER, true);
        leftPicker.set(card.left + 20f, card.centerY() - 38f, card.left + 86f, card.centerY() + 38f);
        rightPicker.set(card.right - 86f, card.centerY() - 38f, card.right - 20f, card.centerY() + 38f);
        drawArrow(c, leftPicker, false); drawArrow(c, rightPicker, true);
        primaryButton.set(w * .5f - 170f, h * .71f, w * .5f + 170f, h * .71f + 70f);
        paint.setColor(0xff59d7ff); c.drawRoundRect(primaryButton, 22f, 22f, paint);
        text(c, "DEPLOY", primaryButton.centerX(), primaryButton.centerY() + 8f, 24f, 0xff041017, Paint.Align.CENTER, true);
        text(c, "Best extraction  " + bestExtraction + "   •   Petals  " + totalPetals + "   •   Runs  " + lifetimeRuns,
                w * .5f, h - 28f, 14f, 0xff9eb7c2, Paint.Align.CENTER, false);
    }

    private void drawWorld(Canvas c) {
        c.drawColor(0xff071117);
        float camX = clamp(playerX - getWidth() * .5f, 0f, Math.max(0f, WORLD_W - getWidth()));
        float camY = clamp(playerY - getHeight() * .5f, 0f, Math.max(0f, WORLD_H - getHeight()));
        c.save(); c.translate(-camX, -camY); drawGround(c, camX, camY);
        if (extractionUnlocked) drawExtractionZone(c);
        for (Loot l : loot) drawLoot(c, l);
        for (Enemy e : enemies) drawEnemy(c, e);
        for (Bullet b : bullets) {
            paint.setColor(0xffa8efff); c.drawCircle(b.x, b.y, 8f, paint);
            stroke.setColor(0x7059d7ff); stroke.setStrokeWidth(8f);
            c.drawLine(b.x - b.vx * .025f, b.y - b.vy * .025f, b.x, b.y, stroke);
        }
        for (Particle p : particles) {
            int alpha = (int) (255f * clamp(p.life / .55f, 0f, 1f));
            paint.setColor((p.color & 0x00ffffff) | (alpha << 24)); c.drawCircle(p.x, p.y, 4f, paint);
        }
        if (playerInvulnerable <= 0f || ((int) (SystemClock.uptimeMillis() / 55L) & 1) == 0) {
            drawCritter(c, playerX, playerY, 1f, critterColor(selectedCritter), selectedCritter);
            paint.setColor(0xffd9f6ff); paint.setStrokeWidth(5f);
            c.drawLine(playerX + lastAimX * 22f, playerY + lastAimY * 22f,
                    playerX + lastAimX * 57f, playerY + lastAimY * 57f, paint);
        }
        c.restore();
        if (damageFlash > 0f) { paint.setColor(0x48ff354f); c.drawRect(0f, 0f, getWidth(), getHeight(), paint); }
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
        RectF hp = new RectF(hpBg.left + 3f, hpBg.top + 3f, hpBg.left + 3f + (hpBg.width() - 6f) * (playerHp / 100f), hpBg.bottom - 3f);
        paint.setColor(playerHp > 35f ? 0xff57e389 : 0xffff5c6c); c.drawRoundRect(hp, 10f, 10f, paint);
        text(c, Math.round(playerHp) + " HP", hpBg.left + 10f, 72f, 13f, 0xffe7f7fc, Paint.Align.LEFT, true);
        String objective = extractionUnlocked ? "EXTRACTION OPEN • HOLD ZONE " + Math.min(100, Math.round(extractionProgress / 3f * 100f)) + "%" : "LOOT " + carriedLoot + "/" + LOOT_TO_EXTRACT;
        text(c, objective, w * .5f, 42f, 17f, extractionUnlocked ? 0xff57e389 : 0xffffd166, Paint.Align.CENTER, true);
        text(c, "RUN +" + runPetals + " PETALS", w * .5f, 67f, 12f, 0xff9eb7c2, Paint.Align.CENTER, false);
        pauseButton.set(w - 76f, 20f, w - 20f, 76f);
        paint.setColor(0xbb0b171d); c.drawRoundRect(pauseButton, 16f, 16f, paint);
        stroke.setColor(0xff3f6978); stroke.setStrokeWidth(2f); c.drawRoundRect(pauseButton, 16f, 16f, stroke);
        paint.setColor(0xffd8eef5);
        c.drawRect(pauseButton.centerX() - 10f, pauseButton.centerY() - 12f, pauseButton.centerX() - 3f, pauseButton.centerY() + 12f, paint);
        c.drawRect(pauseButton.centerX() + 3f, pauseButton.centerY() - 12f, pauseButton.centerX() + 10f, pauseButton.centerY() + 12f, paint);
        float dmX = 145f, dmY = h - 145f, daX = w - 145f, daY = h - 145f;
        drawJoystick(c, movePointerId >= 0 ? moveBaseX : dmX, movePointerId >= 0 ? moveBaseY : dmY,
                movePointerId >= 0 ? moveTouchX : dmX, movePointerId >= 0 ? moveTouchY : dmY, movePointerId >= 0, "MOVE");
        drawJoystick(c, aimPointerId >= 0 ? aimBaseX : daX, aimPointerId >= 0 ? aimBaseY : daY,
                aimPointerId >= 0 ? aimTouchX : daX, aimPointerId >= 0 ? aimTouchY : daY, aimPointerId >= 0, "AIM/FIRE");
        dashButton.set(w - 150f, h - 370f, w - 50f, h - 270f);
        healButton.set(w - 275f, h - 335f, w - 185f, h - 245f);
        drawActionButton(c, dashButton, "DASH", dashCooldown <= 0f, dashCooldown <= 0f ? "READY" : String.format(Locale.US, "%.1f", dashCooldown));
        drawActionButton(c, healButton, "MED", medkits > 0 && playerHp < 100f, String.valueOf(medkits));
    }

    private void drawJoystick(Canvas c, float bx, float by, float tx, float ty, boolean active, String label) {
        paint.setColor(active ? 0x3d59d7ff : 0x221c758f); c.drawCircle(bx, by, JOYSTICK_R, paint);
        stroke.setColor(active ? 0x9959d7ff : 0x553a7d90); stroke.setStrokeWidth(3f); c.drawCircle(bx, by, JOYSTICK_R, stroke);
        float dx = tx - bx, dy = ty - by, len = length(dx, dy);
        if (len > JOYSTICK_R) { dx = dx / len * JOYSTICK_R; dy = dy / len * JOYSTICK_R; }
        paint.setColor(active ? 0xaa9eeeff : 0x664d9db2); c.drawCircle(bx + dx, by + dy, 42f, paint);
        text(c, label, bx, by + JOYSTICK_R + 24f, 11f, 0x999fd0dc, Paint.Align.CENTER, true);
    }

    private void drawActionButton(Canvas c, RectF r, String title, boolean enabled, String sub) {
        paint.setColor(enabled ? 0xc9245363 : 0x99202a2f); c.drawOval(r, paint);
        stroke.setColor(enabled ? 0xff59d7ff : 0xff46565d); stroke.setStrokeWidth(2f); c.drawOval(r, stroke);
        text(c, title, r.centerX(), r.centerY() - 1f, 14f, enabled ? 0xffe3f9ff : 0xff768b93, Paint.Align.CENTER, true);
        text(c, sub, r.centerX(), r.centerY() + 18f, 9f, enabled ? 0xff8edff7 : 0xff667a82, Paint.Align.CENTER, false);
    }

    private void drawPauseOverlay(Canvas c) {
        paint.setColor(0xc8000000); c.drawRect(0f, 0f, getWidth(), getHeight(), paint);
        float w = getWidth(), h = getHeight();
        text(c, "PAUSED", w * .5f, h * .37f, 42f, 0xffffffff, Paint.Align.CENTER, true);
        text(c, "Tap to continue", w * .5f, h * .45f, 18f, 0xff9fc4d2, Paint.Align.CENTER, false);
        primaryButton.set(w * .5f - 150f, h * .54f, w * .5f + 150f, h * .54f + 64f);
        paint.setColor(0xff59d7ff); c.drawRoundRect(primaryButton, 20f, 20f, paint);
        text(c, "RESUME", primaryButton.centerX(), primaryButton.centerY() + 7f, 20f, 0xff041017, Paint.Align.CENTER, true);
    }

    private void drawEndOverlay(Canvas c, boolean success) {
        paint.setColor(0xd6070b0e); c.drawRect(0f, 0f, getWidth(), getHeight(), paint);
        float w = getWidth(), h = getHeight();
        text(c, success ? "EXTRACTION COMPLETE" : "RUN LOST", w * .5f, h * .31f, 38f,
                success ? 0xff57e389 : 0xffff6b6b, Paint.Align.CENTER, true);
        text(c, "Loot " + carriedLoot + "   •   +" + runPetals + " petals", w * .5f, h * .40f, 18f, 0xffd8edf5, Paint.Align.CENTER, false);
        primaryButton.set(w * .5f - 160f, h * .51f, w * .5f + 160f, h * .51f + 68f);
        paint.setColor(0xff59d7ff); c.drawRoundRect(primaryButton, 21f, 21f, paint);
        text(c, "DEPLOY AGAIN", primaryButton.centerX(), primaryButton.centerY() + 7f, 19f, 0xff041017, Paint.Align.CENTER, true);
        text(c, "Tap outside the button for loadout", w * .5f, h * .67f, 13f, 0xff8aa8b4, Paint.Align.CENTER, false);
    }

    private void drawEnemy(Canvas c, Enemy e) {
        int color = e.flash > 0f ? 0xffffffff : enemyColor(e.variant);
        drawCritter(c, e.x, e.y, e.radius / PLAYER_R, color, e.variant + 3);
        float hpW = e.radius * 2.1f;
        RectF bg = new RectF(e.x - hpW * .5f, e.y - e.radius - 21f, e.x + hpW * .5f, e.y - e.radius - 15f);
        paint.setColor(0xaa000000); c.drawRoundRect(bg, 3f, 3f, paint);
        paint.setColor(0xffff6b6b); c.drawRoundRect(new RectF(bg.left, bg.top, bg.left + bg.width() * clamp(e.hp / e.maxHp, 0f, 1f), bg.bottom), 3f, 3f, paint);
    }

    private void drawLoot(Canvas c, Loot l) {
        float pulse = 1f + .09f * (float) Math.sin(SystemClock.uptimeMillis() * .008 + l.x);
        paint.setColor(0x33ffd166); c.drawCircle(l.x, l.y, 34f * pulse, paint);
        paint.setColor(0xffffd166);
        Path d = new Path(); d.moveTo(l.x, l.y - 15f * pulse); d.lineTo(l.x + 14f * pulse, l.y);
        d.lineTo(l.x, l.y + 15f * pulse); d.lineTo(l.x - 14f * pulse, l.y); d.close(); c.drawPath(d, paint);
        text(c, "+" + l.value, l.x, l.y + 42f, 11f, 0xffffe69a, Paint.Align.CENTER, true);
    }

    private void drawCritter(Canvas c, float x, float y, float scale, int color, int variant) {
        float s = 30f * scale;
        int dark = darken(color, .58f), light = lighten(color, .22f);
        paint.setColor(dark); c.drawOval(new RectF(x - s * .82f, y - s * .12f, x + s * .88f, y + s * 1.20f), paint);
        paint.setColor(color); c.drawCircle(x, y, s, paint); c.drawOval(new RectF(x - s * .72f, y + s * .35f, x + s * .72f, y + s * 1.13f), paint);
        if ((variant % 4) == 0) {
            Path le = new Path(); le.moveTo(x - s * .74f, y - s * .55f); le.lineTo(x - s * .30f, y - s * 1.15f); le.lineTo(x - s * .06f, y - s * .48f); le.close();
            Path re = new Path(); re.moveTo(x + s * .74f, y - s * .55f); re.lineTo(x + s * .30f, y - s * 1.15f); re.lineTo(x + s * .06f, y - s * .48f); re.close();
            paint.setColor(color); c.drawPath(le, paint); c.drawPath(re, paint);
        } else {
            paint.setColor(dark); c.drawOval(new RectF(x - s * .92f, y - s * .80f, x - s * .36f, y - s * .08f), paint);
            c.drawOval(new RectF(x + s * .36f, y - s * .80f, x + s * .92f, y - s * .08f), paint);
        }
        paint.setColor(light); c.drawOval(new RectF(x - s * .52f, y + s * .03f, x + s * .52f, y + s * .62f), paint);
        paint.setColor(0xff071117); c.drawCircle(x - s * .34f, y - s * .18f, s * .11f, paint); c.drawCircle(x + s * .34f, y - s * .18f, s * .11f, paint); c.drawCircle(x, y + s * .12f, s * .10f, paint);
        stroke.setColor(0xff071117); stroke.setStrokeWidth(Math.max(2f, 2.6f * scale));
        c.drawLine(x, y + s * .19f, x - s * .15f, y + s * .32f, stroke); c.drawLine(x, y + s * .19f, x + s * .15f, y + s * .32f, stroke);
    }

    private void drawArrow(Canvas c, RectF r, boolean right) {
        paint.setColor(0xff173541); c.drawRoundRect(r, 18f, 18f, paint);
        Path p = new Path();
        if (right) { p.moveTo(r.centerX() - 8f, r.centerY() - 14f); p.lineTo(r.centerX() + 9f, r.centerY()); p.lineTo(r.centerX() - 8f, r.centerY() + 14f); }
        else { p.moveTo(r.centerX() + 8f, r.centerY() - 14f); p.lineTo(r.centerX() - 9f, r.centerY()); p.lineTo(r.centerX() + 8f, r.centerY() + 14f); }
        p.close(); paint.setColor(0xff8ee6ff); c.drawPath(p, paint);
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        int action = event.getActionMasked(), actionIndex = event.getActionIndex();
        if (SystemClock.uptimeMillis() < bootUntilMs) return true;
        if (action == MotionEvent.ACTION_DOWN || action == MotionEvent.ACTION_POINTER_DOWN) {
            float x = event.getX(actionIndex), y = event.getY(actionIndex); int id = event.getPointerId(actionIndex);
            if (state == STATE_MENU) {
                if (primaryButton.contains(x, y)) startRun();
                else if (leftPicker.contains(x, y)) changeCritter(-1);
                else if (rightPicker.contains(x, y)) changeCritter(1);
                return true;
            }
            if (state == STATE_PAUSED) { state = STATE_PLAYING; lastFrameNanos = 0L; performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK); return true; }
            if (state == STATE_SUCCESS || state == STATE_GAME_OVER) { if (primaryButton.contains(x, y)) startRun(); else state = STATE_MENU; return true; }
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

    private void releaseControls() { movePointerId = -1; aimPointerId = -1; moveX = moveY = aimX = aimY = 0f; }

    private void changeCritter(int delta) {
        selectedCritter = (selectedCritter + delta + critters.length) % critters.length;
        prefs.edit().putInt("selected_critter", selectedCritter).apply();
        performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_BUTTON_START) {
            if (state == STATE_PLAYING) { state = STATE_PAUSED; releaseControls(); }
            else if (state == STATE_PAUSED) state = STATE_PLAYING;
            else if (state != STATE_MENU) state = STATE_MENU;
            return true;
        }
        if (state == STATE_PLAYING && keyCode == KeyEvent.KEYCODE_BUTTON_R1) { fireBullet(lastAimX, lastAimY); return true; }
        if (state == STATE_PLAYING && keyCode == KeyEvent.KEYCODE_BUTTON_A) { dash(); return true; }
        return super.onKeyDown(keyCode, event);
    }

    private void text(Canvas c, String value, float x, float y, float size, int color, Paint.Align align, boolean bold) {
        paint.setStyle(Paint.Style.FILL); paint.setTextSize(size); paint.setColor(color); paint.setTextAlign(align);
        paint.setTypeface(bold ? android.graphics.Typeface.DEFAULT_BOLD : android.graphics.Typeface.DEFAULT); c.drawText(value, x, y, paint);
    }

    private int critterColor(int index) {
        int[] colors = {0xffc58b5c, 0xffe77b4f, 0xffe8f6ff, 0xffff8fb5, 0xff9b704d, 0xffe7d7cf, 0xffad8260, 0xff46515f, 0xff63c878, 0xff8f9ca7, 0xff8a6a50, 0xfff0f0ed, 0xff202935};
        return colors[Math.floorMod(index, colors.length)];
    }

    private int enemyColor(int variant) {
        int[] colors = {0xff9f6475, 0xff6c8f7b, 0xff8c754f, 0xff6e748e, 0xff8d6250};
        return colors[Math.floorMod(variant, colors.length)];
    }

    private static float length(float x, float y) { return (float) Math.sqrt(x * x + y * y); }
    private static float clamp(float v, float min, float max) { return Math.max(min, Math.min(max, v)); }
    private static int darken(int color, float factor) { return Color.rgb(Math.round(Color.red(color) * factor), Math.round(Color.green(color) * factor), Math.round(Color.blue(color) * factor)); }
    private static int lighten(int color, float amount) {
        int r = Color.red(color) + Math.round((255 - Color.red(color)) * amount);
        int g = Color.green(color) + Math.round((255 - Color.green(color)) * amount);
        int b = Color.blue(color) + Math.round((255 - Color.blue(color)) * amount);
        return Color.rgb(r, g, b);
    }

    private static final class Enemy {
        float x, y, radius, hp, maxHp, speed, damage, flash, attackCooldown; int variant;
        Enemy(float x, float y, float radius, float hp, float speed, float damage, int variant) {
            this.x = x; this.y = y; this.radius = radius; this.hp = hp; this.maxHp = hp; this.speed = speed; this.damage = damage; this.variant = variant;
        }
    }
    private static final class Bullet {
        float x, y, vx, vy, damage, life;
        Bullet(float x, float y, float vx, float vy, float damage, float life) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.damage = damage; this.life = life; }
    }
    private static final class Loot { float x, y; int value; Loot(float x, float y, int value) { this.x = x; this.y = y; this.value = value; } }
    private static final class Particle {
        float x, y, vx, vy, life; int color;
        Particle(float x, float y, float vx, float vy, float life, int color) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = life; this.color = color; }
    }
}
