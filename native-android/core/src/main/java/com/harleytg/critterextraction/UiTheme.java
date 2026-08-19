package com.harleytg.critterextraction;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.scenes.scene2d.ui.CheckBox;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Skin;
import com.badlogic.gdx.scenes.scene2d.ui.Slider;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.utils.Drawable;

/** Small code-built Scene2D skin for the native game UI. */
public final class UiTheme implements AutoCloseable {
    public static final Color CYAN = Color.valueOf("00B8F0");
    public static final Color CYAN_SOFT = Color.valueOf("7DDBF8");
    public static final Color TEXT = Color.valueOf("F4FAFC");
    public static final Color MUTED = Color.valueOf("96AAB4");
    public static final Color PANEL = Color.valueOf("101B22");
    public static final Color PANEL_2 = Color.valueOf("162630");
    public final Skin skin = new Skin();

    public UiTheme() {
        Pixmap px = new Pixmap(1, 1, Pixmap.Format.RGBA8888);
        px.setColor(Color.WHITE); px.fill();
        Texture white = new Texture(px); px.dispose();
        skin.add("white", white);
        BitmapFont font = new BitmapFont();
        font.getData().markupEnabled = true;
        skin.add("default-font", font);
        skin.add("panel", tint(PANEL));
        skin.add("panel2", tint(PANEL_2));
        skin.add("overlay", tint(new Color(.015f, .03f, .045f, .90f)));
        skin.add("button", tint(Color.valueOf("183541")));
        skin.add("buttonOver", tint(Color.valueOf("205064")));
        skin.add("buttonDown", tint(Color.valueOf("0A8DB8")));
        skin.add("buttonAccent", tint(Color.valueOf("087FA5")));
        skin.add("buttonAccentOver", tint(CYAN));
        skin.add("buttonDanger", tint(Color.valueOf("512D36")));
        skin.add("track", tint(Color.valueOf("263842")));
        skin.add("fill", tint(CYAN));
        skin.add("toggleOff", tint(Color.valueOf("334752")));
        skin.add("toggleOn", tint(CYAN));
        skin.add("default", new Label.LabelStyle(font, TEXT));
        skin.add("muted", new Label.LabelStyle(font, MUTED));
        skin.add("accent", new Label.LabelStyle(font, CYAN_SOFT));
        TextButton.TextButtonStyle normal = new TextButton.TextButtonStyle();
        normal.up = skin.getDrawable("button"); normal.over = skin.getDrawable("buttonOver"); normal.down = skin.getDrawable("buttonDown");
        normal.font = font; normal.fontColor = TEXT; normal.overFontColor = Color.WHITE;
        skin.add("default", normal);
        TextButton.TextButtonStyle accentButton = new TextButton.TextButtonStyle(normal);
        accentButton.up = skin.getDrawable("buttonAccent"); accentButton.over = skin.getDrawable("buttonAccentOver"); accentButton.fontColor = Color.WHITE;
        skin.add("accent", accentButton);
        TextButton.TextButtonStyle danger = new TextButton.TextButtonStyle(normal);
        danger.up = skin.getDrawable("buttonDanger"); danger.fontColor = Color.valueOf("FFD8DC");
        skin.add("danger", danger);
        Slider.SliderStyle slider = new Slider.SliderStyle();
        slider.background = skin.getDrawable("track"); slider.knob = skin.getDrawable("fill"); slider.knobBefore = skin.getDrawable("fill");
        skin.add("default-horizontal", slider);
        CheckBox.CheckBoxStyle check = new CheckBox.CheckBoxStyle();
        check.checkboxOff = skin.getDrawable("toggleOff"); check.checkboxOn = skin.getDrawable("toggleOn"); check.checkboxOver = skin.getDrawable("buttonOver");
        check.font = font; check.fontColor = TEXT;
        skin.add("default", check);
    }

    private Drawable tint(Color c) { return skin.newDrawable("white", c); }
    @Override public void close() { skin.dispose(); }
}
