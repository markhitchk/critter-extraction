package com.harleytg.critterextraction;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.InputProcessor;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.PerspectiveCamera;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.VertexAttributes;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g3d.Environment;
import com.badlogic.gdx.graphics.g3d.Material;
import com.badlogic.gdx.graphics.g3d.Model;
import com.badlogic.gdx.graphics.g3d.ModelBatch;
import com.badlogic.gdx.graphics.g3d.ModelInstance;
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute;
import com.badlogic.gdx.graphics.g3d.environment.DirectionalLight;
import com.badlogic.gdx.graphics.g3d.utils.ModelBuilder;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.utils.Array;

public final class GameScreen implements Screen, InputProcessor {
    private static final long ATTRS = VertexAttributes.Usage.Position | VertexAttributes.Usage.Normal;
    private static final Vector3 EXTRACT = new Vector3(15f, 0f, 15f);
    private final CritterExtractionGame game;
    private final ModelBatch models3d = new ModelBatch();
    private final SpriteBatch sprites = new SpriteBatch();
    private final ShapeRenderer shapes = new ShapeRenderer();
    private final BitmapFont font = new BitmapFont();
    private final PerspectiveCamera camera = new PerspectiveCamera(67f, 1280f, 720f);
    private final OrthographicCamera ui = new OrthographicCamera();
    private final Environment environment = new Environment();
    private final ModelBuilder mb = new ModelBuilder();
    private final Array<Model> ownedModels = new Array<>();
    private final Array<ModelInstance> scenery = new Array<>();
    private final Array<ModelInstance> playerParts = new Array<>();
    private final Array<Enemy> enemies = new Array<>();
    private final Array<Bullet> bullets = new Array<>();

    private Model bulletModel;
    private Model enemyBodyModel;
    private Model enemyHeadModel;
    private Texture logo, puppy, ammoIcon, medkitIcon, weaponIcon;

    private final Vector3 player = new Vector3(-8, 0, -8);
    private float yaw, pitch = -0.08f, health = 100f, extractTimer, stateTimer;
    private int ammo = 30, reserve = 120, kills, petals, extracts;
    private boolean firstPerson, extracted;
    private int w = 1280, h = 720, movePointer = -1, lookPointer = -1;
    private final Vector2 moveBase = new Vector2(), moveNow = new Vector2(), lookLast = new Vector2();

