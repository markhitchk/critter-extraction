package com.harleystudios.critterextraction;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Handler;
import android.os.Looper;
import android.view.MotionEvent;
import android.view.View;

/** Functional native recreation of main/live menu/boot using the canonical branding assets. */
public final class LiveMenuView extends View {
    public interface Listener {
        void onPlaySolo(); void onHost(); void onJoin(); void onControls(); void onSettings();
        void onTradingPost(); void onAccount(); void onEditProfile(); void onAccounts();
        void onLoadout(); void onStash(); void onCharacter();
    }
    private static final float DW=1536f,DH=720f;
    private static final int BG=0xff111225,PANEL=0xff26284c,TEXT=0xfff7f7ff,MUTED=0xffaeb2d1,MINT=0xff7ef7d4,CYAN=0xff63dff5,PURPLE=0xff8e82ff;
    private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG),stroke=new Paint(Paint.ANTI_ALIAS_FLAG);
    private final AssetLibrary assets; private final NativeProfileStore store; private final Handler handler=new Handler(Looper.getMainLooper());
    private Bitmap bootLogo,headerIcon,hero,critter,weapon,utility; private String cachedSpecies="",cachedWeapon=""; private Listener listener;
    private boolean boot=true; private float bootProgress; private final long bootStart=System.currentTimeMillis(); private float scale=1,ox,oy;
    private final RectF controls=new RectF(822,24,990,92),settings=new RectF(1004,24,1170,92),petals=new RectF(1184,24,1376,92),account=new RectF(1390,24,1524,92);
    private final RectF solo=new RectF(105,340,332,405),host=new RectF(346,340,610,405),join=new RectF(624,340,888,405);
    private final RectF editProfile=new RectF(),accounts=new RectF(),loadout=new RectF(),stash=new RectF(),merchant=new RectF(),character=new RectF();

    public LiveMenuView(Context context,NativeProfileStore store){super(context);this.store=store;setLayerType(View.LAYER_TYPE_SOFTWARE,null);assets=new AssetLibrary(context);bootLogo=assets.loadBitmap("branding/HTG.png");headerIcon=assets.renderSvg("branding/icon.svg",256);hero=assets.loadBitmap("loading/cinematic-gameplay-fullhd.webp");stroke.setStyle(Paint.Style.STROKE);handler.post(frame);}
    public void setListener(Listener l){listener=l;}
    public void refresh(){cachedSpecies="";cachedWeapon="";invalidate();}
    private final Runnable frame=new Runnable(){@Override public void run(){if(!boot)return;bootProgress=Math.min(1f,(System.currentTimeMillis()-bootStart)/1250f);if(bootProgress>=1f)boot=false;invalidate();if(boot)handler.postDelayed(this,16);}};
    @Override protected void onDetachedFromWindow(){handler.removeCallbacks(frame);super.onDetachedFromWindow();}
    @Override protected void onDraw(Canvas c){super.onDraw(c);if(boot){drawBoot(c);return;}int w=getWidth(),h=getHeight();scale=Math.min(w/DW,h/DH);ox=(w-DW*scale)/2f;oy=(h-DH*scale)/2f;c.drawColor(BG);c.save();c.translate(ox,oy);c.scale(scale,scale);drawReference(c);c.restore();}

    private void drawBoot(Canvas c){int w=getWidth(),h=getHeight();p.setShader(new LinearGradient(0,0,w,h,0xff15162b,0xff090b15,Shader.TileMode.CLAMP));c.drawRect(0,0,w,h,p);p.setShader(null);float cw=Math.min(w*.60f,720),ch=Math.min(h*.72f,500);RectF card=new RectF((w-cw)/2,(h-ch)/2,(w+cw)/2,(h+ch)/2);panel(c,card,0xee171932,26,0x4463dff5);float ls=Math.min(ch*.33f,150);if(bootLogo!=null)c.drawBitmap(bootLogo,null,new RectF(card.centerX()-ls/2,card.top+18,card.centerX()+ls/2,card.top+18+ls),p);text(c,"HARLEY’S STUDIOS PRESENTS",card.centerX(),card.top+ls+50,13,MINT,Paint.Align.CENTER,true);text(c,"Critter Extraction",card.centerX(),card.top+ls+88,32,TEXT,Paint.Align.CENTER,true);text(c,"Cinematic critters. Tactical cover. Bigger extraction runs.",card.centerX(),card.top+ls+116,13,MUTED,Paint.Align.CENTER,false);RectF track=new RectF(card.left+50,card.bottom-62,card.right-50,card.bottom-50);round(c,track,0xff0d1021,8);p.setShader(new LinearGradient(track.left,0,track.right,0,MINT,CYAN,Shader.TileMode.CLAMP));c.drawRoundRect(new RectF(track.left,track.top,track.left+track.width()*bootProgress,track.bottom),8,8,p);p.setShader(null);text(c,"Loading refreshed critters, regional map assets, weapons, and HUD…",card.centerX(),card.bottom-22,11,MUTED,Paint.Align.CENTER,false);}

    private void drawReference(Canvas c){refreshDynamicAssets();NativeProfileStore.Account a=store.active();NativeGameData.Loadout kit=a.loadout();NativeGameData.Weapon gun=NativeGameData.WEAPONS.get(a.equippedWeaponId);if(gun==null&&kit!=null)gun=NativeGameData.WEAPONS.get(kit.weaponId);
        round(c,new RectF(0,0,DW,118),0xee0e0f1f,0);if(headerIcon!=null)c.drawBitmap(headerIcon,null,new RectF(64,24,132,92),p);text(c,"Critter Extraction",160,52,34,TEXT,Paint.Align.LEFT,true);text(c,"v0.22.0 • Harley’s Studios • Cartoon-Realistic Extraction Shooter",160,81,17,MUTED,Paint.Align.LEFT,false);
        chip(c,"Controls",controls,false);chip(c,"Settings",settings,false);chip(c,"🌸 "+NativeGameData.formatPetals(a.petals),petals,true);chip(c,a.displayName,account,false);

        RectF heroCard=new RectF(72,140,1464,430);panel(c,heroCard,0xf226284c,24,0x22ffffff);RectF scene=new RectF(870,140,1464,430);if(hero!=null){Rect src=crop(hero,scene);c.save();c.clipRect(scene);c.drawBitmap(hero,src,scene,p);c.restore();}p.setShader(new LinearGradient(scene.left,0,scene.left+220,0,0xf226284c,0x0026284c,Shader.TileMode.CLAMP));c.drawRect(scene.left,scene.top,scene.left+230,scene.bottom,p);p.setShader(null);
        text(c,"HARLEY’S STUDIOS • MODERN-BROWSER READY • PROCEDURAL MAPS",105,185,15,MINT,Paint.Align.LEFT,true);text(c,"Choose your critter. Build your kit.",105,235,34,TEXT,Paint.Align.LEFT,true);text(c,"Bring the loot home.",105,275,34,TEXT,Paint.Align.LEFT,true);text(c,"Drop into a colorful procedural region, fight raiders, collect Moonberries,",105,306,16,0xffc8cae1,Paint.Align.LEFT,false);text(c,"complete the contract, and reach the extraction beacon alive.",105,328,16,0xffc8cae1,Paint.Align.LEFT,false);gradientButton(c,solo,"Play Solo",MINT,CYAN,true);gradientButton(c,host,"Host Multiplayer",PURPLE,0xff5d57b5,false);gradientButton(c,join,"Join Multiplayer",PURPLE,0xff5d57b5,false);

        float top=446,bottom=706,gap=14,margin=72,cw=(DW-margin*2-gap*2)/3f;RectF profile=new RectF(margin,top,margin+cw,bottom),career=new RectF(margin+cw+gap,top,margin+cw*2+gap,bottom),gear=new RectF(margin+cw*2+gap*2,top,DW-margin,bottom);panel(c,profile,0xf226284c,20,0x22ffffff);panel(c,career,0xf226284c,20,0x22ffffff);panel(c,gear,0xf226284c,20,0x22ffffff);
        text(c,"ACTIVE ACCOUNT",profile.left+20,profile.top+30,13,MINT,Paint.Align.LEFT,true);text(c,a.displayName,profile.left+20,profile.top+65,28,TEXT,Paint.Align.LEFT,true);editProfile.set(profile.right-142,profile.top+15,profile.right-16,profile.top+52);mini(c,editProfile,"Name & Profile");if(critter!=null)c.drawBitmap(critter,null,new RectF(profile.left+20,profile.top+78,profile.left+104,profile.top+162),p);text(c,"@"+a.username,profile.left+118,profile.top+105,16,TEXT,Paint.Align.LEFT,true);text(c,a.bio,profile.left+118,profile.top+132,13,MUTED,Paint.Align.LEFT,false);text(c,"Level "+a.level(),profile.left+20,profile.top+180,13,MUTED,Paint.Align.LEFT,false);int lvl=a.level(),from=NativeProfileStore.xpForLevel(lvl),to=NativeProfileStore.xpForLevel(lvl+1);float prog=(a.xp-from)/(float)Math.max(1,to-from);round(c,new RectF(profile.left+20,profile.top+191,profile.right-20,profile.top+201),0xff111328,6);p.setShader(new LinearGradient(profile.left,0,profile.right,0,PURPLE,MINT,Shader.TileMode.CLAMP));c.drawRoundRect(new RectF(profile.left+20,profile.top+191,profile.left+20+(profile.width()-40)*Math.max(0,Math.min(1,prog)),profile.top+201),6,6,p);p.setShader(null);accounts.set(profile.left+20,profile.bottom-43,profile.right-20,profile.bottom-10);secondary(c,accounts,"Switch / Manage Accounts");

        text(c,"CAREER",career.left+20,career.top+30,13,MINT,Paint.Align.LEFT,true);text(c,"Extraction Record",career.left+20,career.top+65,28,TEXT,Paint.Align.LEFT,true);stat(c,career.left+20,career.top+83,career.width()/2-30,String.valueOf(a.stats.extracts),"EXTRACTS");stat(c,career.centerX()+5,career.top+83,career.width()/2-30,String.valueOf(a.stats.berries),"BERRIES");stat(c,career.left+20,career.top+154,career.width()/2-30,String.valueOf(a.stats.kills),"CRITTERS");stat(c,career.centerX()+5,career.top+154,career.width()/2-30,String.valueOf(a.stats.matches),"DROPS");

        text(c,"SELECTED LOADOUT",gear.left+20,gear.top+30,13,MINT,Paint.Align.LEFT,true);text(c,kit==null?"Meadow Scout":kit.name,gear.left+20,gear.top+65,28,TEXT,Paint.Align.LEFT,true);loadout.set(gear.right-120,gear.top+15,gear.right-16,gear.top+52);mini(c,loadout,"Choose Kit");RectF gunCard=new RectF(gear.left+18,gear.top+78,gear.right-18,gear.top+155);round(c,gunCard,0x18ffffff,12);if(weapon!=null)c.drawBitmap(weapon,null,new RectF(gunCard.left+8,gunCard.top+8,gunCard.left+82,gunCard.bottom-8),p);text(c,gun==null?"Pea Popper":gun.name,gunCard.left+92,gunCard.top+31,17,TEXT,Paint.Align.LEFT,true);text(c,gun==null?"Balanced semi-auto berry blaster":gun.subtitle,gunCard.left+92,gunCard.top+55,12,MUTED,Paint.Align.LEFT,false);stash.set(gear.left+18,gear.bottom-45,gear.left+143,gear.bottom-10);merchant.set(gear.left+153,gear.bottom-45,gear.left+306,gear.bottom-10);character.set(gear.left+316,gear.bottom-45,gear.right-18,gear.bottom-10);secondary(c,stash,"Stash");secondary(c,merchant,"Trading Post");secondary(c,character,"Character");
    }

    private void refreshDynamicAssets(){NativeProfileStore.Account a=store.active();if(!a.speciesId.equals(cachedSpecies)){NativeGameData.Species s=NativeGameData.SPECIES.get(a.speciesId);critter=s==null?null:assets.renderSvg(s.asset,320);cachedSpecies=a.speciesId;}String wid=a.equippedWeaponId;NativeGameData.Loadout l=a.loadout();if((wid==null||wid.isEmpty())&&l!=null)wid=l.weaponId;if(wid==null)wid="pea_popper";if(!wid.equals(cachedWeapon)){NativeGameData.Weapon w=NativeGameData.WEAPONS.get(wid);weapon=w==null?null:assets.renderSvg(w.asset,240);cachedWeapon=wid;}}

    @Override public boolean onTouchEvent(MotionEvent e){if(boot||e.getActionMasked()!=MotionEvent.ACTION_UP)return true;float x=(e.getX()-ox)/scale,y=(e.getY()-oy)/scale;if(x<0||y<0||x>DW||y>DH)return true;if(listener==null)return true;if(controls.contains(x,y))listener.onControls();else if(settings.contains(x,y))listener.onSettings();else if(petals.contains(x,y))listener.onTradingPost();else if(account.contains(x,y))listener.onAccount();else if(solo.contains(x,y))listener.onPlaySolo();else if(host.contains(x,y))listener.onHost();else if(join.contains(x,y))listener.onJoin();else if(editProfile.contains(x,y))listener.onEditProfile();else if(accounts.contains(x,y))listener.onAccounts();else if(loadout.contains(x,y))listener.onLoadout();else if(stash.contains(x,y))listener.onStash();else if(merchant.contains(x,y))listener.onTradingPost();else if(character.contains(x,y))listener.onCharacter();return true;}

    private Rect crop(Bitmap b,RectF dst){float br=b.getWidth()/(float)b.getHeight(),dr=dst.width()/dst.height();if(br>dr){int sw=Math.round(b.getHeight()*dr),sx=(b.getWidth()-sw)/2;return new Rect(sx,0,sx+sw,b.getHeight());}int sh=Math.round(b.getWidth()/dr),sy=(b.getHeight()-sh)/2;return new Rect(0,sy,b.getWidth(),sy+sh);}
    private void chip(Canvas c,String s,RectF r,boolean mint){panel(c,r,mint?0x227ef7d4:0x12ffffff,18,mint?0x667ef7d4:0x22ffffff);text(c,s,r.centerX(),r.centerY()+7,17,mint?MINT:TEXT,Paint.Align.CENTER,true);}
    private void gradientButton(Canvas c,RectF r,String s,int a,int b,boolean dark){p.setShader(new LinearGradient(r.left,r.top,r.right,r.bottom,a,b,Shader.TileMode.CLAMP));c.drawRoundRect(r,18,18,p);p.setShader(null);text(c,s,r.centerX(),r.centerY()+7,19,dark?0xff111526:TEXT,Paint.Align.CENTER,true);}
    private void secondary(Canvas c,RectF r,String s){panel(c,r,0x155f57b5,10,0x668e82ff);text(c,s,r.centerX(),r.centerY()+5,13,TEXT,Paint.Align.CENTER,true);}
    private void mini(Canvas c,RectF r,String s){panel(c,r,0x16ffffff,10,0x33ffffff);text(c,s,r.centerX(),r.centerY()+4,11,TEXT,Paint.Align.CENTER,true);}
    private void stat(Canvas c,float x,float y,float w,String value,String label){RectF r=new RectF(x,y,x+w,y+59);round(c,r,0x12ffffff,12);text(c,value,x+12,y+29,25,TEXT,Paint.Align.LEFT,true);text(c,label,x+12,y+49,10,MUTED,Paint.Align.LEFT,true);}
    private void panel(Canvas c,RectF r,int color,float radius,int border){round(c,r,color,radius);stroke.setColor(border);stroke.setStrokeWidth(1);c.drawRoundRect(r,radius,radius,stroke);}
    private void round(Canvas c,RectF r,int color,float radius){p.setShader(null);p.setColor(color);p.setStyle(Paint.Style.FILL);c.drawRoundRect(r,radius,radius,p);}
    private void text(Canvas c,String s,float x,float y,float size,int color,Paint.Align align,boolean bold){p.setShader(null);p.setColor(color);p.setTextSize(size);p.setTextAlign(align);p.setTypeface(android.graphics.Typeface.create("sans",bold?android.graphics.Typeface.BOLD:android.graphics.Typeface.NORMAL));c.drawText(s==null?"":s,x,y,p);}
}
