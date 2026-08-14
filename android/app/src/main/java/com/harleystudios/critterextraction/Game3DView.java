package com.harleystudios.critterextraction;

import android.content.Context;
import android.opengl.GLSurfaceView;
import android.view.MotionEvent;

/** Mobile twin-stick input surface backed by a continuous native OpenGL ES 3 renderer. */
public final class Game3DView extends GLSurfaceView {
    private static final float STICK=120f;
    private final Native3DRenderer renderer;
    private int moveId=-1,aimId=-1;
    private float mbx,mby,mtx,mty,abx,aby,atx,aty,mx,my,ax,ay;

    public Game3DView(Context context){
        super(context);setEGLContextClientVersion(3);setPreserveEGLContextOnPause(true);renderer=new Native3DRenderer(context);setRenderer(renderer);setRenderMode(RENDERMODE_CONTINUOUSLY);setFocusable(true);setFocusableInTouchMode(true);
    }

    @Override public boolean onTouchEvent(MotionEvent e){int action=e.getActionMasked(),idx=e.getActionIndex();
        if(action==MotionEvent.ACTION_DOWN||action==MotionEvent.ACTION_POINTER_DOWN){float x=e.getX(idx),y=e.getY(idx);int id=e.getPointerId(idx);if(x<getWidth()*.48f&&moveId<0){moveId=id;mbx=mtx=x;mby=mty=y;updateMove();}else if(aimId<0){aimId=id;abx=atx=x;aby=aty=y;updateAim();}push();return true;}
        if(action==MotionEvent.ACTION_MOVE){for(int i=0;i<e.getPointerCount();i++){int id=e.getPointerId(i);if(id==moveId){mtx=e.getX(i);mty=e.getY(i);updateMove();}else if(id==aimId){atx=e.getX(i);aty=e.getY(i);updateAim();}}push();return true;}
        if(action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_POINTER_UP||action==MotionEvent.ACTION_CANCEL){int id=e.getPointerId(idx);if(id==moveId){moveId=-1;mx=my=0;}if(id==aimId){aimId=-1;ax=ay=0;}if(action==MotionEvent.ACTION_CANCEL){moveId=aimId=-1;mx=my=ax=ay=0;}push();return true;}return true;}
    private void updateMove(){float dx=mtx-mbx,dy=mty-mby,l=(float)Math.hypot(dx,dy);if(l>STICK){dx=dx/l*STICK;dy=dy/l*STICK;}mx=dx/STICK;my=dy/STICK;}
    private void updateAim(){float dx=atx-abx,dy=aty-aby,l=(float)Math.hypot(dx,dy);if(l>STICK){dx=dx/l*STICK;dy=dy/l*STICK;}ax=dx/STICK;ay=dy/STICK;}
    private void push(){renderer.setInput(mx,my,ax,ay);}
    public void resumeGameLoop(){renderer.setRunning(true);onResume();}
    public void pauseForLifecycle(){renderer.setRunning(false);onPause();}
    public void toggleCamera(){queueEvent(renderer::toggleCamera);}
    public void toggleShoulder(){queueEvent(renderer::toggleShoulder);}
    public void jump(){queueEvent(renderer::jump);}
    public void nextSpecies(){queueEvent(renderer::nextSpecies);}
    public void nextWeapon(){queueEvent(renderer::nextWeapon);}
    public void dash(){queueEvent(renderer::dash);}
    public void heal(){queueEvent(renderer::heal);}
    public void fireOnce(){queueEvent(renderer::fireOnce);}
    public String status(){return renderer.status();}
    public float hp(){return renderer.hp();}
    public int loot(){return renderer.loot();}
    public int petals(){return renderer.petals();}
    public int medkits(){return renderer.medkits();}
    public float playerX(){return renderer.playerX();}
    public float playerZ(){return renderer.playerZ();}
    public float extractX(){return renderer.extractX();}
    public float extractZ(){return renderer.extractZ();}
    public float matchSeconds(){return renderer.matchSeconds();}
    public String speciesName(){return renderer.speciesName();}
    public String weaponName(){return renderer.weaponName();}
    public String cameraName(){return renderer.cameraName();}
}
