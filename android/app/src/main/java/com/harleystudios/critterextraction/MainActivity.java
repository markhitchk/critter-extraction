package com.harleystudios.critterextraction;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;

/** Native Android 3D launcher. No WebView/browser page is created. */
public final class MainActivity extends Activity {
    private Game3DView gameView;
    private TextView hud;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable hudTick=new Runnable(){@Override public void run(){if(gameView!=null&&hud!=null)hud.setText(gameView.status());handler.postDelayed(this,180);}};

    @Override protected void onCreate(Bundle savedInstanceState){super.onCreate(savedInstanceState);try{setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);}catch(Throwable ignored){}enterImmersiveModeSafely();
        try{FrameLayout root=new FrameLayout(this);gameView=new Game3DView(this);root.addView(gameView,new FrameLayout.LayoutParams(-1,-1));buildHud(root);setContentView(root);handler.post(hudTick);}catch(Throwable error){showStartupFailure(error);}}

    private void buildHud(FrameLayout root){
        hud=new TextView(this);hud.setTextColor(Color.WHITE);hud.setTextSize(13f);hud.setPadding(dp(12),dp(8),dp(12),dp(8));hud.setBackground(panel(0xcc071117,16));
        FrameLayout.LayoutParams hp=new FrameLayout.LayoutParams(dp(570),FrameLayout.LayoutParams.WRAP_CONTENT,Gravity.TOP|Gravity.LEFT);hp.setMargins(dp(12),dp(12),0,0);root.addView(hud,hp);
        Button crit=button("CRITTER");crit.setOnClickListener(v->gameView.nextSpecies());add(root,crit,Gravity.TOP|Gravity.RIGHT,dp(12),dp(12),dp(110),dp(48));
        Button cam=button("CAM");cam.setOnClickListener(v->gameView.toggleCamera());add(root,cam,Gravity.TOP|Gravity.RIGHT,dp(130),dp(12),dp(88),dp(48));
        Button weapon=button("WEAPON");weapon.setOnClickListener(v->gameView.nextWeapon());add(root,weapon,Gravity.TOP|Gravity.RIGHT,dp(226),dp(12),dp(110),dp(48));
        Button dash=button("DASH");dash.setOnClickListener(v->gameView.dash());add(root,dash,Gravity.BOTTOM|Gravity.RIGHT,dp(18),dp(22),dp(105),dp(58));
        Button med=button("MED");med.setOnClickListener(v->gameView.heal());add(root,med,Gravity.BOTTOM|Gravity.RIGHT,dp(132),dp(22),dp(95),dp(58));
        TextView hint=new TextView(this);hint.setText("LEFT: MOVE     RIGHT: AIM + AUTO-FIRE     GREEN RING: EXTRACT");hint.setTextColor(0xffb9ddea);hint.setTextSize(11f);hint.setGravity(Gravity.CENTER);hint.setBackground(panel(0x88071117,12));
        FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(dp(460),dp(34),Gravity.BOTTOM|Gravity.CENTER_HORIZONTAL);p.bottomMargin=dp(12);root.addView(hint,p);
    }
    private void add(FrameLayout root,View v,int gravity,int rightOrLeft,int topOrBottom,int w,int h){FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(w,h,gravity);if((gravity&Gravity.RIGHT)==Gravity.RIGHT)p.rightMargin=rightOrLeft;else p.leftMargin=rightOrLeft;if((gravity&Gravity.BOTTOM)==Gravity.BOTTOM)p.bottomMargin=topOrBottom;else p.topMargin=topOrBottom;root.addView(v,p);}
    private Button button(String text){Button b=new Button(this);b.setText(text);b.setTextColor(Color.WHITE);b.setTextSize(12f);b.setAllCaps(false);b.setBackground(panel(0xdd10303b,18));b.setPadding(dp(8),0,dp(8),0);return b;}
    private GradientDrawable panel(int color,float radius){GradientDrawable g=new GradientDrawable();g.setColor(color);g.setCornerRadius(dp((int)radius));g.setStroke(dp(1),0xff39788c);return g;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}

    private void enterImmersiveModeSafely(){try{getWindow().setDecorFitsSystemWindows(false);WindowInsetsController c=getWindow().getInsetsController();if(c!=null){c.hide(WindowInsets.Type.statusBars()|WindowInsets.Type.navigationBars());c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);}}catch(Throwable ignored){getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);}}
    private void showStartupFailure(Throwable error){handler.removeCallbacks(hudTick);gameView=null;TextView m=new TextView(this);m.setGravity(Gravity.CENTER);m.setTextColor(Color.WHITE);m.setBackgroundColor(Color.rgb(7,17,23));m.setTextSize(18);String t=error==null?"Unknown":error.getClass().getSimpleName();m.setText("CRITTER EXTRACTION 3D\n\nNative OpenGL startup failed.\n"+t+"\n\nScreenshot this screen so this device can be fixed.");m.setPadding(48,48,48,48);setContentView(m);}
    @Override protected void onResume(){super.onResume();enterImmersiveModeSafely();if(gameView!=null)gameView.resumeGameLoop();}
    @Override protected void onPause(){if(gameView!=null)gameView.pauseForLifecycle();super.onPause();}
    @Override protected void onDestroy(){handler.removeCallbacks(hudTick);super.onDestroy();}
    @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)enterImmersiveModeSafely();}
}
