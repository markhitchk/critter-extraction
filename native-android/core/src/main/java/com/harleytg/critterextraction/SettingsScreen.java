package com.harleytg.critterextraction;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.scenes.scene2d.Actor;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.ui.CheckBox;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.ScrollPane;
import com.badlogic.gdx.scenes.scene2d.ui.Slider;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.utils.ChangeListener;
import com.badlogic.gdx.utils.viewport.ScreenViewport;

/** Native settings UI with persistent graphics/audio/control/accessibility options. */
public final class SettingsScreen implements Screen {
    private enum Tab { GRAPHICS, AUDIO, CONTROLS, ACCESSIBILITY }
    private final CritterExtractionGame game;
    private final Stage stage = new Stage(new ScreenViewport());
    private final UiTheme ui = new UiTheme();
    private final GameSettings settings;
    private final Table content = new Table();
    private final Label dirtyLabel;
    private Tab tab = Tab.GRAPHICS;
    private boolean dirty;

    public SettingsScreen(CritterExtractionGame game) {
        this.game = game; settings = GameSettings.load(game.saves); dirtyLabel = new Label("", ui.skin, "accent"); build(); showTab(Tab.GRAPHICS);
    }

    private void build() {
        Table root = new Table(); root.setFillParent(true); root.setBackground(ui.skin.getDrawable("overlay")); root.pad(26f, 32f, 24f, 32f); stage.addActor(root);
        Table header = new Table(); Label title = new Label("SETTINGS", ui.skin, "default"); title.setFontScale(1.75f);
        header.add(title).left(); header.add(dirtyLabel).expandX().right().padRight(16f); header.add(makeButton("BACK", "default", this::back)).width(122f).height(44f).right();
        root.add(header).growX().colspan(2).padBottom(18f).row();
        Table nav = new Table(); nav.setBackground(ui.skin.getDrawable("panel")); nav.pad(14f); nav.defaults().width(214f).height(50f).padBottom(9f);
        nav.add(tabButton("GRAPHICS", Tab.GRAPHICS)).row(); nav.add(tabButton("AUDIO", Tab.AUDIO)).row(); nav.add(tabButton("CONTROLS", Tab.CONTROLS)).row(); nav.add(tabButton("ACCESSIBILITY", Tab.ACCESSIBILITY)).row(); nav.add().growY().row();
        Label hint = new Label("Changes are kept locally on this device.", ui.skin, "muted"); hint.setWrap(true); nav.add(hint).width(190f).left().bottom();
        content.top().left(); content.pad(22f, 26f, 22f, 26f); content.setBackground(ui.skin.getDrawable("panel2"));
        ScrollPane scroll = new ScrollPane(content); scroll.setFadeScrollBars(false); scroll.setScrollingDisabled(true, false);
        root.add(nav).width(242f).growY().left().padRight(18f); root.add(scroll).grow().left().row();
        Table footer = new Table(); footer.defaults().height(48f).padLeft(10f); footer.add().expandX();
        footer.add(makeButton("RESET DEFAULTS", "danger", this::resetDefaults)).width(178f); footer.add(makeButton("CANCEL", "default", this::back)).width(132f); footer.add(makeButton("APPLY", "accent", this::apply)).width(142f);
        root.add(footer).growX().colspan(2).padTop(16f);
    }

    private TextButton tabButton(String name, Tab target) { return makeButton(name, "default", () -> showTab(target)); }
    private void showTab(Tab target) {
        tab = target; content.clearChildren(); content.defaults().growX().left().padBottom(13f);
        Label heading = new Label(target.name(), ui.skin, "accent"); heading.setFontScale(1.22f); content.add(heading).padBottom(6f).row();
        Label sub = new Label(subtitle(target), ui.skin, "muted"); sub.setWrap(true); content.add(sub).padBottom(18f).row();
        switch (target) { case GRAPHICS -> graphics(); case AUDIO -> audio(); case CONTROLS -> controls(); case ACCESSIBILITY -> accessibility(); }
    }
    private String subtitle(Tab t) {
        return switch (t) {
            case GRAPHICS -> "Balance image quality, field of view, and frame pacing for your device.";
            case AUDIO -> "Set local game volume levels. Voice chat controls will be added with multiplayer.";
            case CONTROLS -> "Tune touch aiming and choose how the mobile controls behave.";
            case ACCESSIBILITY -> "Adjust motion, HUD legibility, crosshair size, and color presentation.";
        };
    }

