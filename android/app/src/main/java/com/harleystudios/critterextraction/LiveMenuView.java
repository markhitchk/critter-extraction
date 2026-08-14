package com.harleystudios.critterextraction;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Handler;
import android.os.Looper;
import android.view.MotionEvent;
import android.view.View;

/**
 * Native reproduction of main/live/index.html + base.css menu/boot presentation.
 * It uses the same repository art and palette but never creates a WebView.
 */
public final class LiveMenuView extends View {
    public interface Listener { void onPlaySolo(); void onNextCritter(); void onNextWeapon(); }

    private static final int BG = 0xff111225;
    private static final int PANEL = 0xff26284c;
    private static final int PANEL_DARK = 0xff171932;
    private static final int TEXT = 0xfff7f7ff;
    private static final int MUTED = 0xffaeb2d1;
    private static final int MINT = 0xff7ef7d4;
    private static final int CYAN = 0xff63dff5;
    private static final int PURPLE = 0xff8e82ff;
    private static final int YELLOW = 0xffffd36f;

    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final AssetLibrary assets;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final RectF playRect = new RectF();
    private final RectF critterRect = new RectF();
    private final RectF weaponRect = new RectF();
    private Bitmap logo;
    private Bitmap hero;
    private Bitmap critter;
    private Bitmap weapon;
    private Listener listener;
    private boolean boot = true;
    private float bootProgress;
    private long bootStart = System.currentTimeMillis();

    public LiveMenuView(Context context) {
        super(context);
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        assets = new AssetLibrary(context);
        logo = assets.loadBitmap("branding/HTG.png");
        hero = assets.loadBitmap("loading/cinematic-gameplay-fullhd.webp");
        critter = assets.renderSvg("characters/puppy.svg", 420);
        weapon = assets.renderSvg("weapons/pea_popper.svg", 240);
        p.setTypeface(android.graphics.Typeface.create("sans", android.graphics.Typeface.NORMAL));
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(dp(1));
        handler.post(frame);
    }

    public void setListener(Listener value) { listener = value; }

    private final Runnable frame = new Runnable() {
        @Override public void run() {
            if (boot) {
                long elapsed = System.currentTimeMillis() - bootStart;
                bootProgress = Math.min(1f, elapsed / 1250f);
                if (bootProgress >= 1f) boot = false;
                invalidate();
                if (boot) handler.postDelayed(this, 16);
            }
        }
    };

    @Override protected void onDetachedFromWindow() {
        handler.removeCallbacks(frame);
        super.onDetachedFromWindow();
    }

    @Override protected void onDraw(Canvas c) {
        super.onDraw(c);
        if (boot) drawBoot(c); else drawMenu(c);
    }

    private void drawBoot(Canvas c) {
        int w = getWidth(), h = getHeight();
        p.setShader(new LinearGradient(0, 0, w, h, 0xff15162b, 0xff090b15, Shader.TileMode.CLAMP));
        c.drawRect(0,0,w,h,p); p.setShader(null);
        float cardW = Math.min(w * .58f, dp(720));
        float cardH = Math.min(h * .68f, dp(520));
        RectF card = new RectF((w-cardW)/2f,(h-cardH)/2f,(w+cardW)/2f,(h+cardH)/2f);
        panel(c, card, 0xee171932, dp(26), 0x4463dff5);
        float logoSize = Math.min(cardH * .34f, dp(170));
        if (logo != null) c.drawBitmap(logo, null, new RectF(card.centerX()-logoSize/2, card.top+dp(24), card.centerX()+logoSize/2, card.top+dp(24)+logoSize), p);
        text(c,"HARLEY’S STUDIOS PRESENTS",card.centerX(),card.top+logoSize+dp(48),dp(12),MINT,Paint.Align.CENTER,true);
        text(c,"Critter Extraction",card.centerX(),card.top+logoSize+dp(86),dp(32),TEXT,Paint.Align.CENTER,true);
        text(c,"Cinematic critters. Tactical cover. Bigger extraction runs.",card.centerX(),card.top+logoSize+dp(116),dp(13),MUTED,Paint.Align.CENTER,false);
        RectF track = new RectF(card.left+dp(56),card.bottom-dp(74),card.right-dp(56),card.bottom-dp(62));
        round(c, track, 0xff0d1021, dp(8));
        RectF fill = new RectF(track.left,track.top,track.left+track.width()*bootProgress,track.bottom);
        p.setShader(new LinearGradient(fill.left,0,fill.right,0,MINT,CYAN,Shader.TileMode.CLAMP)); c.drawRoundRect(fill,dp(8),dp(8),p); p.setShader(null);
        text(c,"Loading refreshed critters, regional map assets, weapons, and HUD…",card.centerX(),card.bottom-dp(32),dp(11),MUTED,Paint.Align.CENTER,false);
    }

