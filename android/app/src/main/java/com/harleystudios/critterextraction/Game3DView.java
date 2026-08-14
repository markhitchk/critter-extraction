package com.harleystudios.critterextraction;

import android.content.Context;
import android.opengl.GLSurfaceView;
import android.os.Handler;
import android.os.Looper;
import android.view.MotionEvent;

import java.util.List;

/** Native mobile twin-stick surface. Look and FIRE are intentionally separate like main/live touch controls. */
public final class Game3DView extends GLSurfaceView {
    public interface ResultListener{void onMatchFinished(boolean extracted,String summary);}
    private static final float STICK=120f;
    private final Native3DRenderer renderer;private int moveId=-1,lookId=-1;private float mbx,mby,mtx,mty,lbx,lby,ltx,lty,mx,mz,lx,lz;private final Handler handler=new Handler(Looper.getMainLooper());private ResultListener resultListener;private boolean resultDelivered;
    public Game3DView(Context context,NativeProfileStore store){super(context);setEGLContextClientVersion(3);setPreserveEGLContextOnPause(true);renderer=new Native3DRenderer(context,store);setRenderer(renderer);setRenderMode(RENDERMODE_CONTINUOUSLY);setFocusable(true);setFocusableInTouchMode(true);handler.post(resultCheck);}
    public void setResultListener(ResultListener l){resultListener=l;}
    private final Runnable resultCheck=new Runnable(){@Override public void run(){if(!resultDelivered&&renderer.ended()){resultDelivered=true;if(resultListener!=null)resultListener.onMatchFinished(renderer.extracted(),renderer.status());}if(isAttachedToWindow()||!resultDelivered)handler.postDelayed(this,180);}};
    @Override protected void onDetachedFromWindow(){handler.removeCallbacks(resultCheck);super.onDetachedFromWindow();}

    @Override public boolean onTouchEvent(MotionEvent e){int action=e.getActionMasked(),idx=e.getActionIndex();if(action==MotionEvent.ACTION_DOWN||action==MotionEvent.ACTION_POINTER_DOWN){float x=e.getX(idx),y=e.getY(idx);int id=e.getPointerId(idx);if(x<getWidth()*.48f&&moveId<0){moveId=id;mbx=mtx=x;mby=mty=y;updateMove();}else if(lookId<0){lookId=id;lbx=ltx=x;lby=lty=y;updateLook();}push();return true;}if(action==MotionEvent.ACTION_MOVE){for(int i=0;i<e.getPointerCount();i++){int id=e.getPointerId(i);if(id==moveId){mtx=e.getX(i);mty=e.getY(i);updateMove();}else if(id==lookId){ltx=e.getX(i);lty=e.getY(i);updateLook();}}push();return true;}if(action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_POINTER_UP||action==MotionEvent.ACTION_CANCEL){int id=e.getPointerId(idx);if(id==moveId){moveId=-1;mx=mz=0;}if(id==lookId){lookId=-1;lx=lz=0;}if(action==MotionEvent.ACTION_CANCEL){moveId=lookId=-1;mx=mz=lx=lz=0;}push();return true;}return true;}
    private void updateMove(){float dx=mtx-mbx,dy=mty-mby,l=(float)Math.hypot(dx,dy);if(l>STICK){dx=dx/l*STICK;dy=dy/l*STICK;}mx=dx/STICK;mz=dy/STICK;}
    private void updateLook(){float dx=ltx-lbx,dy=lty-lby,l=(float)Math.hypot(dx,dy);if(l<8){lx=lz=0;return;}if(l>STICK){dx=dx/l*STICK;dy=dy/l*STICK;}float sensitivity=renderer.match().account().settings.sensitivity;lx=dx/STICK*sensitivity;lz=dy/STICK*sensitivity;if(renderer.match().account().settings.invertY)lz=-lz;}
    private void push(){renderer.setInput(mx,mz,lx,lz);}

    public void resumeGameLoop(){renderer.setRunning(true);onResume();}public void pauseForLifecycle(){renderer.setRunning(false);onPause();}
    public void toggleCamera(){queueEvent(renderer::toggleCamera);}public void toggleShoulder(){queueEvent(renderer::toggleShoulder);}public void jump(){queueEvent(renderer::jump);performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP);}public void crouch(){queueEvent(renderer::toggleCrouch);}public void heal(){queueEvent(renderer::heal);}public void reload(){queueEvent(renderer::reload);}public void fireOnce(){queueEvent(renderer::fireOnce);}public void setFire(boolean v){queueEvent(()->renderer.setFireHeld(v));}public void setAim(boolean v){queueEvent(()->renderer.setAiming(v));}public void setUse(boolean v){queueEvent(()->renderer.setInteracting(v));}
    public String status(){return renderer.status();}public float hp(){return renderer.hp();}public float shield(){return renderer.shield();}public int loot(){return renderer.loot();}public int petals(){return renderer.petals();}public int medkits(){return renderer.medkits();}public int bandages(){return renderer.bandages();}public float playerX(){return renderer.playerX();}public float playerZ(){return renderer.playerZ();}public float extractX(){return renderer.extractX();}public float extractZ(){return renderer.extractZ();}public float matchSeconds(){return renderer.matchSeconds();}public String speciesName(){return renderer.speciesName();}public String weaponName(){return renderer.weaponName();}public String cameraName(){return renderer.cameraName();}public boolean shoulderRight(){return renderer.shoulderRight();}public int magazine(){return renderer.magazine();}public int reserveAmmo(){return renderer.reserveAmmo();}public String mapName(){return renderer.mapName();}public String objectiveTitle(){return renderer.objectiveTitle();}public String objectiveDetail(){return renderer.objectiveDetail();}public String interactionHint(){return renderer.interactionHint();}public String banner(){return renderer.banner();}public boolean primaryComplete(){return renderer.primaryComplete();}public boolean bonusComplete(){return renderer.bonusComplete();}public String primaryTitle(){return renderer.primaryTitle();}public String bonusTitle(){return renderer.bonusTitle();}public List<NativeProfileStore.Stack> backpack(){return renderer.backpack();}
}