    private void graphics() {
        addSlider("Render scale", .60f, 1f, .05f, settings.renderScale, v -> settings.renderScale = v, v -> Math.round(v * 100) + "%");
        addCycle("Frame rate limit", fpsName(settings.frameRate), () -> { settings.frameRate = switch (settings.frameRate) { case FPS_30 -> GameSettings.FrameRate.FPS_60; case FPS_60 -> GameSettings.FrameRate.FPS_120; case FPS_120 -> GameSettings.FrameRate.FPS_30; }; return fpsName(settings.frameRate); });
        addCycle("Effects quality", pretty(settings.effectsQuality.name()), () -> { settings.effectsQuality = switch (settings.effectsQuality) { case LOW -> GameSettings.Quality.MEDIUM; case MEDIUM -> GameSettings.Quality.HIGH; case HIGH -> GameSettings.Quality.LOW; }; return pretty(settings.effectsQuality.name()); });
        addToggle("Dynamic shadows", settings.shadows, v -> settings.shadows = v);
        addSlider("Camera field of view", 65f, 100f, 1f, settings.fieldOfView, v -> settings.fieldOfView = v, v -> Math.round(v) + "°");
    }
    private void audio() {
        addToggle("Mute all audio", settings.muted, v -> settings.muted = v);
        addSlider("Master volume", 0f, 1f, .05f, settings.masterVolume, v -> settings.masterVolume = v, SettingsScreen::percent);
        addSlider("Music volume", 0f, 1f, .05f, settings.musicVolume, v -> settings.musicVolume = v, SettingsScreen::percent);
        addSlider("Sound effects", 0f, 1f, .05f, settings.effectsVolume, v -> settings.effectsVolume = v, SettingsScreen::percent);
    }
    private void controls() {
        addSlider("Look sensitivity", .35f, 2f, .05f, settings.lookSensitivity, v -> settings.lookSensitivity = v, v -> String.format("%.2fx", v));
        addSlider("Aim sensitivity", .25f, 1.5f, .05f, settings.aimSensitivity, v -> settings.aimSensitivity = v, v -> String.format("%.2fx", v));
        addToggle("Invert vertical look", settings.invertY, v -> settings.invertY = v);
        addToggle("Controller vibration / haptics", settings.vibration, v -> settings.vibration = v);
        addToggle("Left-handed touch layout", settings.leftHanded, v -> settings.leftHanded = v);
    }
    private void accessibility() {
        addSlider("UI scale", .8f, 1.3f, .05f, settings.uiScale, v -> settings.uiScale = v, SettingsScreen::percent);
        addToggle("Reduce menu motion", settings.reducedMotion, v -> settings.reducedMotion = v);
        addToggle("High-contrast HUD", settings.highContrastHud, v -> settings.highContrastHud = v);
        addSlider("Crosshair size", .7f, 1.6f, .05f, settings.crosshairScale, v -> settings.crosshairScale = v, SettingsScreen::percent);
        addCycle("Color vision filter", pretty(settings.colorMode.name()), () -> { settings.colorMode = switch (settings.colorMode) { case OFF -> GameSettings.ColorMode.DEUTERANOPIA; case DEUTERANOPIA -> GameSettings.ColorMode.PROTANOPIA; case PROTANOPIA -> GameSettings.ColorMode.TRITANOPIA; case TRITANOPIA -> GameSettings.ColorMode.OFF; }; return pretty(settings.colorMode.name()); });
    }

    private interface FloatSetter { void set(float value); }
    private interface FloatFormat { String value(float value); }
    private interface BoolSetter { void set(boolean value); }
    private interface CycleValue { String next(); }

