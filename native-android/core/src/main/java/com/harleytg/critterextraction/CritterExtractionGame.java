package com.harleytg.critterextraction;

import com.badlogic.gdx.Game;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Preferences;

public final class CritterExtractionGame extends Game {
    public static final String VERSION = "0.2.0-native-test1";
    public Preferences saves;

    @Override
    public void create() {
        saves = Gdx.app.getPreferences("critter-extraction-native-save");
        setScreen(new GameScreen(this));
    }
}
