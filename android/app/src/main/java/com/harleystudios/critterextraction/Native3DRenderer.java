package com.harleystudios.critterextraction;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.opengl.GLES30;
import android.opengl.GLSurfaceView;
import android.opengl.Matrix;
import android.os.SystemClock;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * Native OpenGL ES 3 renderer for Critter Extraction.
 * The renderer ports the repository's procedural critter recipes into Android Java.
 * No WebView, HTML page, JavaScript engine, or network runtime is used.
 */
public final class Native3DRenderer implements GLSurfaceView.Renderer {
    private static final float WORLD = 34f;
    private static final float SPEED = 5.7f;
    private static final int LOOT_GOAL = 8;

    private static final float[] WEAPON_DAMAGE = {26f, 19f, 44f, 31f, 62f};
    private static final float[] WEAPON_COOLDOWN = {.20f, .105f, .58f, .25f, .82f};
    private static final float[] WEAPON_SPEED = {15f, 17f, 14f, 18f, 20f};
    private static final int[] WEAPON_COLORS = {
            0xff75d06f, 0xffb78450, 0xffff8c4b, 0xffffc84f, 0xffbd79ff
    };
    private static final String[] WEAPONS = {
            "Pea Popper", "Acorn Sprayer", "Carrot Scatter", "Honey Carbine", "Moonbeam"
    };

    private final SharedPreferences prefs;
    private final Random random = new Random(62);
    private final List<Enemy> enemies = new ArrayList<>();
    private final List<Bullet> bullets = new ArrayList<>();
    private final List<Loot> loot = new ArrayList<>();

    private final float[] projection = new float[16];
    private final float[] view = new float[16];
    private final float[] vp = new float[16];
    private final float[] model = new float[16];
    private final float[] mvp = new float[16];

    private MeshFactory3D.Mesh cube;
    private MeshFactory3D.Mesh sphere;
    private MeshFactory3D.Mesh cylinder;
    private MeshFactory3D.Mesh cone;

    private int program;
    private int aPos;
    private int aNormal;
    private int uMvp;
    private int uModel;
    private int uColor;
    private int uCamera;

    private int width;
    private int height;
    private long lastNs;

    private volatile float moveX;
    private volatile float moveY;
    private volatile float aimX;
    private volatile float aimY;
    private volatile boolean running = true;
    private volatile boolean firstPerson;
    private volatile int speciesIndex;
    private volatile int weaponIndex;
    private volatile float hp = 100f;
    private volatile int carriedLoot;
    private volatile int medkits = 2;
    private volatile int petals;
    private volatile String banner = "DROP IN • LOOT • EXTRACT";

    private float playerX;
    private float playerZ = 8f;
    private float lastAimX;
    private float lastAimZ = -1f;
    private float fireCd;
    private float dashCd;
    private float spawnCd = .5f;
    private float extractProgress;
    private final float extractX = -22f;
    private final float extractZ = -21f;
    private long bannerUntil;

    public Native3DRenderer(Context context) {
        prefs = context.getSharedPreferences("critter_native_3d", Context.MODE_PRIVATE);
        speciesIndex = Math.floorMod(prefs.getInt("species", 0), SpeciesCatalog3D.ALL.length);
        weaponIndex = Math.floorMod(prefs.getInt("weapon", 0), WEAPONS.length);
        petals = prefs.getInt("petals", 0);
        resetRun();
    }

    @Override
    public void onSurfaceCreated(javax.microedition.khronos.opengles.GL10 gl,
                                 javax.microedition.khronos.egl.EGLConfig config) {
        GLES30.glClearColor(.018f, .045f, .055f, 1f);
        GLES30.glEnable(GLES30.GL_DEPTH_TEST);
        GLES30.glEnable(GLES30.GL_BLEND);
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA);

