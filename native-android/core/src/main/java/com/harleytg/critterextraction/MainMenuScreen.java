package com.harleytg.critterextraction;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.actions.Actions;
import com.badlogic.gdx.scenes.scene2d.ui.Image;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.utils.ChangeListener;
import com.badlogic.gdx.scenes.scene2d.utils.TextureRegionDrawable;
import com.badlogic.gdx.utils.Scaling;
import com.badlogic.gdx.utils.viewport.ScreenViewport;

/** Native Critter Extraction title/main menu implemented entirely with Scene2D. */
public final class MainMenuScreen implements Screen {
    private final CritterExtractionGame game;
    private final Stage stage = new Stage(new ScreenViewport());
    private final UiTheme ui = new UiTheme();
    private Texture backgroundTexture;
    private Texture logoTexture;
    private Label status;

    public MainMenuScreen(CritterExtractionGame game) { this.game = game; build(); }

    private void build() {
        if (Gdx.files.internal("loading/cinematic-gameplay-fullhd.webp").exists()) {
            backgroundTexture = new Texture(Gdx.files.internal("loading/cinematic-gameplay-fullhd.webp"));
            Image bg = new Image(backgroundTexture);
            bg.setFillParent(true); bg.setScaling(Scaling.fill); bg.setColor(1f, 1f, 1f, .34f);
            stage.addActor(bg);
        }
        Table shade = new Table(); shade.setFillParent(true); shade.setBackground(ui.skin.getDrawable("overlay")); stage.addActor(shade);
        Table root = new Table(); root.setFillParent(true); root.pad(34f, 52f, 28f, 52f); stage.addActor(root);
        Table brand = new Table(); brand.left().top();
        if (Gdx.files.internal("branding/icon.png").exists()) {
            logoTexture = new Texture(Gdx.files.internal("branding/icon.png"));
            Image logo = new Image(new TextureRegionDrawable(new TextureRegion(logoTexture)));
            brand.add(logo).size(88f).padRight(18f);
        }
        Table titles = new Table(); titles.left();
        Label gameTitle = new Label("CRITTER EXTRACTION", ui.skin, "default"); gameTitle.setFontScale(2.15f);
        Label studio = new Label("A HARLEY'S STUDIOS GAME", ui.skin, "accent"); studio.setFontScale(.88f);
        titles.add(gameTitle).left().row(); titles.add(studio).left().padTop(6f); brand.add(titles).left();
        root.add(brand).growX().left().top().colspan(2).row(); root.add().growY().colspan(2).row();
        Table menuPanel = new Table(); menuPanel.setBackground(ui.skin.getDrawable("panel")); menuPanel.pad(24f);
        menuPanel.defaults().width(330f).height(56f).padBottom(11f);
        Label deployLabel = new Label("DEPLOYMENT", ui.skin, "accent"); deployLabel.setFontScale(.82f);
        menuPanel.add(deployLabel).left().height(26f).row();
        menuPanel.add(button("PLAY", "accent", () -> { game.setScreen(new GameScreen(game)); dispose(); })).row();
        menuPanel.add(button("LOADOUT", "default", () -> setStatus("Loadout UI is the next menu checkpoint."))).row();
        menuPanel.add(button("SETTINGS", "default", () -> { game.setScreen(new SettingsScreen(game)); dispose(); })).row();
        menuPanel.add(button("CREDITS", "default", () -> setStatus("Critter Extraction  •  Made by Harley's Studios"))).row();
        menuPanel.add(button("EXIT GAME", "danger", Gdx.app::exit)).row();
        status = new Label("Native Android test build", ui.skin, "muted"); status.setWrap(true);
        menuPanel.add(status).growX().height(38f).padTop(8f).row();
        Table rightInfo = new Table(); rightInfo.setBackground(ui.skin.getDrawable("panel2")); rightInfo.pad(22f); rightInfo.defaults().left().growX();
        Label mode = new Label("NATIVE BUILD", ui.skin, "accent"); mode.setFontScale(1.05f); rightInfo.add(mode).row();
        Label info = new Label("Android game runtime\nOffline assets packaged locally\nTouch + controller-ready UI", ui.skin, "default"); info.setFontScale(.88f);
        rightInfo.add(info).padTop(10f).row(); rightInfo.add(new Label("v" + CritterExtractionGame.VERSION, ui.skin, "muted")).padTop(18f).row();
        root.add(menuPanel).width(386f).left().bottom().padRight(22f); root.add(rightInfo).width(330f).right().bottom();
        if (!GameSettings.load(game.saves).reducedMotion) { root.getColor().a = 0f; root.addAction(Actions.fadeIn(.32f)); }
    }

    private TextButton button(String text, String style, Runnable action) {
        TextButton b = new TextButton(text, ui.skin, style); b.getLabel().setFontScale(1.02f);
        b.addListener(new ChangeListener() { @Override public void changed(ChangeEvent event, com.badlogic.gdx.scenes.scene2d.Actor actor) { action.run(); } });
        return b;
    }
    private void setStatus(String text) { if (status != null) status.setText(text); }

    @Override public void render(float delta) {
        if (Gdx.input.isKeyJustPressed(Input.Keys.BACK) || Gdx.input.isKeyJustPressed(Input.Keys.ESCAPE)) { Gdx.app.exit(); return; }
        Gdx.gl.glClearColor(.015f, .028f, .04f, 1f); Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        stage.act(Math.min(delta, 1f / 20f)); stage.draw();
    }
    @Override public void resize(int width, int height) { stage.getViewport().update(width, height, true); }
    @Override public void show() { Gdx.input.setCatchKey(Input.Keys.BACK, true); Gdx.input.setInputProcessor(stage); }
    @Override public void hide() {}
    @Override public void pause() { game.saves.flush(); }
    @Override public void resume() { Gdx.input.setInputProcessor(stage); }
    @Override public void dispose() { stage.dispose(); ui.close(); if (backgroundTexture != null) backgroundTexture.dispose(); if (logoTexture != null) logoTexture.dispose(); }
}