    public GameScreen(CritterExtractionGame game) {
        this.game = game;
        camera.near = 0.08f;
        camera.far = 140f;
        environment.set(new ColorAttribute(ColorAttribute.AmbientLight, .66f, .69f, .73f, 1f));
        environment.add(new DirectionalLight().set(.88f, .90f, .95f, -.4f, -1f, -.25f));
        kills = game.saves.getInteger("kills", 0);
        petals = game.saves.getInteger("petals", 0);
        extracts = game.saves.getInteger("extracts", 0);
        createWorld();
        loadAssets();
        resize(Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
        Gdx.input.setInputProcessor(this);
    }

    private Material mat(String hex) {
        return new Material(ColorAttribute.createDiffuse(Color.valueOf(hex)));
    }

    private Model own(Model m) {
        ownedModels.add(m);
        return m;
    }

    private void createWorld() {
        SpeciesCatalog.Species p = SpeciesCatalog.get("puppy");
        Model body = own(mb.createSphere(1f, 1.35f, .82f, 18, 14,
            new Material(ColorAttribute.createDiffuse(p.body())), ATTRS));
        Model head = own(mb.createSphere(.84f, .78f, .82f, 18, 14,
            new Material(ColorAttribute.createDiffuse(p.body())), ATTRS));
        Model ear = own(mb.createCone(.28f, .62f, .28f, 10,
            new Material(ColorAttribute.createDiffuse(p.accent())), ATTRS));
        Model paw = own(mb.createSphere(.28f, .34f, .30f, 12, 10,
            new Material(ColorAttribute.createDiffuse(p.paw())), ATTRS));
        Model tail = own(mb.createCylinder(.18f, .9f, .18f, 10,
            new Material(ColorAttribute.createDiffuse(p.accent())), ATTRS));
        Model gun = own(mb.createBox(.16f, .18f, 1.05f, mat("70d6ff"), ATTRS));
        playerParts.add(new ModelInstance(body));
        playerParts.add(new ModelInstance(head));
        playerParts.add(new ModelInstance(ear));
        playerParts.add(new ModelInstance(ear));
        playerParts.add(new ModelInstance(paw));
        playerParts.add(new ModelInstance(paw));
        playerParts.add(new ModelInstance(tail));
        playerParts.add(new ModelInstance(gun));

        enemyBodyModel = own(mb.createSphere(.95f, 1.28f, .80f, 16, 12, mat("a65a4d"), ATTRS));
        enemyHeadModel = own(mb.createSphere(.78f, .74f, .76f, 16, 12, mat("d08568"), ATTRS));
        bulletModel = own(mb.createSphere(.14f, .14f, .14f, 8, 8, mat("a9f5ff"), ATTRS));

        addScenery(own(mb.createBox(80f, .18f, 80f, mat("315943"), ATTRS)), 0, -.12f, 0);
        addScenery(own(mb.createCylinder(8f, .05f, 8f, 48, mat("00b8f0"), ATTRS)), 15, .03f, 15);
        Model trunk = own(mb.createCylinder(.45f, 3.2f, .45f, 10, mat("6d4b36"), ATTRS));
        Model crown = own(mb.createCone(2.2f, 4.4f, 2.2f, 12, mat("2b6b4d"), ATTRS));
        float[][] trees = {{-20,-18},{-15,-23},{-6,-25},{5,-22},{18,-25},{26,-17},{28,-2},{25,11},{21,25},{4,27},{-10,25},{-23,19},{-28,5},{-27,-8},{-3,8},{9,4},{4,-10},{-14,5}};
        for (float[] t : trees) {
            addScenery(trunk, t[0], 1.6f, t[1]);
            addScenery(crown, t[0], 4.1f, t[1]);
        }
        Model rock = own(mb.createSphere(1.7f, 1f, 1.4f, 12, 8, mat("6c747a"), ATTRS));
        for (float[] r : new float[][]{{-18,10},{-2,17},{12,-17},{20,-7},{8,22},{-22,-2}})
            addScenery(rock, r[0], .46f, r[1]);

        for (int i = 0; i < 8; i++) {
            float a = i * MathUtils.PI2 / 8f;
            float r = 15f + (i % 3) * 3f;
            enemies.add(new Enemy(MathUtils.cos(a) * r, MathUtils.sin(a) * r));
        }
        updatePlayerParts();
    }

    private void addScenery(Model model, float x, float y, float z) {
        ModelInstance i = new ModelInstance(model);
        i.transform.setToTranslation(x, y, z);
        scenery.add(i);
    }

    private Texture tex(String path) {
        try { return Gdx.files.internal(path).exists() ? new Texture(Gdx.files.internal(path)) : null; }
        catch (Exception ignored) { return null; }
    }

    private void loadAssets() {
        logo = tex("branding/icon.png");
        puppy = tex("characters/puppy.png");
        ammoIcon = tex("items/pea_ammo.png");
        medkitIcon = tex("items/medkit.png");
        weaponIcon = tex("weapons/pea_popper.png");
    }

    private void part(int n, float ox, float oy, float oz, float yawDeg, float rollDeg) {
        Vector3 off = new Vector3(ox, 0, oz).rotate(Vector3.Y, yawDeg);
        playerParts.get(n).transform.idt().translate(player.x + off.x, oy, player.z + off.z)
            .rotate(Vector3.Y, yawDeg).rotate(Vector3.Z, rollDeg);
    }

    private void updatePlayerParts() {
        float d = yaw * MathUtils.radiansToDegrees;
        part(0, 0, 1.14f, 0, d, 0);
        part(1, 0, 2.05f, -.10f, d, 0);
        part(2, -.26f, 2.58f, -.05f, d, 16f);
        part(3, .26f, 2.58f, -.05f, d, -16f);
        part(4, -.30f, .42f, -.12f, d, 0);
        part(5, .30f, .42f, -.12f, d, 0);
        part(6, -.44f, 1.05f, .42f, d + 62f, 80f);
        part(7, .38f, 1.35f, -.58f, d, 0);
    }

    private Vector3 viewDir() {
        return new Vector3(MathUtils.sin(yaw), MathUtils.sin(pitch), -MathUtils.cos(yaw)).nor();
    }

    private void updateCamera() {
        Vector3 d = viewDir();
        if (firstPerson) {
            camera.position.set(player.x, 2.12f, player.z).mulAdd(d, .16f);
            camera.direction.set(d);
        } else {
            Vector3 flat = new Vector3(d.x, 0, d.z).nor();
            camera.position.set(player.x, 3.15f, player.z).mulAdd(flat, -5.3f);
            camera.lookAt(player.x, 1.55f, player.z);
        }
        camera.up.set(Vector3.Y);
        camera.update();
    }

    private void update(float dt) {
        dt = Math.min(dt, .05f);
        if (extracted || health <= 0) {
            stateTimer += dt;
            if (stateTimer > 2.7f) resetRound();
            updateCamera();
            return;
        }

        float sx = 0, sy = 0;
        if (movePointer >= 0) {
            Vector2 v = new Vector2(moveNow).sub(moveBase);
            if (v.len() > 75f) v.setLength(75f);
            sx = v.x / 75f;
            sy = v.y / 75f;
        }
        if (Gdx.input.isKeyPressed(Input.Keys.W)) sy += 1;
        if (Gdx.input.isKeyPressed(Input.Keys.S)) sy -= 1;
        if (Gdx.input.isKeyPressed(Input.Keys.D)) sx += 1;
        if (Gdx.input.isKeyPressed(Input.Keys.A)) sx -= 1;
        Vector2 stick = new Vector2(sx, sy);
        if (stick.len2() > 1) stick.nor();
        Vector3 forward = new Vector3(MathUtils.sin(yaw), 0, -MathUtils.cos(yaw));
        Vector3 right = new Vector3(MathUtils.cos(yaw), 0, MathUtils.sin(yaw));
        Vector3 move = new Vector3(forward).scl(stick.y).mulAdd(right, stick.x);
        if (move.len2() > .001f) {
            player.mulAdd(move.nor(), 6.2f * dt);
            player.x = MathUtils.clamp(player.x, -38f, 38f);
            player.z = MathUtils.clamp(player.z, -38f, 38f);
        }

        if (Gdx.input.isKeyJustPressed(Input.Keys.SPACE)) shoot();
        if (Gdx.input.isKeyJustPressed(Input.Keys.V)) firstPerson = !firstPerson;
        if (Gdx.input.isKeyJustPressed(Input.Keys.R)) reload();

        for (int i = bullets.size - 1; i >= 0; i--) {
            Bullet b = bullets.get(i);
            b.age += dt;
            b.pos.mulAdd(b.vel, dt);
            b.instance.transform.setToTranslation(b.pos);
            boolean remove = b.age > 2.6f;
            if (!remove) for (Enemy e : enemies) {
                if (e.hp > 0 && e.pos.dst2(b.pos) < 1.32f) {
                    e.hp -= 34f;
                    remove = true;
                    if (e.hp <= 0) {
                        e.respawn = 4f;
                        kills++;
                        petals += 25;
                        saveStats();
                    }
                    break;
                }
            }
            if (remove) bullets.removeIndex(i);
        }

        for (Enemy e : enemies) {
            if (e.hp <= 0) {
                e.respawn -= dt;
                if (e.respawn <= 0) e.revive();
                continue;
            }
            Vector3 to = new Vector3(player).sub(e.pos);
            float dist = to.len();
            if (dist < 21f && dist > 1.35f) e.pos.mulAdd(to.set(to.x, 0, to.z).nor(), 2.1f * dt);
            if (dist < 1.45f) health = Math.max(0, health - 13f * dt);
            e.sync();
        }

        if (Vector2.dst(player.x, player.z, EXTRACT.x, EXTRACT.z) <= 4f) {
            extractTimer += dt;
            if (extractTimer >= 5f) {
                extracted = true;
                stateTimer = 0;
                extracts++;
                petals += 500;
                saveStats();
            }
        } else extractTimer = 0;

        updatePlayerParts();
        updateCamera();
    }

    private void saveStats() {
        game.saves.putInteger("kills", kills).putInteger("petals", petals).putInteger("extracts", extracts).flush();
    }

    private void shoot() {
        if (health <= 0 || extracted) return;
        if (ammo <= 0) { reload(); return; }
        ammo--;
        Vector3 d = viewDir();
        bullets.add(new Bullet(new Vector3(player.x, 1.55f, player.z).mulAdd(d, .85f), new Vector3(d).scl(25f)));
        try { Gdx.input.vibrate(18); } catch (Exception ignored) {}
    }

    private void reload() {
        if (ammo >= 30 || reserve <= 0) return;
        int moved = Math.min(30 - ammo, reserve);
        ammo += moved;
        reserve -= moved;
    }

    private void medkit() {
        if (health > 0) health = Math.min(100f, health + 45f);
    }

    private void resetRound() {
        player.set(-8, 0, -8);
        health = 100;
        ammo = 30;
        reserve = 120;
        extractTimer = 0;
        extracted = false;
        stateTimer = 0;
        bullets.clear();
        for (Enemy e : enemies) e.revive();
        updatePlayerParts();
        updateCamera();
    }

    @Override
    public void render(float delta) {
        update(delta);
        Gdx.gl.glViewport(0, 0, w, h);
        Gdx.gl.glClearColor(.035f, .06f, .08f, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);
        models3d.begin(camera);
        for (ModelInstance m : scenery) models3d.render(m, environment);
        if (!firstPerson) for (ModelInstance m : playerParts) models3d.render(m, environment);
        for (Enemy e : enemies) if (e.hp > 0) { models3d.render(e.body, environment); models3d.render(e.head, environment); }
        for (Bullet b : bullets) models3d.render(b.instance, environment);
        models3d.end();
        renderHud();
    }

    private void renderHud() {
        Gdx.gl.glDisable(GL20.GL_DEPTH_TEST);
        Gdx.gl.glEnable(GL20.GL_BLEND);
        Gdx.gl.glBlendFunc(GL20.GL_SRC_ALPHA, GL20.GL_ONE_MINUS_SRC_ALPHA);
        shapes.setProjectionMatrix(ui.combined);
        shapes.begin(ShapeRenderer.ShapeType.Filled);
        shapes.setColor(0, 0, 0, .50f); shapes.rect(18, h - 100, 380, 74);
        shapes.setColor(.08f, .15f, .18f, 1); shapes.rect(88, h - 72, 250, 16);
        shapes.setColor(health > 35 ? Color.valueOf("47d18c") : Color.valueOf("ff5f66")); shapes.rect(88, h - 72, 250 * health / 100f, 16);
        float jx = movePointer >= 0 ? moveBase.x : 105, jy = movePointer >= 0 ? moveBase.y : 105;
        shapes.setColor(.02f, .08f, .11f, .65f); shapes.circle(jx, jy, 72, 40);
        Vector2 knob = movePointer >= 0 ? new Vector2(moveNow).sub(moveBase) : new Vector2();
        if (knob.len() > 48) knob.setLength(48);
        shapes.setColor(0, .72f, .94f, .78f); shapes.circle(jx + knob.x, jy + knob.y, 27, 32);
        button(w - 96, 96, 58, "00b8f0");
        button(w - 96, 220, 43, "254b61");
        button(w - 218, 96, 43, "315943");
        if (Vector2.dst(player.x, player.z, EXTRACT.x, EXTRACT.z) <= 4f && !extracted) {
            shapes.setColor(0,0,0,.68f); shapes.rect(w*.5f-180,42,360,32);
            shapes.setColor(Color.valueOf("00b8f0")); shapes.rect(w*.5f-176,46,352*Math.min(1,extractTimer/5f),24);
        }
        shapes.end();

        sprites.setProjectionMatrix(ui.combined);
        sprites.begin();
        if (logo != null) sprites.draw(logo, 28, h - 90, 56, 56);
        if (puppy != null) sprites.draw(puppy, 342, h - 89, 56, 56);
        if (weaponIcon != null) sprites.draw(weaponIcon, w - 340, h - 92, 64, 64);
        if (ammoIcon != null) sprites.draw(ammoIcon, w - 268, h - 83, 42, 42);
        if (medkitIcon != null) sprites.draw(medkitIcon, w - 248, 66, 58, 58);
        font.getData().setScale(Math.max(1.05f, h / 720f));
        font.setColor(Color.WHITE);
        font.draw(sprites, "CRITTER EXTRACTION  •  NATIVE " + CritterExtractionGame.VERSION, 92, h - 43);
        font.draw(sprites, "HP " + Math.round(health) + "   Kills " + kills + "   Petals " + petals + "   Extractions " + extracts, 92, h - 80);
        font.draw(sprites, ammo + " / " + reserve, w - 218, h - 58);
        font.draw(sprites, "FIRE", w - 118, 102);
        font.draw(sprites, firstPerson ? "3P" : "1P", w - 112, 225);
        font.draw(sprites, "MED", w - 237, 101);
        if (Vector2.dst(player.x, player.z, EXTRACT.x, EXTRACT.z) <= 4f && !extracted)
            font.draw(sprites, "HOLD POSITION TO EXTRACT", w*.5f - 105, 98);
        if (extracted || health <= 0) {
            font.getData().setScale(Math.max(2f, h / 360f));
            font.draw(sprites, extracted ? "EXTRACTED! +500 PETALS" : "DOWNED — REDEPLOYING", w*.5f - 190, h*.58f);
        }
        sprites.end();
        Gdx.gl.glEnable(GL20.GL_DEPTH_TEST);
    }

    private void button(float x, float y, float r, String hex) {
        shapes.setColor(0,0,0,.62f); shapes.circle(x,y,r+6,36);
        Color c = Color.valueOf(hex); shapes.setColor(c.r,c.g,c.b,.80f); shapes.circle(x,y,r,36);
    }

    private boolean near(float x, float y, float cx, float cy, float r) {
        float dx=x-cx, dy=y-cy; return dx*dx+dy*dy <= r*r;
    }

    @Override public boolean touchDown(int x, int sy, int pointer, int button) {
        float y = h - sy;
        if (near(x,y,w-96,96,78)) { shoot(); return true; }
        if (near(x,y,w-96,220,60)) { firstPerson=!firstPerson; return true; }
        if (near(x,y,w-218,96,60)) { medkit(); return true; }
        if (x < w*.45f && y < h*.58f && movePointer < 0) {
            movePointer=pointer; moveBase.set(x,y); moveNow.set(x,y); return true;
        }
        if (lookPointer < 0) { lookPointer=pointer; lookLast.set(x,y); return true; }
        return false;
    }

    @Override public boolean touchDragged(int x, int sy, int pointer) {
        float y=h-sy;
        if (pointer==movePointer) { moveNow.set(x,y); return true; }
        if (pointer==lookPointer) {
            yaw -= (x-lookLast.x)*.0048f;
            pitch = MathUtils.clamp(pitch + (y-lookLast.y)*.0037f, -.7f, .55f);
            lookLast.set(x,y); return true;
        }
        return false;
    }

    @Override public boolean touchUp(int x, int y, int pointer, int button) {
        if (pointer==movePointer) { movePointer=-1; moveBase.setZero(); moveNow.setZero(); }
        if (pointer==lookPointer) lookPointer=-1;
        return true;
    }

    @Override public void resize(int width, int height) {
        w=Math.max(1,width); h=Math.max(1,height);
        camera.viewportWidth=w; camera.viewportHeight=h; camera.update();
        ui.setToOrtho(false,w,h); ui.update();
    }
    @Override public void show() { Gdx.input.setInputProcessor(this); updateCamera(); }
    @Override public void pause() { game.saves.flush(); }
    @Override public void resume() { Gdx.input.setInputProcessor(this); }
    @Override public void hide() {}
    @Override public boolean keyDown(int keycode) { return false; }
    @Override public boolean keyUp(int keycode) { return false; }
    @Override public boolean keyTyped(char character) { return false; }
    @Override public boolean mouseMoved(int screenX, int screenY) { return false; }
    @Override public boolean scrolled(float amountX, float amountY) { return false; }

    @Override public void dispose() {
        models3d.dispose(); sprites.dispose(); shapes.dispose(); font.dispose();
        for (Model m : ownedModels) m.dispose();
        if (logo!=null) logo.dispose(); if (puppy!=null) puppy.dispose(); if (ammoIcon!=null) ammoIcon.dispose();
        if (medkitIcon!=null) medkitIcon.dispose(); if (weaponIcon!=null) weaponIcon.dispose();
    }

    private final class Enemy {
        final Vector3 spawn=new Vector3(), pos=new Vector3();
        final ModelInstance body=new ModelInstance(enemyBodyModel), head=new ModelInstance(enemyHeadModel);
        float hp=100, respawn;
        Enemy(float x,float z) { spawn.set(x,0,z); pos.set(spawn); sync(); }
        void sync() { body.transform.setToTranslation(pos.x,1.08f,pos.z); head.transform.setToTranslation(pos.x,2f,pos.z); }
        void revive() { hp=100; pos.set(spawn); sync(); }
    }

    private final class Bullet {
        final Vector3 pos=new Vector3(), vel=new Vector3();
        final ModelInstance instance=new ModelInstance(bulletModel);
        float age;
        Bullet(Vector3 p,Vector3 v) { pos.set(p); vel.set(v); instance.transform.setToTranslation(pos); }
    }
}
