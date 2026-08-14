package com.harleystudios.critterextraction;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Native Android shell modeled directly after main/live/index.html.
 * No WebView/browser page is created.
 */
public final class MainActivity extends Activity {
    private static final int TEXT=0xfff7f7ff,MUTED=0xffaeb2d1,MINT=0xff7ef7d4,CYAN=0xff63dff5,PURPLE=0xff8e82ff,DANGER=0xffff6f91;
    private Game3DView gameView;
    private FrameLayout gameRoot;

    @Override protected void onCreate(Bundle savedInstanceState){super.onCreate(savedInstanceState);try{setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);}catch(Throwable ignored){}enterImmersiveModeSafely();showMenu();}

    private void showMenu(){
        if(gameView!=null){try{gameView.pauseForLifecycle();}catch(Throwable ignored){}gameView=null;}
        LiveMenuView menu=new LiveMenuView(this);
        menu.setListener(new LiveMenuView.Listener(){
            @Override public void onPlaySolo(){showGame();}
            @Override public void onNextCritter(){cyclePreference("species",39);}
            @Override public void onNextWeapon(){cyclePreference("weapon",5);}
        });
        setContentView(menu);
    }

    private void cyclePreference(String key,int count){android.content.SharedPreferences p=getSharedPreferences("critter_native_3d",MODE_PRIVATE);p.edit().putInt(key,Math.floorMod(p.getInt(key,0)+1,count)).apply();}

    private void showGame(){
        try{
            gameRoot=new FrameLayout(this);gameRoot.setBackgroundColor(0xff111225);
            gameView=new Game3DView(this);gameRoot.addView(gameView,new FrameLayout.LayoutParams(-1,-1));
            LiveHudOverlay hud=new LiveHudOverlay(this,gameView);gameRoot.addView(hud,new FrameLayout.LayoutParams(-1,-1));
            addTouchControls(gameRoot);setContentView(gameRoot);gameView.resumeGameLoop();
        }catch(Throwable error){showStartupFailure(error);}
    }

    private void addTouchControls(FrameLayout root){
        float d=getResources().getDisplayMetrics().density;
        int top=(int)(12*d),gap=(int)(7*d),h=(int)(38*d);
        int x=(int)(16*d);
        addButton(root,"Inventory",Gravity.TOP|Gravity.RIGHT,x,top,(int)(82*d),h,v->showInventory());x+=(int)(89*d);
        addButton(root,"Pause",Gravity.TOP|Gravity.RIGHT,x,top,(int)(67*d),h,v->showPause());x+=(int)(74*d);
        addButton(root,"Leave",Gravity.TOP|Gravity.RIGHT,x,top,(int)(62*d),h,v->showMenu());

        int touchTop=(int)(54*d);int right=(int)(14*d);
        addButton(root,"Ⅱ",Gravity.TOP|Gravity.RIGHT,right,touchTop,(int)(44*d),(int)(38*d),v->showPause());right+=(int)(50*d);
        addButton(root,"BAG",Gravity.TOP|Gravity.RIGHT,right,touchTop,(int)(54*d),(int)(38*d),v->showInventory());right+=(int)(60*d);
        addButton(root,"CAM",Gravity.TOP|Gravity.RIGHT,right,touchTop,(int)(54*d),(int)(38*d),v->gameView.toggleCamera());right+=(int)(60*d);
        addButton(root,"↔",Gravity.TOP|Gravity.RIGHT,right,touchTop,(int)(44*d),(int)(38*d),v->gameView.toggleShoulder());right+=(int)(50*d);
        addButton(root,"JUMP",Gravity.TOP|Gravity.RIGHT,right,touchTop,(int)(64*d),(int)(38*d),v->gameView.jump());

        int bottom=(int)(18*d);right=(int)(14*d);
        Button fire=addButton(root,"FIRE",Gravity.BOTTOM|Gravity.RIGHT,right,bottom,(int)(72*d),(int)(72*d),v->gameView.fireOnce());
        fire.setTextSize(12);fire.setBackground(panel(0xdd512f66,36,0x999f79ff));right+=(int)(80*d);
        addButton(root,"AIM",Gravity.BOTTOM|Gravity.RIGHT,right,bottom+(int)(7*d),(int)(58*d),(int)(58*d),v->{});right+=(int)(65*d);
        addButton(root,"USE",Gravity.BOTTOM|Gravity.RIGHT,right,bottom+(int)(7*d),(int)(58*d),(int)(58*d),v->{});right+=(int)(65*d);
        addButton(root,"+",Gravity.BOTTOM|Gravity.RIGHT,right,bottom+(int)(7*d),(int)(52*d),(int)(52*d),v->gameView.heal());right+=(int)(59*d);
        addButton(root,"R",Gravity.BOTTOM|Gravity.RIGHT,right,bottom+(int)(7*d),(int)(52*d),(int)(52*d),v->{});right+=(int)(59*d);
        addButton(root,"C",Gravity.BOTTOM|Gravity.RIGHT,right,bottom+(int)(7*d),(int)(52*d),(int)(52*d),v->gameView.dash());
    }

    private Button addButton(FrameLayout root,String text,int gravity,int side,int vertical,int width,int height,View.OnClickListener click){
        Button b=new Button(this);b.setText(text);b.setAllCaps(false);b.setTextColor(TEXT);b.setTextSize(10);b.setPadding(0,0,0,0);b.setMinWidth(0);b.setMinHeight(0);b.setBackground(panel(0xb30a0b1b,12,0x55ffffff));b.setOnClickListener(click);
        FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(width,height,gravity);if((gravity&Gravity.RIGHT)==Gravity.RIGHT)lp.rightMargin=side;else lp.leftMargin=side;if((gravity&Gravity.BOTTOM)==Gravity.BOTTOM)lp.bottomMargin=vertical;else lp.topMargin=vertical;root.addView(b,lp);return b;
    }

    private void showInventory(){
        if(gameRoot==null||gameView==null)return;gameView.pauseForLifecycle();
        FrameLayout shade=new FrameLayout(this);shade.setBackgroundColor(0xcc050612);shade.setClickable(true);
        LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(dp(20),dp(18),dp(20),dp(18));card.setBackground(panel(0xff292b51,22,0x44ffffff));
        TextView eyebrow=label("ACCOUNT STORAGE",9,MINT,true);card.addView(eyebrow);TextView title=label("Stash & Loadout",28,TEXT,true);card.addView(title);
        TextView summary=label("BACKPACK WEIGHT     0.0 / 25.0 kg     •     MOONBERRIES     "+gameView.loot()+" / 8     •     ACCOUNT PETALS     🌸 "+gameView.petals(),11,MUTED,false);summary.setPadding(0,dp(12),0,dp(12));card.addView(summary);
        TextView equipped=label("EQUIPPED\nPRIMARY   "+gameView.weaponName()+"\nARMOR     Leaf Vest\nBACKPACK  Critter Pack\n\nCARRIED ITEMS\nMedkits × "+gameView.medkits()+"\n\nSAFE STORAGE\nExtracted loot remains on this device.",13,TEXT,false);equipped.setBackground(panel(0x55111225,14,0x22ffffff));equipped.setPadding(dp(14),dp(14),dp(14),dp(14));card.addView(equipped,new LinearLayout.LayoutParams(-1,0,1));
        Button done=modalButton("Done",true);done.setOnClickListener(v->{gameRoot.removeView(shade);gameView.resumeGameLoop();});card.addView(done,new LinearLayout.LayoutParams(-1,dp(46)));
        shade.addView(card,new FrameLayout.LayoutParams(Math.min(dp(760),getResources().getDisplayMetrics().widthPixels-dp(40)),Math.min(dp(470),getResources().getDisplayMetrics().heightPixels-dp(36)),Gravity.CENTER));gameRoot.addView(shade,new FrameLayout.LayoutParams(-1,-1));
    }

    private void showPause(){
        if(gameRoot==null||gameView==null)return;gameView.pauseForLifecycle();
        FrameLayout shade=new FrameLayout(this);shade.setBackgroundColor(0xcc050612);shade.setClickable(true);
        LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(dp(20),dp(18),dp(20),dp(18));card.setBackground(panel(0xff292b51,22,0x44ffffff));
        card.addView(label("MATCH PAUSED",9,MINT,true));card.addView(label("Pause Menu",28,TEXT,true));
        TextView info=label("Critter Extraction\n"+gameView.speciesName()+" • "+gameView.weaponName()+"\n\nYour current native 3D run is paused.",12,MUTED,false);info.setPadding(0,dp(16),0,dp(14));card.addView(info,new LinearLayout.LayoutParams(-1,0,1));
        Button resume=modalButton("Resume",true);resume.setOnClickListener(v->{gameRoot.removeView(shade);gameView.resumeGameLoop();});card.addView(resume,new LinearLayout.LayoutParams(-1,dp(46)));
        Button inventory=modalButton("Inventory",false);inventory.setOnClickListener(v->{gameRoot.removeView(shade);gameView.resumeGameLoop();showInventory();});card.addView(inventory,new LinearLayout.LayoutParams(-1,dp(46)));
        Button leave=modalButton("Leave Drop",false);leave.setTextColor(0xffffb0c2);leave.setOnClickListener(v->showMenu());card.addView(leave,new LinearLayout.LayoutParams(-1,dp(46)));
        shade.addView(card,new FrameLayout.LayoutParams(dp(380),Math.min(dp(390),getResources().getDisplayMetrics().heightPixels-dp(40)),Gravity.CENTER));gameRoot.addView(shade,new FrameLayout.LayoutParams(-1,-1));
    }

    private Button modalButton(String text,boolean primary){Button b=new Button(this);b.setText(text);b.setAllCaps(false);b.setTextColor(primary?0xff111526:TEXT);b.setTextSize(12);b.setBackground(primary?gradientPanel():panel(0x22ffffff,12,0x44ffffff));return b;}
    private TextView label(String text,float size,int color,boolean bold){TextView t=new TextView(this);t.setText(text);t.setTextSize(size);t.setTextColor(color);t.setTypeface(android.graphics.Typeface.create("sans",bold?android.graphics.Typeface.BOLD:android.graphics.Typeface.NORMAL));return t;}
    private GradientDrawable gradientPanel(){GradientDrawable g=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{MINT,CYAN});g.setCornerRadius(dp(12));return g;}
    private GradientDrawable panel(int color,float radius,int strokeColor){GradientDrawable g=new GradientDrawable();g.setColor(color);g.setCornerRadius(dp((int)radius));g.setStroke(dp(1),strokeColor);return g;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}

    private void enterImmersiveModeSafely(){try{getWindow().setDecorFitsSystemWindows(false);WindowInsetsController c=getWindow().getInsetsController();if(c!=null){c.hide(WindowInsets.Type.statusBars()|WindowInsets.Type.navigationBars());c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);}}catch(Throwable ignored){getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);}}
    private void showStartupFailure(Throwable error){gameView=null;TextView m=new TextView(this);m.setGravity(Gravity.CENTER);m.setTextColor(Color.WHITE);m.setBackgroundColor(0xff111225);m.setTextSize(18);String t=error==null?"Unknown":error.getClass().getSimpleName();m.setText("CRITTER EXTRACTION\n\nNative OpenGL startup failed.\n"+t+"\n\nScreenshot this screen so this device can be fixed.");m.setPadding(48,48,48,48);setContentView(m);}
    @Override protected void onResume(){super.onResume();enterImmersiveModeSafely();if(gameView!=null)gameView.resumeGameLoop();}
    @Override protected void onPause(){if(gameView!=null)gameView.pauseForLifecycle();super.onPause();}
    @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)enterImmersiveModeSafely();}
    @Override public void onBackPressed(){if(gameView!=null)showPause();else super.onBackPressed();}
}