    private void drawMenu(Canvas c) {
        int w=getWidth(),h=getHeight();
        p.setShader(new LinearGradient(0,0,w,h,0xff26264d,BG,Shader.TileMode.CLAMP)); c.drawRect(0,0,w,h,p); p.setShader(null);
        float topH=Math.max(dp(62),h*.095f);
        round(c,new RectF(0,0,w,topH),0xe60e0f1f,0);
        if(logo!=null)c.drawBitmap(logo,null,new RectF(dp(16),dp(8),dp(16)+topH-dp(16),topH-dp(8)),p);
        text(c,"Critter Extraction",dp(82),topH*.43f,dp(19),TEXT,Paint.Align.LEFT,true);
        text(c,"v0.22.0 • Harley’s Studios • Cartoon-Realistic Extraction Shooter",dp(82),topH*.69f,dp(10),MUTED,Paint.Align.LEFT,false);
        chip(c,"Controls",w-dp(372),topH*.22f,dp(88),topH*.56f,false);
        chip(c,"Settings",w-dp(276),topH*.22f,dp(88),topH*.56f,false);
        chip(c,"🌸 0 Petals",w-dp(180),topH*.22f,dp(104),topH*.56f,true);
        chip(c,"New Critter",w-dp(68),topH*.22f,dp(64),topH*.56f,false);

        float margin=dp(18), gap=dp(14), usableH=h-topH-margin*2;
        float heroH=Math.min(usableH*.55f,dp(410));
        RectF heroCard=new RectF(margin,topH+margin,w-margin,topH+margin+heroH);
        panel(c,heroCard,0xf226284c,dp(24),0x22ffffff);
        float split=heroCard.left+heroCard.width()*.56f;
        RectF heroImage=new RectF(split,heroCard.top,heroCard.right,heroCard.bottom);
        if(hero!=null){Rect src=crop(hero,heroImage);c.save();c.clipRect(heroImage);c.drawBitmap(hero,src,heroImage,p);c.restore();}
        else round(c,heroImage,0xff438d70,dp(24));
        p.setShader(new LinearGradient(heroImage.left,0,heroImage.left+heroImage.width()*.32f,0,0xf226284c,0x0026284c,Shader.TileMode.CLAMP));c.drawRect(heroImage.left,heroImage.top,heroImage.left+heroImage.width()*.36f,heroImage.bottom,p);p.setShader(null);
        text(c,"HARLEY’S STUDIOS • MODERN-BROWSER READY • PROCEDURAL MAPS",heroCard.left+dp(30),heroCard.top+dp(38),dp(10),MINT,Paint.Align.LEFT,true);
        text(c,"Choose your critter. Build your kit.",heroCard.left+dp(30),heroCard.top+dp(88),dp(31),TEXT,Paint.Align.LEFT,true);
        text(c,"Bring the loot home.",heroCard.left+dp(30),heroCard.top+dp(126),dp(31),TEXT,Paint.Align.LEFT,true);
        text(c,"Drop into a colorful procedural region, fight raiders, collect Moonberries,",heroCard.left+dp(30),heroCard.top+dp(162),dp(12),0xffc8cae1,Paint.Align.LEFT,false);
        text(c,"complete the contract, and reach the extraction beacon alive.",heroCard.left+dp(30),heroCard.top+dp(181),dp(12),0xffc8cae1,Paint.Align.LEFT,false);

        float btnY=heroCard.bottom-dp(70),btnH=dp(44);
        playRect.set(heroCard.left+dp(30),btnY,heroCard.left+dp(152),btnY+btnH);
        gradientButton(c,playRect,"Play Solo",MINT,CYAN,true);
        gradientButton(c,new RectF(playRect.right+dp(9),btnY,playRect.right+dp(158),btnY+btnH),"Host Multiplayer",PURPLE,0xff5d57b5,false);
        gradientButton(c,new RectF(playRect.right+dp(167),btnY,playRect.right+dp(306),btnY+btnH),"Join Multiplayer",PURPLE,0xff5d57b5,false);

        float cardsTop=heroCard.bottom+gap, cardsBottom=h-margin;
        float cardW=(w-margin*2-gap*2)/3f;
        RectF profile=new RectF(margin,cardsTop,margin+cardW,cardsBottom);
        RectF career=new RectF(profile.right+gap,cardsTop,profile.right+gap+cardW,cardsBottom);
        RectF loadout=new RectF(career.right+gap,cardsTop,w-margin,cardsBottom);
        panel(c,profile,0xf226284c,dp(20),0x22ffffff); panel(c,career,0xf226284c,dp(20),0x22ffffff); panel(c,loadout,0xf226284c,dp(20),0x22ffffff);
        text(c,"ACTIVE ACCOUNT",profile.left+dp(18),profile.top+dp(24),dp(9),MINT,Paint.Align.LEFT,true);
        text(c,"New Critter",profile.left+dp(18),profile.top+dp(50),dp(21),TEXT,Paint.Align.LEFT,true);
        if(critter!=null)c.drawBitmap(critter,null,new RectF(profile.left+dp(18),profile.top+dp(66),profile.left+dp(96),profile.top+dp(144)),p);
        text(c,"@rookie",profile.left+dp(112),profile.top+dp(92),dp(13),TEXT,Paint.Align.LEFT,true);
        text(c,"Ready for the meadow.",profile.left+dp(112),profile.top+dp(114),dp(10),MUTED,Paint.Align.LEFT,false);
        text(c,"Level 1",profile.left+dp(18),profile.bottom-dp(38),dp(10),MUTED,Paint.Align.LEFT,false);
        round(c,new RectF(profile.left+dp(18),profile.bottom-dp(25),profile.right-dp(18),profile.bottom-dp(18)),0xff111328,dp(5));

        text(c,"CAREER",career.left+dp(18),career.top+dp(24),dp(9),MINT,Paint.Align.LEFT,true);
        text(c,"Extraction Record",career.left+dp(18),career.top+dp(50),dp(21),TEXT,Paint.Align.LEFT,true);
        stat(c,career.left+dp(18),career.top+dp(76),"0","EXTRACTS"); stat(c,career.centerX()+dp(4),career.top+dp(76),"0","BERRIES");
        stat(c,career.left+dp(18),career.top+dp(138),"0","CRITTERS"); stat(c,career.centerX()+dp(4),career.top+dp(138),"0","DROPS");

        text(c,"SELECTED LOADOUT",loadout.left+dp(18),loadout.top+dp(24),dp(9),MINT,Paint.Align.LEFT,true);
        text(c,"Meadow Scout",loadout.left+dp(18),loadout.top+dp(50),dp(21),TEXT,Paint.Align.LEFT,true);
        weaponRect.set(loadout.left+dp(16),loadout.top+dp(66),loadout.right-dp(16),loadout.top+dp(126));
        round(c,weaponRect,0x18ffffff,dp(14));
        if(weapon!=null)c.drawBitmap(weapon,null,new RectF(weaponRect.left+dp(8),weaponRect.top+dp(5),weaponRect.left+dp(62),weaponRect.bottom-dp(5)),p);
        text(c,"Pea Popper",weaponRect.left+dp(72),weaponRect.top+dp(25),dp(13),TEXT,Paint.Align.LEFT,true);
        text(c,"Balanced semi-auto berry blaster",weaponRect.left+dp(72),weaponRect.top+dp(44),dp(9),MUTED,Paint.Align.LEFT,false);
        critterRect.set(loadout.left+dp(16),loadout.bottom-dp(50),loadout.right-dp(16),loadout.bottom-dp(12));
        gradientButton(c,critterRect,"Character  •  Change Critter",PURPLE,0xff5d57b5,false);
    }