    private void addSlider(String name, float min, float max, float step, float initial, FloatSetter setter, FloatFormat format) {
        Table row = optionRow(name); Label value = new Label(format.value(initial), ui.skin, "accent"); Slider slider = new Slider(min, max, step, false, ui.skin); slider.setValue(initial);
        slider.addListener(new ChangeListener() { @Override public void changed(ChangeEvent event, Actor actor) { float v = slider.getValue(); setter.set(v); value.setText(format.value(v)); changedSetting(); } });
        row.add(slider).width(300f).height(28f).padLeft(22f); row.add(value).width(74f).right().padLeft(12f); content.add(row).row();
    }
    private void addToggle(String name, boolean initial, BoolSetter setter) {
        Table row = optionRow(name); CheckBox toggle = new CheckBox(initial ? "  ON" : "  OFF", ui.skin); toggle.setChecked(initial);
        toggle.addListener(new ChangeListener() { @Override public void changed(ChangeEvent event, Actor actor) { setter.set(toggle.isChecked()); toggle.setText(toggle.isChecked() ? "  ON" : "  OFF"); changedSetting(); } });
        row.add(toggle).width(118f).height(34f).right().padLeft(22f); content.add(row).row();
    }
    private void addCycle(String name, String initial, CycleValue cycle) {
        Table row = optionRow(name); TextButton b = new TextButton(initial, ui.skin);
        b.addListener(new ChangeListener() { @Override public void changed(ChangeEvent event, Actor actor) { b.setText(cycle.next()); changedSetting(); } });
        row.add(b).width(190f).height(40f).right().padLeft(22f); content.add(row).row();
    }
    private Table optionRow(String name) {
        Table row = new Table(); row.setBackground(ui.skin.getDrawable("panel")); row.pad(10f, 14f, 10f, 14f); Label label = new Label(name, ui.skin, "default"); label.setFontScale(.92f); row.add(label).expandX().left(); return row;
    }
    private TextButton makeButton(String text, String style, Runnable action) {
        TextButton b = new TextButton(text, ui.skin, style); b.addListener(new ChangeListener() { @Override public void changed(ChangeEvent event, Actor actor) { action.run(); } }); return b;
    }
    private void changedSetting() { dirty = true; dirtyLabel.setText("UNSAVED CHANGES"); }
    private void apply() { settings.save(game.saves); dirty = false; dirtyLabel.setText("SAVED"); }
    private void resetDefaults() { settings.copyFrom(GameSettings.defaults()); changedSetting(); showTab(tab); }
    private void back() { game.setScreen(new MainMenuScreen(game)); dispose(); }
    private static String percent(float v) { return Math.round(v * 100f) + "%"; }
    private static String fpsName(GameSettings.FrameRate r) { return r == GameSettings.FrameRate.FPS_30 ? "30 FPS" : r == GameSettings.FrameRate.FPS_60 ? "60 FPS" : "120 FPS"; }
    private static String pretty(String raw) { String s = raw.replace('_', ' ').toLowerCase(); return Character.toUpperCase(s.charAt(0)) + s.substring(1); }

    @Override public void render(float delta) {
        if (Gdx.input.isKeyJustPressed(Input.Keys.BACK) || Gdx.input.isKeyJustPressed(Input.Keys.ESCAPE)) { back(); return; }
        Gdx.gl.glClearColor(.015f, .028f, .04f, 1f); Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT); stage.act(Math.min(delta, 1f / 20f)); stage.draw();
    }
    @Override public void resize(int width, int height) { stage.getViewport().update(width, height, true); }
    @Override public void show() { Gdx.input.setCatchKey(Input.Keys.BACK, true); Gdx.input.setInputProcessor(stage); }
    @Override public void hide() {}
    @Override public void pause() { if (dirty) settings.save(game.saves); }
    @Override public void resume() { Gdx.input.setInputProcessor(stage); }
    @Override public void dispose() { stage.dispose(); ui.close(); }
}
