package com.harleystudios.critterextraction;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.view.View;

/** Native Android rendering of the canonical /live gameplay HUD. */
public final class LiveHudOverlay extends View {
    private static final int TEXT=0xfff7f7ff,MUTED=0xffaeb2d1,MINT=0xff7ef7d4,CYAN=0xff63dff5,PURPLE=0xff8e82ff,YELLOW=0xffffd36f,DANGER=0xffff6f91;
    private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG),stroke=new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Game3DView game;

    public LiveHudOverlay(Context context, Game3DView game){super(context);this.game=game;setWillNotDraw(false);setClickable(false);stroke.setStyle(Paint.Style.STROKE);}

    @Override protected void onDraw(Canvas c){super.onDraw(c);int w=getWidth(),h=getHeight();if(w<2||h<2)return;
        drawSquad(c,w,h);drawCenter(c,w,h);drawMinimap(c,w,h);drawCrosshair(c,w,h);drawQuickbar(c,w,h);drawAmmo(c,w,h);drawTouchGuides(c,w,h);postInvalidateOnAnimation();
    }

    private void drawSquad(Canvas c,int w,int h){float x=dp(16),y=dp(14),ww=Math.min(dp(265),w*.29f),hh=dp(74);RectF r=new RectF(x,y,x+ww,y+hh);panel(c,r,0xb30a0b1b,dp(13),0x33ffffff);
        circle(c,x+dp(28),y+dp(29),dp(18),PURPLE);text(c,"NC",x+dp(28),y+dp(33),dp(9),0xff111225,Paint.Align.CENTER,true);
        text(c,game.speciesName(),x+dp(55),y+dp(25),dp(12),TEXT,Paint.Align.LEFT,true);text(c,"SOLO • FAIR PLAY",x+dp(55),y+dp(42),dp(8),MINT,Paint.Align.LEFT,true);
        RectF health=new RectF(x+dp(55),y+dp(51),r.right-dp(12),y+dp(60));round(c,health,0xff111328,dp(6));RectF fill=new RectF(health.left,health.top,health.left+health.width()*clamp(game.hp()/100f,0,1),health.bottom);p.setShader(new LinearGradient(fill.left,0,fill.right,0,0xffff7194,0xffffb27d,Shader.TileMode.CLAMP));c.drawRoundRect(fill,dp(6),dp(6),p);p.setShader(null);
    }

    private void drawCenter(Canvas c,int w,int h){float cx=w/2f;float top=dp(12);RectF compass=new RectF(cx-dp(190),top,cx+dp(190),top+dp(30));panel(c,compass,0x990a0b1b,dp(10),0x22ffffff);String[] parts={"W","285","NW","000","N","45","NE"};float start=compass.left+dp(25),step=(compass.width()-dp(50))/(parts.length-1);for(int i=0;i<parts.length;i++)text(c,parts[i],start+i*step,compass.centerY()+dp(4),i==3?dp(11):dp(8),i==3?TEXT:MUTED,Paint.Align.CENTER,i==3);
        RectF objective=new RectF(cx-dp(240),top+dp(36),cx+dp(240),top+dp(98));panel(c,objective,0xc20a0b1b,dp(13),0x33ffffff);
        text(c,game.loot()>=8?"STEP 2":"STEP 1",objective.left+dp(14),objective.top+dp(17),dp(8),MINT,Paint.Align.LEFT,true);
        text(c,game.loot()>=8?"REACH EXTRACTION BEACON":"LOCATE EXTRACTION BEACON",objective.left+dp(14),objective.top+dp(36),dp(11),TEXT,Paint.Align.LEFT,true);
        text(c,game.loot()>=8?"Hold inside the gold ring":"Follow the gold diamond",objective.left+dp(14),objective.top+dp(52),dp(8),MUTED,Paint.Align.LEFT,false);
        text(c,"DROP CLOSES",cx+dp(64),objective.top+dp(18),dp(7),MUTED,Paint.Align.CENTER,true);text(c,time(game.matchSeconds()),cx+dp(64),objective.top+dp(43),dp(18),TEXT,Paint.Align.CENTER,true);
        text(c,"MOONBERRIES",objective.right-dp(58),objective.top+dp(18),dp(7),MUTED,Paint.Align.CENTER,true);text(c,game.loot()+" / 8",objective.right-dp(58),objective.top+dp(43),dp(16),YELLOW,Paint.Align.CENTER,true);
        RectF tag=new RectF(cx-dp(58),objective.bottom+dp(6),cx+dp(58),objective.bottom+dp(27));panel(c,tag,0x990a0b1b,dp(8),0x22ffffff);text(c,game.cameraName(),cx,tag.centerY()+dp(3),dp(7),0xffd9dbef,Paint.Align.CENTER,true);
    }

    private void drawMinimap(Canvas c,int w,int h){float ww=Math.min(dp(218),w*.23f),hh=dp(228),x=w-ww-dp(15),y=dp(82);RectF card=new RectF(x,y,x+ww,y+hh);panel(c,card,0xbb0a0b1b,dp(15),0x33ffffff);text(c,"PINE VALLEY",card.left+dp(12),card.top+dp(18),dp(9),TEXT,Paint.Align.LEFT,true);
        RectF map=new RectF(card.left+dp(10),card.top+dp(27),card.right-dp(10),card.top+dp(135));round(c,map,0xff17353b,dp(10));
        stroke.setColor(0x665fd0c0);stroke.setStrokeWidth(dp(5));c.drawLine(map.left+map.width()*.1f,map.top+map.height()*.78f,map.right-map.width()*.08f,map.top+map.height()*.28f,stroke);stroke.setColor(0x557f89a9);stroke.setStrokeWidth(dp(3));c.drawLine(map.centerX(),map.top,map.centerX(),map.bottom,stroke);
        float px=map.centerX()+clamp(game.playerX()/34f,-1,1)*map.width()*.44f,pz=map.centerY()+clamp(game.playerZ()/34f,-1,1)*map.height()*.44f;triangle(c,px,pz,dp(7),CYAN);
        if(game.loot()>=8){float ex=map.centerX()+clamp(game.extractX()/34f,-1,1)*map.width()*.44f,ez=map.centerY()+clamp(game.extractZ()/34f,-1,1)*map.height()*.44f;diamond(c,ex,ez,dp(7),YELLOW);}
        text(c,"♟ 12",card.left+dp(15),card.top+dp(153),dp(9),TEXT,Paint.Align.LEFT,true);text(c,"☠ 0",card.centerX(),card.top+dp(153),dp(9),TEXT,Paint.Align.CENTER,true);text(c,"◷ "+time(game.matchSeconds()),card.right-dp(15),card.top+dp(153),dp(9),TEXT,Paint.Align.RIGHT,true);
        text(c,"DROP OBJECTIVES",card.left+dp(12),card.top+dp(174),dp(8),MINT,Paint.Align.LEFT,true);text(c,"◇  Locate extraction beacon",card.left+dp(12),card.top+dp(191),dp(8),game.loot()>=8?MUTED:TEXT,Paint.Align.LEFT,false);text(c,"◇  Collect Moonberries  "+game.loot()+" / 8",card.left+dp(12),card.top+dp(207),dp(8),game.loot()>=8?MINT:MUTED,Paint.Align.LEFT,false);text(c,"◇  Extract alive",card.left+dp(12),card.top+dp(223),dp(8),game.loot()>=8?TEXT:MUTED,Paint.Align.LEFT,false);
    }

    private void drawCrosshair(Canvas c,int w,int h){float cx=w/2f,cy=h/2f;stroke.setColor(Color.WHITE);stroke.setStrokeWidth(dp(2));c.drawLine(cx-dp(16),cy,cx-dp(6),cy,stroke);c.drawLine(cx+dp(6),cy,cx+dp(16),cy,stroke);c.drawLine(cx,cy-dp(16),cx,cy-dp(6),stroke);c.drawLine(cx,cy+dp(6),cx,cy+dp(16),stroke);circle(c,cx,cy,dp(1.7f),Color.WHITE);}

    private void drawQuickbar(Canvas c,int w,int h){float cx=w/2f,y=h-dp(62),slot=dp(42),gap=dp(5),total=slot*5+gap*4,x=cx-total/2;for(int i=0;i<5;i++){RectF r=new RectF(x+i*(slot+gap),y,x+i*(slot+gap)+slot,y+slot);panel(c,r,i==0?0x555fdff5:0xaa0a0b1b,dp(9),i==0?0xaa63dff5:0x33ffffff);text(c,String.valueOf(i+1),r.left+dp(6),r.top+dp(10),dp(7),MUTED,Paint.Align.LEFT,true);if(i==0)text(c,"●",r.centerX(),r.centerY()+dp(6),dp(16),MINT,Paint.Align.CENTER,true);else if(i==1)text(c,"+",r.centerX(),r.centerY()+dp(7),dp(18),0xffffb4c5,Paint.Align.CENTER,true);}}

    private void drawAmmo(Canvas c,int w,int h){float ww=dp(150),hh=dp(62),x=w-ww-dp(18),y=h-hh-dp(16);RectF r=new RectF(x,y,x+ww,y+hh);panel(c,r,0xbb0a0b1b,dp(12),0x33ffffff);text(c,game.weaponName().toUpperCase(),r.right-dp(12),r.top+dp(17),dp(8),MUTED,Paint.Align.RIGHT,true);text(c,"16 / 80",r.right-dp(12),r.top+dp(44),dp(23),TEXT,Paint.Align.RIGHT,true);text(c,"AUTO",r.left+dp(11),r.bottom-dp(11),dp(7),YELLOW,Paint.Align.LEFT,true);}

    private void drawTouchGuides(Canvas c,int w,int h){float base=Math.min(w,h);float leftX=dp(78),leftY=h-dp(105),rad=Math.min(dp(54),base*.09f);stroke.setColor(0x667ef7d4);stroke.setStrokeWidth(dp(2));c.drawCircle(leftX,leftY,rad,stroke);c.drawCircle(leftX,leftY,rad*.42f,stroke);text(c,"MOVE",leftX,leftY+rad+dp(15),dp(8),MINT,Paint.Align.CENTER,true);
        RectF look=new RectF(w*.52f,h*.43f,w-dp(18),h-dp(92));stroke.setColor(0x2263dff5);stroke.setStrokeWidth(dp(1));c.drawRoundRect(look,dp(16),dp(16),stroke);text(c,"DRAG TO LOOK",look.centerX(),look.top+dp(18),dp(8),0x7763dff5,Paint.Align.CENTER,true);
    }

    private String time(float sec){int s=Math.max(0,Math.round(sec));return String.format(java.util.Locale.US,"%02d:%02d",s/60,s%60);}
    private void triangle(Canvas c,float x,float y,float s,int color){Path path=new Path();path.moveTo(x,y-s);path.lineTo(x-s*.72f,y+s);path.lineTo(x+s*.72f,y+s);path.close();p.setColor(color);p.setStyle(Paint.Style.FILL);c.drawPath(path,p);}
    private void diamond(Canvas c,float x,float y,float s,int color){Path path=new Path();path.moveTo(x,y-s);path.lineTo(x+s,y);path.lineTo(x,y+s);path.lineTo(x-s,y);path.close();p.setColor(color);p.setStyle(Paint.Style.FILL);c.drawPath(path,p);}
    private void circle(Canvas c,float x,float y,float radius,int color){p.setShader(null);p.setColor(color);p.setStyle(Paint.Style.FILL);c.drawCircle(x,y,radius,p);}
    private void panel(Canvas c,RectF r,int color,float radius,int border){round(c,r,color,radius);stroke.setColor(border);stroke.setStrokeWidth(dp(1));c.drawRoundRect(r,radius,radius,stroke);}
    private void round(Canvas c,RectF r,int color,float radius){p.setShader(null);p.setColor(color);p.setStyle(Paint.Style.FILL);c.drawRoundRect(r,radius,radius,p);}
    private void text(Canvas c,String s,float x,float y,float size,int color,Paint.Align align,boolean bold){p.setShader(null);p.setColor(color);p.setTextSize(size);p.setTextAlign(align);p.setTypeface(android.graphics.Typeface.create("sans",bold?android.graphics.Typeface.BOLD:android.graphics.Typeface.NORMAL));c.drawText(s,x,y,p);}
    private float clamp(float v,float lo,float hi){return Math.max(lo,Math.min(hi,v));}
    private float dp(float v){return v*getResources().getDisplayMetrics().density;}
}