    @Override public boolean onTouchEvent(MotionEvent e) {
        if (boot || e.getActionMasked()!=MotionEvent.ACTION_UP) return true;
        float x=e.getX(),y=e.getY();
        if(playRect.contains(x,y)){ if(listener!=null)listener.onPlaySolo(); return true; }
        if(critterRect.contains(x,y)){ if(listener!=null)listener.onNextCritter(); invalidate(); return true; }
        if(weaponRect.contains(x,y)){ if(listener!=null)listener.onNextWeapon(); invalidate(); return true; }
        return true;
    }

    private void stat(Canvas c,float x,float y,String value,String label){round(c,new RectF(x,y,x+dp(108),y+dp(52)),0x12ffffff,dp(13));text(c,value,x+dp(12),y+dp(25),dp(24),TEXT,Paint.Align.LEFT,true);text(c,label,x+dp(12),y+dp(42),dp(8),MUTED,Paint.Align.LEFT,true);}
    private Rect crop(Bitmap b,RectF dst){float br=b.getWidth()/(float)b.getHeight(),dr=dst.width()/dst.height();if(br>dr){int sw=Math.round(b.getHeight()*dr),sx=(b.getWidth()-sw)/2;return new Rect(sx,0,sx+sw,b.getHeight());}int sh=Math.round(b.getWidth()/dr),sy=(b.getHeight()-sh)/2;return new Rect(0,sy,b.getWidth(),sy+sh);}
    private void chip(Canvas c,String s,float x,float y,float w,float h,boolean mint){RectF r=new RectF(x,y,x+w,y+h);panel(c,r,mint?0x227ef7d4:0x12ffffff,dp(12),mint?0x667ef7d4:0x22ffffff);text(c,s,r.centerX(),r.centerY()+dp(4),dp(10),mint?MINT:TEXT,Paint.Align.CENTER,true);}
    private void gradientButton(Canvas c,RectF r,String s,int a,int b,boolean darkText){p.setShader(new LinearGradient(r.left,r.top,r.right,r.bottom,a,b,Shader.TileMode.CLAMP));c.drawRoundRect(r,dp(12),dp(12),p);p.setShader(null);text(c,s,r.centerX(),r.centerY()+dp(5),dp(11),darkText?0xff111526:TEXT,Paint.Align.CENTER,true);}
    private void panel(Canvas c,RectF r,int color,float radius,int border){round(c,r,color,radius);stroke.setColor(border);stroke.setStrokeWidth(dp(1));c.drawRoundRect(r,radius,radius,stroke);}
    private void round(Canvas c,RectF r,int color,float radius){p.setShader(null);p.setColor(color);p.setStyle(Paint.Style.FILL);c.drawRoundRect(r,radius,radius,p);}
    private void text(Canvas c,String s,float x,float y,float size,int color,Paint.Align align,boolean bold){p.setShader(null);p.setColor(color);p.setTextSize(size);p.setTextAlign(align);p.setTypeface(android.graphics.Typeface.create("sans",bold?android.graphics.Typeface.BOLD:android.graphics.Typeface.NORMAL));c.drawText(s,x,y,p);}
    private float dp(float v){return v*getResources().getDisplayMetrics().density;}
}