        program = buildProgram(VS, FS);
        aPos = GLES30.glGetAttribLocation(program, "aPos");
        aNormal = GLES30.glGetAttribLocation(program, "aNormal");
        uMvp = GLES30.glGetUniformLocation(program, "uMvp");
        uModel = GLES30.glGetUniformLocation(program, "uModel");
        uColor = GLES30.glGetUniformLocation(program, "uColor");
        uCamera = GLES30.glGetUniformLocation(program, "uCamera");

        cube = MeshFactory3D.cube();
        sphere = MeshFactory3D.sphere(7, 10);
        cylinder = MeshFactory3D.cylinder(10);
        cone = MeshFactory3D.cone(10);
        lastNs = 0L;
    }

    @Override
    public void onSurfaceChanged(javax.microedition.khronos.opengles.GL10 gl, int w, int h) {
        width = Math.max(1, w);
        height = Math.max(1, h);
        GLES30.glViewport(0, 0, width, height);
        Matrix.perspectiveM(projection, 0, 62f, width / (float) height, .08f, 110f);
    }

    @Override
    public void onDrawFrame(javax.microedition.khronos.opengles.GL10 gl) {
        long now = System.nanoTime();
        float dt = lastNs == 0L ? 0f : Math.min(.033f, (now - lastNs) / 1_000_000_000f);
        lastNs = now;
        if (running && dt > 0f) update(dt);

        GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT | GLES30.GL_DEPTH_BUFFER_BIT);
        GLES30.glUseProgram(program);
        setupCamera();

        drawWorld();
        drawLoot();
        drawBullets();
        drawEnemies();
        drawPlayer();
        drawExtraction();
    }

    private void setupCamera() {
        float eyeX;
        float eyeY;
        float eyeZ;
        float targetX;
        float targetZ;

        if (firstPerson) {
            eyeX = playerX + lastAimX * .12f;
            eyeY = 2.28f;
            eyeZ = playerZ + lastAimZ * .12f;
            targetX = playerX + lastAimX * 7f;
            targetZ = playerZ + lastAimZ * 7f;
        } else {
            eyeX = playerX - lastAimX * 6.3f;
            eyeY = 5.0f;
            eyeZ = playerZ - lastAimZ * 6.3f;
            targetX = playerX + lastAimX * 1.2f;
            targetZ = playerZ + lastAimZ * 1.2f;
        }

        Matrix.setLookAtM(view, 0, eyeX, eyeY, eyeZ, targetX, 1.35f, targetZ, 0f, 1f, 0f);
        Matrix.multiplyMM(vp, 0, projection, 0, view, 0);
        GLES30.glUniform3f(uCamera, eyeX, eyeY, eyeZ);
    }

    private void update(float dt) {
        fireCd = Math.max(0f, fireCd - dt);
        dashCd = Math.max(0f, dashCd - dt);
        spawnCd -= dt;

        float moveLength = (float) Math.hypot(moveX, moveY);
        if (moveLength > .05f) {
            float dx = moveX / moveLength;
            float dz = moveY / moveLength;
            playerX = clamp(playerX + dx * SPEED * dt, -WORLD, WORLD);
            playerZ = clamp(playerZ + dz * SPEED * dt, -WORLD, WORLD);
        }

        float aimLength = (float) Math.hypot(aimX, aimY);
        if (aimLength > .18f) {
            lastAimX = aimX / aimLength;
            lastAimZ = aimY / aimLength;
            if (fireCd <= 0f) {
                fire();
                fireCd = WEAPON_COOLDOWN[weaponIndex];
            }
        }

        if (spawnCd <= 0f && enemies.size() < 14) {
            spawnEnemy();
            spawnCd = .85f;
        }

        for (Enemy enemy : enemies) {
            float dx = playerX - enemy.x;
            float dz = playerZ - enemy.z;
            float d = Math.max(.01f, (float) Math.hypot(dx, dz));
            enemy.x += dx / d * enemy.speed * dt;
            enemy.z += dz / d * enemy.speed * dt;
            enemy.attack -= dt;

            if (d < 1.05f && enemy.attack <= 0f) {
                hp -= 7f + (enemy.species % 4);
                enemy.attack = .72f;
                if (hp <= 0f) {
                    banner("RUN LOST", 1600);
                    resetRun();
                    break;
                }
            }
        }

        Iterator<Bullet> bulletIterator = bullets.iterator();
        while (bulletIterator.hasNext()) {
            Bullet bullet = bulletIterator.next();
            bullet.x += bullet.vx * dt;
            bullet.z += bullet.vz * dt;
            bullet.life -= dt;
            boolean remove = bullet.life <= 0f;

            if (!remove) {
                for (Enemy enemy : enemies) {
                    if (enemy.hp <= 0f) continue;
                    float dx = bullet.x - enemy.x;
                    float dz = bullet.z - enemy.z;
                    if (dx * dx + dz * dz < .75f * .75f) {
                        enemy.hp -= bullet.damage;
                        remove = true;
                        break;
                    }
                }
            }
            if (remove) bulletIterator.remove();
        }

        Iterator<Enemy> enemyIterator = enemies.iterator();
        while (enemyIterator.hasNext()) {
            Enemy enemy = enemyIterator.next();
            if (enemy.hp <= 0f) {
                loot.add(new Loot(enemy.x, enemy.z, 1 + random.nextInt(3)));
                petals = Math.min(1_000_000, petals + 5 + random.nextInt(9));
                enemyIterator.remove();
            }
        }

        Iterator<Loot> lootIterator = loot.iterator();
        while (lootIterator.hasNext()) {
            Loot drop = lootIterator.next();
            float dx = playerX - drop.x;
            float dz = playerZ - drop.z;
            if (dx * dx + dz * dz < 1.25f * 1.25f) {
                carriedLoot += drop.value;
                lootIterator.remove();
                if (carriedLoot >= LOOT_GOAL) banner("EXTRACTION OPEN", 1300);
            }
        }

        if (carriedLoot >= LOOT_GOAL) {
            float dx = playerX - extractX;
            float dz = playerZ - extractZ;
            if (dx * dx + dz * dz < 3.1f * 3.1f) {
                extractProgress += dt;
                if (extractProgress >= 3f) {
                    int reward = carriedLoot * 12;
                    petals = Math.min(1_000_000, petals + reward);
                    prefs.edit().putInt("petals", petals).apply();
                    banner("EXTRACTED! +" + reward + " PETALS", 1800);
                    resetRun();
                }
            } else {
                extractProgress = Math.max(0f, extractProgress - dt * 1.5f);
            }
        }

        if (bannerUntil > 0L && SystemClock.uptimeMillis() > bannerUntil) {
            bannerUntil = 0L;
            banner = carriedLoot >= LOOT_GOAL ? "REACH GREEN EXTRACTION" : "LOOT " + carriedLoot + "/8";
        }
    }

    private void resetRun() {
        playerX = 0f;
        playerZ = 8f;
        hp = 100f;
        carriedLoot = 0;
        medkits = 2;
        extractProgress = 0f;
        enemies.clear();
        bullets.clear();
        loot.clear();
        for (int i = 0; i < 7; i++) spawnEnemy();
    }

    private void spawnEnemy() {
        double angle = random.nextDouble() * Math.PI * 2.0;
        float distance = 10f + random.nextFloat() * 14f;
        float x = clamp(playerX + (float) Math.sin(angle) * distance, -WORLD + 2f, WORLD - 2f);
        float z = clamp(playerZ + (float) Math.cos(angle) * distance, -WORLD + 2f, WORLD - 2f);
        int species = (speciesIndex + 3 + random.nextInt(SpeciesCatalog3D.ALL.length - 1)) % SpeciesCatalog3D.ALL.length;
        enemies.add(new Enemy(x, z, species, 55f + random.nextFloat() * 42f, 2f + random.nextFloat() * 1.4f));
    }

    private void fire() {
        float spread = weaponIndex == 2 ? .16f : weaponIndex == 1 ? .055f : .018f;
        int count = weaponIndex == 2 ? 5 : 1;
        for (int i = 0; i < count; i++) {
            float angle = (float) Math.atan2(lastAimX, -lastAimZ) + (i - (count - 1) / 2f) * spread;
            float dx = (float) Math.sin(angle);
            float dz = -(float) Math.cos(angle);
            bullets.add(new Bullet(
                    playerX + dx * .9f,
                    1.55f,
                    playerZ + dz * .9f,
                    dx * WEAPON_SPEED[weaponIndex],
                    dz * WEAPON_SPEED[weaponIndex],
                    WEAPON_DAMAGE[weaponIndex],
                    1.8f
            ));
        }
    }

    public void setInput(float mx, float my, float ax, float ay) {
        moveX = mx;
        moveY = my;
        aimX = ax;
        aimY = ay;
    }

    public void setRunning(boolean value) {
        running = value;
        lastNs = 0L;
    }

    public void toggleCamera() {
        firstPerson = !firstPerson;
        banner(firstPerson ? "FIRST PERSON" : "THIRD PERSON", 900);
    }

    public void nextSpecies() {
        speciesIndex = (speciesIndex + 1) % SpeciesCatalog3D.ALL.length;
        prefs.edit().putInt("species", speciesIndex).apply();
        banner(SpeciesCatalog3D.ALL[speciesIndex].name.toUpperCase(Locale.US), 900);
    }

    public void nextWeapon() {
        weaponIndex = (weaponIndex + 1) % WEAPONS.length;
        prefs.edit().putInt("weapon", weaponIndex).apply();
        banner(WEAPONS[weaponIndex].toUpperCase(Locale.US), 900);
    }

    public void dash() {
        if (dashCd > 0f) return;
        boolean hasMove = Math.abs(moveX) + Math.abs(moveY) > .15f;
        float dx = hasMove ? moveX : lastAimX;
        float dz = hasMove ? moveY : lastAimZ;
        float length = Math.max(.01f, (float) Math.hypot(dx, dz));
        playerX = clamp(playerX + dx / length * 3.5f, -WORLD, WORLD);
        playerZ = clamp(playerZ + dz / length * 3.5f, -WORLD, WORLD);
        dashCd = 2.2f;
    }

    public void heal() {
        if (medkits <= 0 || hp >= 99f) return;
        medkits--;
        hp = Math.min(100f, hp + 42f);
        banner("MEDKIT +42", 750);
    }

    private void banner(String message, long durationMs) {
        banner = message;
        bannerUntil = SystemClock.uptimeMillis() + durationMs;
    }

    public String status() {
        SpeciesCatalog3D.Species species = SpeciesCatalog3D.ALL[speciesIndex];
        String extraction = carriedLoot >= LOOT_GOAL
                ? "   Extract " + Math.round(extractProgress / 3f * 100f) + "%"
                : "";
        return species.name + " • " + species.role + "\n"
                + WEAPONS[weaponIndex] + "   HP " + Math.round(hp)
                + "   Loot " + carriedLoot + "/8   Med " + medkits + "   Petals " + petals + "\n"
                + banner + extraction;
    }

    private void drawWorld() {
        draw(cube, 0f, -.18f, 0f, WORLD * 2f + .5f, .36f, WORLD * 2f + .5f,
                0xff183e36, 0f, 0f, 0f);

        for (int i = 0; i < 28; i++) {
            float x = -30f + (i * 13 % 59);
            float z = -28f + (i * 19 % 57);
            if (Math.hypot(x - playerX, z - playerZ) < 3f) continue;
            draw(cylinder, x, 1.05f, z, .48f, 2.1f, .48f, 0xff6b4931, 0f, 0f, 0f);
            draw(cone, x, 3f, z, 2.6f, 4f, 2.6f, 0xff245c42, 0f, 0f, 0f);
        }

        for (int i = 0; i < 18; i++) {
            float x = -29f + (i * 17 % 58);
            float z = -27f + (i * 23 % 55);
            draw(sphere, x, .38f, z, 1.5f, .75f, 1.2f, 0xff60726b, i * 19f, 0f, 0f);
        }

        for (int i = 0; i < 12; i++) {
            float x = -25f + (i * 11 % 52);
            float z = -24f + (i * 29 % 49);
            draw(cube, x, .55f, z, 1.2f, 1.1f, 1.2f, 0xff9b6a3f, i * 15f, 0f, 0f);
            draw(cube, x, .57f, z, 1.25f, .08f, 1.25f, 0xffd5a15d, i * 15f, 0f, 0f);
        }

        draw(cube, 0f, .02f, -WORLD, 68f, .25f, .35f, 0xff3c7065, 0f, 0f, 0f);
        draw(cube, 0f, .02f, WORLD, 68f, .25f, .35f, 0xff3c7065, 0f, 0f, 0f);
        draw(cube, -WORLD, .02f, 0f, .35f, .25f, 68f, 0xff3c7065, 0f, 0f, 0f);
        draw(cube, WORLD, .02f, 0f, .35f, .25f, 68f, 0xff3c7065, 0f, 0f, 0f);
    }

    private void drawPlayer() {
        if (firstPerson) {
            drawWeapon(playerX + lastAimX * .65f, 1.72f, playerZ + lastAimZ * .65f, yawDeg(), weaponIndex);
            return;
        }
        drawCritter(playerX, 0f, playerZ, yawDeg(), SpeciesCatalog3D.ALL[speciesIndex], 1f, true);
    }

    private void drawEnemies() {
        for (Enemy enemy : enemies) {
            float yaw = (float) Math.toDegrees(Math.atan2(playerX - enemy.x, -(playerZ - enemy.z)));
            drawCritter(enemy.x, 0f, enemy.z, yaw, SpeciesCatalog3D.ALL[enemy.species], .92f, false);
        }
    }

    private void drawBullets() {
        int color = weaponIndex == 4 ? 0xffc97bff : 0xff8feaff;
        for (Bullet bullet : bullets) {
            draw(sphere, bullet.x, bullet.y, bullet.z, .18f, .18f, .18f, color, 0f, 0f, 0f);
        }
    }

    private void drawLoot() {
        for (Loot drop : loot) {
            draw(cube, drop.x, .45f, drop.z, .48f, .48f, .48f, 0xffffd166, 45f, 35f, 0f);
            draw(sphere, drop.x, .45f, drop.z, .72f, .72f, .72f, 0x33ffd166, 0f, 0f, 0f);
        }
    }

    private void drawExtraction() {
        if (carriedLoot < LOOT_GOAL) return;
        for (int i = 0; i < 12; i++) {
            double angle = i * Math.PI * 2.0 / 12.0;
            float x = extractX + (float) Math.sin(angle) * 2.7f;
            float z = extractZ + (float) Math.cos(angle) * 2.7f;
            draw(cube, x, .08f, z, .48f, .16f, 1f, 0xff57e389,
                    (float) Math.toDegrees(angle), 0f, 0f);
        }
        draw(cylinder, extractX, 2.8f, extractZ, .16f, 5.5f, .16f,
                0x9957e389, 0f, 0f, 0f);
    }

    private void drawCritter(float x, float y, float z, float yaw,
                             SpeciesCatalog3D.Species species, float scale, boolean player) {
        int body = species.bodyColor();
        int accent = species.accentColor();
        int paw = species.pawColor();
        int vest = species.vestColor();

        draw(sphere, x, y + 1.16f * scale, z,
                1.30f * scale, 1.55f * scale, 1.02f * scale, body, yaw, 0f, 0f);
        draw(sphere, x, y + 1.30f * scale, z - .08f * scale,
                1.05f * scale, .92f * scale, .86f * scale, vest, yaw, 0f, 0f);

        Point head = local(x, z, yaw, 0f, .05f * scale);
        draw(sphere, head.x, y + 2.31f * scale, head.z,
                1.20f * scale, 1.05f * scale, 1.03f * scale, body, yaw, 0f, 0f);

        Point muzzle = local(x, z, yaw, 0f, .52f * scale);
        draw(sphere, muzzle.x, y + 2.18f * scale, muzzle.z,
                .66f * scale, .45f * scale, .64f * scale, paw, yaw, 0f, 0f);

        for (int side : new int[]{-1, 1}) {
            Point eye = local(x, z, yaw, side * .27f * scale, .49f * scale);
            draw(sphere, eye.x, y + 2.48f * scale, eye.z,
                    .11f * scale, .14f * scale, .09f * scale, 0xff0b1217, yaw, 0f, 0f);
        }

        drawEars(x, y, z, yaw, species, scale, body, accent);
        drawLimbs(x, y, z, yaw, species, scale, body, paw);
        drawTail(x, y, z, yaw, species, scale, body, accent);

        Point weaponPoint = local(x, z, yaw, .58f * scale, .28f * scale);
        int selectedWeapon = player ? weaponIndex : Math.floorMod(species.id.hashCode(), WEAPONS.length);
        drawWeapon(weaponPoint.x, y + 1.52f * scale, weaponPoint.z, yaw, selectedWeapon);
    }

    private void drawEars(float x, float y, float z, float yaw,
                          SpeciesCatalog3D.Species species, float scale, int body, int accent) {
        String ears = species.ears;
        if ("none".equals(ears)) return;

        for (int side : new int[]{-1, 1}) {
            Point p = local(x, z, yaw, side * .40f * scale, .03f * scale);
            if ("floppy".equals(ears)) {
                draw(cylinder, p.x, y + 2.62f * scale, p.z,
                        .25f * scale, .80f * scale, .24f * scale, accent, yaw, 0f, side * 28f);
            } else if ("triangle".equals(ears) || "upright".equals(ears)
                    || "bat".equals(ears) || "horn".equals(ears) || "antler".equals(ears)) {
                draw(cone, p.x, y + 2.86f * scale, p.z,
                        .43f * scale, .85f * scale, .43f * scale, accent, yaw, 0f, side * 12f);
            } else if ("gills".equals(ears)) {
                for (int k = -1; k <= 1; k++) {
                    Point gill = local(x, z, yaw,
                            side * (.48f + Math.abs(k) * .07f) * scale, .02f);
                    draw(cylinder, gill.x, y + (2.3f + k * .20f) * scale, gill.z,
                            .12f * scale, .46f * scale, .12f * scale, accent, yaw, 0f, side * 55f);
                }
            } else {
                draw(sphere, p.x, y + 2.67f * scale, p.z,
                        .42f * scale, .42f * scale, .35f * scale, accent, yaw, 0f, 0f);
            }
        }
    }

    private void drawLimbs(float x, float y, float z, float yaw,
                           SpeciesCatalog3D.Species species, float scale, int body, int paw) {
        for (int side : new int[]{-1, 1}) {
            Point arm = local(x, z, yaw, side * .62f * scale, .12f * scale);
            int armColor = "wing".equals(species.limb) ? species.accentColor() : body;
            draw(cylinder, arm.x, y + 1.25f * scale, arm.z,
                    .25f * scale, .92f * scale, .25f * scale, armColor, yaw, 0f, side * 18f);

            Point foot = local(x, z, yaw, side * .35f * scale, .18f * scale);
            draw(sphere, foot.x, y + .32f * scale, foot.z,
                    .48f * scale, .35f * scale, .62f * scale, paw, yaw, 0f, 0f);
        }
    }

    private void drawTail(float x, float y, float z, float yaw,
                          SpeciesCatalog3D.Species species, float scale, int body, int accent) {
        if ("none".equals(species.tail)) return;
        Point p = local(x, z, yaw, .12f * scale, -.70f * scale);

        if ("puff".equals(species.tail) || "stub".equals(species.tail) || "bear".equals(species.tail)) {
            draw(sphere, p.x, y + 1.05f * scale, p.z,
                    .48f * scale, .48f * scale, .48f * scale, accent, yaw, 0f, 0f);
        } else if ("beaver".equals(species.tail)) {
            draw(cube, p.x, y + .86f * scale, p.z,
                    .72f * scale, .22f * scale, 1.10f * scale, accent, yaw, 24f, 0f);
        } else {
            int tailColor = "brush".equals(species.tail) ? body : accent;
            draw(cylinder, p.x, y + 1f * scale, p.z,
                    .30f * scale, 1.25f * scale, .30f * scale, tailColor, yaw, 55f, 18f);
        }
    }

    private void drawWeapon(float x, float y, float z, float yaw, int index) {
        int weapon = Math.floorMod(index, WEAPON_COLORS.length);
        int color = WEAPON_COLORS[weapon];
        draw(cube, x, y, z, .28f, .28f, 1.12f, color, yaw, 0f, 0f);
        Point barrel = local(x, z, yaw, 0f, .70f);
        draw(cylinder, barrel.x, y, barrel.z,
                .15f, .66f, .15f, 0xffdbe8ec, yaw, 90f, 0f);
    }

    private float yawDeg() {
        return (float) Math.toDegrees(Math.atan2(lastAimX, -lastAimZ));
    }

    private Point local(float x, float z, float yawDeg, float lateral, float forward) {
        double radians = Math.toRadians(yawDeg);
        float rightX = (float) Math.cos(radians);
        float rightZ = (float) Math.sin(radians);
        float forwardX = (float) Math.sin(radians);
        float forwardZ = -(float) Math.cos(radians);
        return new Point(
                x + rightX * lateral + forwardX * forward,
                z + rightZ * lateral + forwardZ * forward
        );
    }

    private void draw(MeshFactory3D.Mesh mesh,
                      float x, float y, float z,
                      float sx, float sy, float sz,
                      int color, float yaw, float pitch, float roll) {
        Matrix.setIdentityM(model, 0);
        Matrix.translateM(model, 0, x, y, z);
        Matrix.rotateM(model, 0, yaw, 0f, 1f, 0f);
        Matrix.rotateM(model, 0, pitch, 1f, 0f, 0f);
        Matrix.rotateM(model, 0, roll, 0f, 0f, 1f);
        Matrix.scaleM(model, 0, sx, sy, sz);
        Matrix.multiplyMM(mvp, 0, vp, 0, model, 0);

        GLES30.glUniformMatrix4fv(uMvp, 1, false, mvp, 0);
        GLES30.glUniformMatrix4fv(uModel, 1, false, model, 0);
        GLES30.glUniform4f(
                uColor,
                Color.red(color) / 255f,
                Color.green(color) / 255f,
                Color.blue(color) / 255f,
                Color.alpha(color) / 255f
        );

        mesh.positions.position(0);
        mesh.normals.position(0);
        GLES30.glEnableVertexAttribArray(aPos);
        GLES30.glVertexAttribPointer(aPos, 3, GLES30.GL_FLOAT, false, 0, mesh.positions);
        GLES30.glEnableVertexAttribArray(aNormal);
        GLES30.glVertexAttribPointer(aNormal, 3, GLES30.GL_FLOAT, false, 0, mesh.normals);
        GLES30.glDrawArrays(GLES30.GL_TRIANGLES, 0, mesh.vertexCount);
    }

    private static int buildProgram(String vertexSource, String fragmentSource) {
        int vertex = shader(GLES30.GL_VERTEX_SHADER, vertexSource);
        int fragment = shader(GLES30.GL_FRAGMENT_SHADER, fragmentSource);
        int result = GLES30.glCreateProgram();
        GLES30.glAttachShader(result, vertex);
        GLES30.glAttachShader(result, fragment);
        GLES30.glLinkProgram(result);
        int[] ok = new int[1];
        GLES30.glGetProgramiv(result, GLES30.GL_LINK_STATUS, ok, 0);
        if (ok[0] == 0) {
            throw new IllegalStateException("OpenGL program link failed: " + GLES30.glGetProgramInfoLog(result));
        }
        GLES30.glDeleteShader(vertex);
        GLES30.glDeleteShader(fragment);
        return result;
    }

    private static int shader(int type, String source) {
        int shader = GLES30.glCreateShader(type);
        GLES30.glShaderSource(shader, source);
        GLES30.glCompileShader(shader);
        int[] ok = new int[1];
        GLES30.glGetShaderiv(shader, GLES30.GL_COMPILE_STATUS, ok, 0);
        if (ok[0] == 0) {
            throw new IllegalStateException("OpenGL shader failed: " + GLES30.glGetShaderInfoLog(shader));
        }
        return shader;
    }

    private static float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    private static final class Point {
        final float x;
        final float z;
        Point(float x, float z) { this.x = x; this.z = z; }
    }

    private static final class Enemy {
        float x;
        float z;
        float hp;
        float speed;
        float attack;
        int species;
        Enemy(float x, float z, int species, float hp, float speed) {
            this.x = x;
            this.z = z;
            this.species = species;
            this.hp = hp;
            this.speed = speed;
        }
    }

    private static final class Bullet {
        float x;
        float y;
        float z;
        float vx;
        float vz;
        float damage;
        float life;
        Bullet(float x, float y, float z, float vx, float vz, float damage, float life) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.vx = vx;
            this.vz = vz;
            this.damage = damage;
            this.life = life;
        }
    }

    private static final class Loot {
        float x;
        float z;
        int value;
        Loot(float x, float z, int value) {
            this.x = x;
            this.z = z;
            this.value = value;
        }
    }

    private static final String VS =
            "#version 300 es\n" +
            "precision mediump float;\n" +
            "in vec3 aPos;\n" +
            "in vec3 aNormal;\n" +
            "uniform mat4 uMvp;\n" +
            "uniform mat4 uModel;\n" +
            "out vec3 vNormal;\n" +
            "out vec3 vWorld;\n" +
            "void main(){\n" +
            "  vec4 world = uModel * vec4(aPos,1.0);\n" +
            "  vWorld = world.xyz;\n" +
            "  vNormal = mat3(uModel) * aNormal;\n" +
            "  gl_Position = uMvp * vec4(aPos,1.0);\n" +
            "}";

    private static final String FS =
            "#version 300 es\n" +
            "precision mediump float;\n" +
            "in vec3 vNormal;\n" +
            "in vec3 vWorld;\n" +
            "uniform vec4 uColor;\n" +
            "uniform vec3 uCamera;\n" +
            "out vec4 outColor;\n" +
            "void main(){\n" +
            "  vec3 n = normalize(vNormal);\n" +
            "  float sun = max(dot(n,normalize(vec3(.35,.82,.25))),0.0);\n" +
            "  float light = .34 + sun * .66;\n" +
            "  float dist = distance(vWorld,uCamera);\n" +
            "  float fog = clamp((dist-34.0)/38.0,0.0,.55);\n" +
            "  vec3 base = uColor.rgb * light;\n" +
            "  vec3 fogColor = vec3(.035,.09,.10);\n" +
            "  outColor = vec4(mix(base,fogColor,fog),uColor.a);\n" +
            "}";
}
