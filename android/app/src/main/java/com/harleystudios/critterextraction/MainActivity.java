package com.harleystudios.critterextraction;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.TextView;

/**
 * Native Android launcher. No WebView, browser engine, or remote page is used.
 */
public final class MainActivity extends Activity {
    private GameView gameView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        } catch (RuntimeException ignored) {
            // Some OEM builds can reject orientation changes during activity creation.
            // The manifest still requests landscape, so startup should continue.
        }

        enterImmersiveModeSafely();

        try {
            gameView = new GameView(this);
            setContentView(gameView);
        } catch (Throwable startupError) {
            // Never leave the user with an unexplained instant-close startup failure.
            showStartupFailure(startupError);
        }
    }

    private void enterImmersiveModeSafely() {
        try {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } catch (Throwable ignored) {
            // Fullscreen is optional. Gameplay must still launch if an OEM rejects it.
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
    }

    private void showStartupFailure(Throwable error) {
        gameView = null;
        TextView message = new TextView(this);
        message.setGravity(Gravity.CENTER);
        message.setTextColor(Color.WHITE);
        message.setBackgroundColor(Color.rgb(7, 17, 23));
        message.setTextSize(18f);
        String type = error == null ? "Unknown startup error" : error.getClass().getSimpleName();
        message.setText("CRITTER EXTRACTION\n\nNative Android startup failed.\n" + type +
                "\n\nPlease screenshot this screen so the exact device issue can be fixed.");
        message.setPadding(48, 48, 48, 48);
        setContentView(message);
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveModeSafely();
        if (gameView != null) gameView.resumeGameLoop();
    }

    @Override
    protected void onPause() {
        if (gameView != null) gameView.pauseForLifecycle();
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersiveModeSafely();
    }
}
