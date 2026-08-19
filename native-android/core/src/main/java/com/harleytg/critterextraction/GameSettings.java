package com.harleytg.critterextraction;

import com.badlogic.gdx.Preferences;
import com.badlogic.gdx.math.MathUtils;

/** Persistent native game settings shared by the menus and gameplay runtime. */
public final class GameSettings {
    public enum Quality { LOW, MEDIUM, HIGH }
    public enum FrameRate { FPS_30, FPS_60, FPS_120 }
    public enum ColorMode { OFF, DEUTERANOPIA, PROTANOPIA, TRITANOPIA }

    public float renderScale;
    public FrameRate frameRate;
    public Quality effectsQuality;
    public boolean shadows;
    public float fieldOfView;
    public float masterVolume;
    public float musicVolume;
    public float effectsVolume;
    public boolean muted;
    public float lookSensitivity;
    public float aimSensitivity;
    public boolean invertY;
    public boolean vibration;
    public boolean leftHanded;
    public float uiScale;
    public boolean reducedMotion;
    public boolean highContrastHud;
    public float crosshairScale;
    public ColorMode colorMode;

    public static GameSettings defaults() {
        GameSettings s = new GameSettings();
        s.renderScale = 1f;
        s.frameRate = FrameRate.FPS_60;
        s.effectsQuality = Quality.HIGH;
        s.shadows = true;
        s.fieldOfView = 75f;
        s.masterVolume = 1f;
        s.musicVolume = .72f;
        s.effectsVolume = .9f;
        s.muted = false;
        s.lookSensitivity = 1f;
        s.aimSensitivity = .8f;
        s.invertY = false;
        s.vibration = true;
        s.leftHanded = false;
        s.uiScale = 1f;
        s.reducedMotion = false;
        s.highContrastHud = false;
        s.crosshairScale = 1f;
        s.colorMode = ColorMode.OFF;
        return s;
    }

    public static GameSettings load(Preferences p) {
        GameSettings d = defaults();
        GameSettings s = new GameSettings();
        s.renderScale = clamp(p.getFloat("settings.renderScale", d.renderScale), .6f, 1f);
        s.frameRate = enumValue(FrameRate.class, p.getString("settings.frameRate", d.frameRate.name()), d.frameRate);
        s.effectsQuality = enumValue(Quality.class, p.getString("settings.effectsQuality", d.effectsQuality.name()), d.effectsQuality);
        s.shadows = p.getBoolean("settings.shadows", d.shadows);
        s.fieldOfView = clamp(p.getFloat("settings.fieldOfView", d.fieldOfView), 65f, 100f);
        s.masterVolume = unit(p.getFloat("settings.masterVolume", d.masterVolume));
        s.musicVolume = unit(p.getFloat("settings.musicVolume", d.musicVolume));
        s.effectsVolume = unit(p.getFloat("settings.effectsVolume", d.effectsVolume));
        s.muted = p.getBoolean("settings.muted", d.muted);
        s.lookSensitivity = clamp(p.getFloat("settings.lookSensitivity", d.lookSensitivity), .35f, 2f);
        s.aimSensitivity = clamp(p.getFloat("settings.aimSensitivity", d.aimSensitivity), .25f, 1.5f);
        s.invertY = p.getBoolean("settings.invertY", d.invertY);
        s.vibration = p.getBoolean("settings.vibration", d.vibration);
        s.leftHanded = p.getBoolean("settings.leftHanded", d.leftHanded);
        s.uiScale = clamp(p.getFloat("settings.uiScale", d.uiScale), .8f, 1.3f);
        s.reducedMotion = p.getBoolean("settings.reducedMotion", d.reducedMotion);
        s.highContrastHud = p.getBoolean("settings.highContrastHud", d.highContrastHud);
        s.crosshairScale = clamp(p.getFloat("settings.crosshairScale", d.crosshairScale), .7f, 1.6f);
        s.colorMode = enumValue(ColorMode.class, p.getString("settings.colorMode", d.colorMode.name()), d.colorMode);
        return s;
    }

    public void save(Preferences p) {
        p.putFloat("settings.renderScale", renderScale)
            .putString("settings.frameRate", frameRate.name())
            .putString("settings.effectsQuality", effectsQuality.name())
            .putBoolean("settings.shadows", shadows)
            .putFloat("settings.fieldOfView", fieldOfView)
            .putFloat("settings.masterVolume", masterVolume)
            .putFloat("settings.musicVolume", musicVolume)
            .putFloat("settings.effectsVolume", effectsVolume)
            .putBoolean("settings.muted", muted)
            .putFloat("settings.lookSensitivity", lookSensitivity)
            .putFloat("settings.aimSensitivity", aimSensitivity)
            .putBoolean("settings.invertY", invertY)
            .putBoolean("settings.vibration", vibration)
            .putBoolean("settings.leftHanded", leftHanded)
            .putFloat("settings.uiScale", uiScale)
            .putBoolean("settings.reducedMotion", reducedMotion)
            .putBoolean("settings.highContrastHud", highContrastHud)
            .putFloat("settings.crosshairScale", crosshairScale)
            .putString("settings.colorMode", colorMode.name())
            .flush();
    }

    public void copyFrom(GameSettings other) {
        renderScale = other.renderScale;
        frameRate = other.frameRate;
        effectsQuality = other.effectsQuality;
        shadows = other.shadows;
        fieldOfView = other.fieldOfView;
        masterVolume = other.masterVolume;
        musicVolume = other.musicVolume;
        effectsVolume = other.effectsVolume;
        muted = other.muted;
        lookSensitivity = other.lookSensitivity;
        aimSensitivity = other.aimSensitivity;
        invertY = other.invertY;
        vibration = other.vibration;
        leftHanded = other.leftHanded;
        uiScale = other.uiScale;
        reducedMotion = other.reducedMotion;
        highContrastHud = other.highContrastHud;
        crosshairScale = other.crosshairScale;
        colorMode = other.colorMode;
    }

    public int fps() {
        return switch (frameRate) {
            case FPS_30 -> 30;
            case FPS_60 -> 60;
            case FPS_120 -> 120;
        };
    }

    private static float unit(float v) { return clamp(v, 0f, 1f); }
    private static float clamp(float v, float min, float max) { return MathUtils.clamp(v, min, max); }

    private static <T extends Enum<T>> T enumValue(Class<T> cls, String value, T fallback) {
        try { return Enum.valueOf(cls, value); }
        catch (Exception ignored) { return fallback; }
    }
}
