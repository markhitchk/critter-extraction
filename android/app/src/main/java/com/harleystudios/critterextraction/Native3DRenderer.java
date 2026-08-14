package com.harleystudios.critterextraction;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.opengl.GLES30;
import android.opengl.GLSurfaceView;
import android.opengl.Matrix;
import android.os.SystemClock;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * True native OpenGL ES 3 renderer for Critter Extraction.
 * No WebView/HTML/JavaScript runtime is involved.
 */
public final class Native3DRenderer implements GLSurfaceView.Renderer {
    private static final float WORLD=34f, SPEED=5.7f, LOOT_GOAL=8f;
    private final Context context;
    private final SharedPreferences prefs;
    private final Random random=new Random(62);
    private final List<Enemy> enemies=new ArrayList<>();
    private final List<Bullet> bullets=new ArrayList<>();
    private final List<Loot> loot=new ArrayList<>();
    private final float[] projection=new float[16], view=new float[16], vp=new float[16], model=new float[16], mvp=new float[16];
    private MeshFactory3D.Mesh cube,sphere,cylinder,cone;
    private int program,aPos,aNormal,uMvp,uModel,uColor,uCamera;
    private int width,height;
    private long lastNs;
    private volatile float moveX,moveY,aimX,aimY;
    private volatile boolean running=true,firstPerson=false;
    private volatile int speciesIndex,weaponIndex;
    private volatile float hp=100f;
    private volatile int carriedLoot=0,medkits=2,petals=0;
    private volatile String banner="DROP IN • LOOT • EXTRACT";
    private float playerX=0f,playerZ=8f,lastAimX=0f,lastAimZ=-1f,fireCd=0f,dashCd=0f,spawnCd=.5f,extractProgress=0f;
    private final float extractX=-22f,extractZ=-21f;
    private long bannerUntil;

    private static final float[] WEAPON_DAMAGE={26f,19f,44f,31f,62f};
    private static final float[] WEAPON_COOLDOWN={.20f,.105f,.58f,.25f,.82f};
    private static final float[] WEAPON_SPEED={15f,17f,14f,18f,20f};
    private static final String[] WEAPONS={"Pea Popper","Acorn Sprayer","Carrot Scatter","Honey Carbine","Moonbeam"};

    public Native3DRenderer(Context context){
        this.context=context.getApplicationContext(); prefs=context.getSharedPreferences("critter_native_3d",Context.MODE_PRIVATE);
        speciesIndex=Math.floorMod(prefs.getInt("species",0),SpeciesCatalog3D.ALL.length);
        weaponIndex=Math.floorMod(prefs.getInt("weapon",0),WEAPONS.length);
        petals=prefs.getInt("petals",0);
        resetRun();
    }

    @Override public void onSurfaceCreated(javax.microedition.khronos.egl.EGLConfig config){
        GLES30.glClearColor(.018f,.045f,.055f,1f); GLES30.glEnable(GLES30.GL_DEPTH_TEST); GLES30.glEnable(GLES30.GL_BLEND);
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA,GLES30.GL_ONE_MINUS_SRC_ALPHA);
        program=buildProgram(VS,FS); aPos=GLES30.glGetAttribLocation(program,"aPos"); aNormal=GLES30.glGetAttribLocation(program,"aNormal");
        uMvp=GLES30.glGetUniformLocation(program,"uMvp");uModel=GLES30.glGetUniformLocation(program,"uModel");uColor=GLES30.glGetUniformLocation(program,"uColor");uCamera=GLES30.glGetUniformLocation(program,"uCamera");
        cube=MeshFactory3D.cube();sphere=MeshFactory3D.sphere(7,10);cylinder=MeshFactory3D.cylinder(10);cone=MeshFactory3D.cone(10);
        lastNs=0;
    }

    @Override public void onSurfaceChanged(javax.microedition.khronos.opengles.GL10 gl,int w,int h){
        width=Math.max(1,w);height=Math.max(1,h);GLES30.glViewport(0,0,width,height);Matrix.perspectiveM(projection,0,62f,width/(float)height,.08f,110f);
    }

    @Override public void onDrawFrame(javax.microedition.khronos.opengles.GL10 gl){
        long now=System.nanoTime();float dt=lastNs==0?0:Math.min(.033f,(now-lastNs)/1_000_000_000f);lastNs=now;
        if(running&&dt>0)update(dt);
        GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT|GLES30.GL_DEPTH_BUFFER_BIT);setupCamera();GLES30.glUseProgram(program);
        drawWorld(); drawLoot(); drawBullets(); drawEnemies(); drawPlayer(); drawExtraction();
    }

    private void setupCamera(){
        float eyeX,eyeY,eyeZ,tx,tz;
        if(firstPerson){eyeX=playerX+lastAimX*.12f;eyeY=2.28f;eyeZ=playerZ+lastAimZ*.12f;tx=playerX+lastAimX*7f;tz=playerZ+lastAimZ*7f;}
        else{eyeX=playerX-lastAimX*6.3f;eyeY=5.0f;eyeZ=playerZ-lastAimZ*6.3f;tx=playerX+lastAimX*1.2f;tz=playerZ+lastAimZ*1.2f;}
        Matrix.setLookAtM(view,0,eyeX,eyeY,eyeZ,tx,1.35f,tz,0,1,0);Matrix.multiplyMM(vp,0,projection,0,view,0);
        GLES30.glUniform3f(uCamera,eyeX,eyeY,eyeZ);
    }

    private void update(float dt){
        fireCd=Math.max(0,fireCd-dt);dashCd=Math.max(0,dashCd-dt);spawnCd-=dt;
        float ml=(float)Math.hypot(moveX,moveY);if(ml>.05f){float dx=moveX/ml,dz=moveY/ml;playerX=clamp(playerX+dx*SPEED*dt,-WORLD,WORLD);playerZ=clamp(playerZ+dz*SPEED*dt,-WORLD,WORLD);}
        float al=(float)Math.hypot(aimX,aimY);if(al>.18f){lastAimX=aimX/al;lastAimZ=aimY/al;if(fireCd<=0){fire();fireCd=WEAPON_COOLDOWN[weaponIndex];}}
        if(spawnCd<=0&&enemies.size()<14){spawnEnemy();spawnCd=.85f;}
        for(Enemy e:enemies){float dx=playerX-e.x,dz=playerZ-e.z,d=Math.max(.01f,(float)Math.hypot(dx,dz));e.x+=dx/d*e.speed*dt;e.z+=dz/d*e.speed*dt;e.attack-=dt;if(d<1.05f&&e.attack<=0){hp-=7f+(e.species%4);e.attack=.72f;if(hp<=0){banner("RUN LOST",1600);resetRun();break;}}}
        Iterator<Bullet> bi=bullets.iterator();while(bi.hasNext()){Bullet b=bi.next();b.x+=b.vx*dt;b.z+=b.vz*dt;b.life-=dt;boolean remove=b.life<=0;for(Enemy e:enemies){if(e.hp<=0)continue;float dx=b.x-e.x,dz=b.z-e.z;if(dx*dx+dz*dz<.75f*.75f){e.hp-=b.damage;remove=true;break;}}if(remove)bi.remove();}
        Iterator<Enemy> ei=enemies.iterator();while(ei.hasNext()){Enemy e=ei.next();if(e.hp<=0){loot.add(new Loot(e.x,e.z,1+random.nextInt(3)));petals=Math.min(1_000_000,petals+5+random.nextInt(9));ei.remove();}}
        Iterator<Loot> li=loot.iterator();while(li.hasNext()){Loot l=li.next();float dx=playerX-l.x,dz=playerZ-l.z;if(dx*dx+dz*dz<1.25f*1.25f){carriedLoot+=l.value;li.remove();if(carriedLoot>=LOOT_GOAL)banner("EXTRACTION OPEN",1300);}}
        if(carriedLoot>=LOOT_GOAL){float dx=playerX-extractX,dz=playerZ-extractZ;if(dx*dx+dz*dz<3.1f*3.1f){extractProgress+=dt;if(extractProgress>=3f){petals=Math.min(1_000_000,petals+carriedLoot*12);banner("EXTRACTED! +"+(carriedLoot*12)+" PETALS",1800);prefs.edit().putInt("petals",petals).apply();resetRun();}}else extractProgress=Math.max(0,extractProgress-dt*1.5f);}
        if(bannerUntil>0&&SystemClock.uptimeMillis()>bannerUntil){bannerUntil=0;banner=carriedLoot>=LOOT_GOAL?"REACH GREEN EXTRACTION":"LOOT "+carriedLoot+"/8";}
    }

    private void resetRun(){playerX=0;playerZ=8;hp=100;carriedLoot=0;medkits=2;extractProgress=0;enemies.clear();bullets.clear();loot.clear();for(int i=0;i<7;i++)spawnEnemy();}
    private void spawnEnemy(){double a=random.nextDouble()*Math.PI*2;float d=10+random.nextFloat()*14;float x=clamp(playerX+(float)Math.sin(a)*d,-WORLD+2,WORLD-2),z=clamp(playerZ+(float)Math.cos(a)*d,-WORLD+2,WORLD-2);int sp=(speciesIndex+3+random.nextInt(SpeciesCatalog3D.ALL.length-1))%SpeciesCatalog3D.ALL.length;enemies.add(new Enemy(x,z,sp,55+random.nextFloat()*42,2.0f+random.nextFloat()*1.4f));}
    private void fire(){float spread=weaponIndex==2?.16f:weaponIndex==1?.055f:.018f;int count=weaponIndex==2?5:1;for(int i=0;i<count;i++){float angle=(float)Math.atan2(lastAimX,-lastAimZ)+(i-(count-1)/2f)*spread;float dx=(float)Math.sin(angle),dz=-(float)Math.cos(angle);bullets.add(new Bullet(playerX+dx*.9f,1.55f,playerZ+dz*.9f,dx*WEAPON_SPEED[weaponIndex],dz*WEAPON_SPEED[weaponIndex],WEAPON_DAMAGE[weaponIndex],1.8f));}}

    public void setInput(float mx,float my,float ax,float ay){moveX=mx;moveY=my;aimX=ax;aimY=ay;}
    public void setRunning(boolean value){running=value;lastNs=0;}
    public void toggleCamera(){firstPerson=!firstPerson;banner(firstPerson?"FIRST PERSON":"THIRD PERSON",900);}
    public void nextSpecies(){speciesIndex=(speciesIndex+1)%SpeciesCatalog3D.ALL.length;prefs.edit().putInt("species",speciesIndex).apply();banner(SpeciesCatalog3D.ALL[speciesIndex].name.toUpperCase(Locale.US),900);}
    public void nextWeapon(){weaponIndex=(weaponIndex+1)%WEAPONS.length;prefs.edit().putInt("weapon",weaponIndex).apply();banner(WEAPONS[weaponIndex].toUpperCase(Locale.US),900);}
    public void dash(){if(dashCd>0)return;float dx=Math.abs(moveX)+Math.abs(moveY)>.15f?moveX:lastAimX,dz=Math.abs(moveX)+Math.abs(moveY)>.15f?moveY:lastAimZ;float l=Math.max(.01f,(float)Math.hypot(dx,dz));playerX=clamp(playerX+dx/l*3.5f,-WORLD,WORLD);playerZ=clamp(playerZ+dz/l*3.5f,-WORLD,WORLD);dashCd=2.2f;}
    public void heal(){if(medkits<=0||hp>=99)return;medkits--;hp=Math.min(100,hp+42);banner("MEDKIT +42",750);}
    private void banner(String s,long ms){banner=s;bannerUntil=SystemClock.uptimeMillis()+ms;}
    public String status(){SpeciesCatalog3D.Species s=SpeciesCatalog3D.ALL[speciesIndex];return s.name+" • "+s.role+"\n"+WEAPONS[weaponIndex]+"   HP "+Math.round(hp)+"   Loot "+carriedLoot+"/8   Med "+medkits+"   Petals "+petals+"\n"+banner+(carriedLoot>=LOOT_GOAL?"   Extract "+Math.round(extractProgress/3f*100)+"%":"");}

    private void drawWorld(){
        draw(cube,0,-.18f,0,WORLD*2+.5f,.36f,WORLD*2+.5f,0xff183e36,0,0,0);
        for(int i=0;i<28;i++){float x=-30+(i*13%59),z=-28+(i*19%57);if(Math.hypot(x-playerX,z-playerZ)<3)continue;draw(cylinder,x,1.05f,z,.48f,2.1f,.48f,0xff6b4931,0,0,0);draw(cone,x,3.0f,z,2.6f,4.0f,2.6f,0xff245c42,0,0,0);}
        for(int i=0;i<18;i++){float x=-29+(i*17%58),z=-27+(i*23%55);draw(sphere,x,.38f,z,1.5f,.75f,1.2f,0xff60726b,i*19,0,0);}
        for(int i=0;i<12;i++){float x=-25+(i*11%52),z=-24+(i*29%49);draw(cube,x,.55f,z,1.2f,1.1f,1.2f,0xff9b6a3f,i*15,0,0);draw(cube,x,.57f,z,1.25f,.08f,1.25f,0xffd5a15d,i*15,0,0);}
        draw(cube,0,.02f,-WORLD,68f,.25f,.35f,0xff3c7065,0,0,0);draw(cube,0,.02f,WORLD,68f,.25f,.35f,0xff3c7065,0,0,0);draw(cube,-WORLD,.02f,0,.35f,.25f,68f,0xff3c7065,0,0,0);draw(cube,WORLD,.02f,0,.35f,.25f,68f,0xff3c7065,0,0,0);
    }

    private void drawPlayer(){if(firstPerson){drawWeapon(playerX+lastAimX*.65f,1.72f,playerZ+lastAimZ*.65f,yawDeg(),weaponIndex);return;}drawCritter(playerX,0,playerZ,yawDeg(),SpeciesCatalog3D.ALL[speciesIndex],1f,true);}
    private void drawEnemies(){for(Enemy e:enemies)drawCritter(e.x,0,e.z,(float)Math.toDegrees(Math.atan2(playerX-e.x,-(playerZ-e.z))),SpeciesCatalog3D.ALL[e.species],.92f,false);}
    private void drawBullets(){for(Bullet b:bullets)draw(sphere,b.x,b.y,b.z,.18f,.18f,.18f,weaponIndex==4?0xffc97bff:0xff8feaff,0,0,0);}
    private void drawLoot(){for(Loot l:loot){draw(cube,l.x,.45f,l.z,.48f,.48f,.48f,0xffffd166,45,35,0);draw(sphere,l.x,.45f,l.z,.72f,.72f,.72f,0x33ffd166,0,0,0);}}
    private void drawExtraction(){if(carriedLoot<LOOT_GOAL)return;for(int i=0;i<12;i++){double a=i*Math.PI*2/12;float x=extractX+(float)Math.sin(a)*2.7f,z=extractZ+(float)Math.cos(a)*2.7f;draw(cube,x,.08f,z,.48f,.16f,1.0f,0xff57e389,(float)Math.toDegrees(a),0,0);}draw(cylinder,extractX,2.8f,extractZ,.16f,5.5f,.16f,0x9957e389,0,0,0);}

    private void drawCritter(float x,float y,float z,float yaw,SpeciesCatalog3D.Species s,float sc,boolean player){
        int body=s.bodyColor(),accent=s.accentColor(),paw=s.pawColor(),vest=s.vestColor();
        draw(sphere,x,y+1.16f*sc,z,1.30f*sc,1.55f*sc,1.02f*sc,body,yaw,0,0);
        draw(sphere,x,y+1.30f*sc,z-.08f*sc,1.05f*sc,.92f*sc,.86f*sc,vest,yaw,0,0);
        P head=local(x,z,yaw,0,.05f*sc);draw(sphere,head.x,y+2.31f*sc,head.z,1.20f*sc,1.05f*sc,1.03f*sc,body,yaw,0,0);
        P muzzle=local(x,z,yaw,0,.52f*sc);draw(sphere,muzzle.x,y+2.18f*sc,muzzle.z,.66f*sc,.45f*sc,.64f*sc,paw,yaw,0,0);
        for(int side:new int[]{-1,1}){P eye=local(x,z,yaw,side*.27f*sc,.49f*sc);draw(sphere,eye.x,y+2.48f*sc,eye.z,.11f*sc,.14f*sc,.09f*sc,0xff0b1217,yaw,0,0);}
        drawEars(x,y,z,yaw,s,sc,body,accent);drawLimbs(x,y,z,yaw,s,sc,body,paw);drawTail(x,y,z,yaw,s,sc,body,accent);
        P wp=local(x,z,yaw,.58f*sc,.28f*sc);drawWeapon(wp.x,y+1.52f*sc,wp.z,yaw,player?weaponIndex:(s.id.hashCode()&0x7fffffff)%WEAPONS.length);
    }

    private void drawEars(float x,float y,float z,float yaw,SpeciesCatalog3D.Species s,float sc,int body,int accent){
        String e=s.ears;if("none".equals(e))return;
        for(int side:new int[]{-1,1}){P p=local(x,z,yaw,side*.40f*sc,.03f*sc);if("floppy".equals(e))draw(cylinder,p.x,y+2.62f*sc,p.z,.25f*sc,.80f*sc,.24f*sc,accent,yaw,0,side*28);else if("triangle".equals(e)||"upright".equals(e)||"bat".equals(e)||"horn".equals(e)||"antler".equals(e))draw(cone,p.x,y+2.86f*sc,p.z,.43f*sc,.85f*sc,.43f*sc,accent,yaw,0,side*12);else if("gills".equals(e)){for(int k=-1;k<=1;k++){P g=local(x,z,yaw,side*(.48f+Math.abs(k)*.07f)*sc,.02f);draw(cylinder,g.x,y+(2.3f+k*.20f)*sc,g.z,.12f*sc,.46f*sc,.12f*sc,accent,yaw,0,side*55);}}else draw(sphere,p.x,y+2.67f*sc,p.z,.42f*sc,.42f*sc,.35f*sc,accent,yaw,0,0);}
    }
    private void drawLimbs(float x,float y,float z,float yaw,SpeciesCatalog3D.Species s,float sc,int body,int paw){for(int side:new int[]{-1,1}){P arm=local(x,z,yaw,side*.62f*sc,.12f*sc);draw(cylinder,arm.x,y+1.25f*sc,arm.z,.25f*sc,.92f*sc,.25f*sc,"wing".equals(s.limb)?s.accentColor():body,yaw,0,side*18);P foot=local(x,z,yaw,side*.35f*sc,.18f*sc);draw(sphere,foot.x,y+.32f*sc,foot.z,.48f*sc,.35f*sc,.62f*sc,paw,yaw,0,0);}}
    private void drawTail(float x,float y,float z,float yaw,SpeciesCatalog3D.Species s,float sc,int body,int accent){if("none".equals(s.tail))return;P p=local(x,z,yaw,.12f*sc,-.70f*sc);if("puff".equals(s.tail)||"stub".equals(s.tail)||"bear".equals(s.tail))draw(sphere,p.x,y+1.05f*sc,p.z,.48f*sc,.48f*sc,.48f*sc,accent,yaw,0,0);else if("beaver".equals(s.tail))draw(cube,p.x,y+.86f*sc,p.z,.72f*sc,.22f*sc,1.10f*sc,accent,yaw,24,0);else draw(cylinder,p.x,y+1.00f*sc,p.z,.30f*sc,1.25f*sc,.30f*sc,"brush".equals(s.tail)?body:accent,yaw,55,18);}
    private void drawWeapon(float x,float y,float z,float yaw,int index){int c[]={0xff75d06f,0xffb78450,0xffff8c4b,0xffffc84f,0xffbd79ff}[Math.floorMod(index,5)];draw(cube,x,y,z,.28f,.28f,1.12f,c,yaw,0,0);P barrel=local(x,z,yaw,0,.70f);draw(cylinder,barrel.x,y,barrel.z,.15f,.66f,.15f,0xffdbe8ec,yaw,90,0);}

    private float yawDeg(){return(float)Math.toDegrees(Math.atan2(lastAimX,-lastAimZ));}
    private P local(float x,float z,float yawDeg,float lateral,float forward){double r=Math.toRadians(yawDeg);float rx=(float)Math.cos(r),rz=(float)Math.sin(r),fx=(float)Math.sin(r),fz=-(float)Math.cos(r);return new P(x+rx*lateral+fx*forward,z+rz*lateral+fz*forward);}

    private void draw(MeshFactory3D.Mesh mesh,float x,float y,float z,float sx,float sy,float sz,int color,float yaw,float pitch,float roll){
        Matrix.setIdentityM(model,0);Matrix.translateM(model,0,x,y,z);Matrix.rotateM(model,0,yaw,0,1,0);Matrix.rotateM(model,0,pitch,1,0,0);Matrix.rotateM(model,0,roll,0,0,1);Matrix.scaleM(model,0,sx,sy,sz);Matrix.multiplyMM(mvp,0,vp,0,model,0);
        GLES30.glUniformMatrix4fv(uMvp,1,false,mvp,0);GLES30.glUniformMatrix4fv(uModel,1,false,model,0);float a=Color.alpha(color)/255f;GLES30.glUniform4f(uColor,Color.red(color)/255f,Color.green(color)/255f,Color.blue(color)/255f,a);
        mesh.positions.position(0);mesh.normals.position(0);GLES30.glEnableVertexAttribArray(aPos);GLES30.glVertexAttribPointer(aPos,3,GLES30.GL_FLOAT,false,0,mesh.positions);GLES30.glEnableVertexAttribArray(aNormal);GLES30.glVertexAttribPointer(aNormal,3,GLES30.GL_FLOAT,false,0,mesh.normals);GLES30.glDrawArrays(GLES30.GL_TRIANGLES,0,mesh.vertexCount);
    }

    private static int buildProgram(String vs,String fs){int v=shader(GLES30.GL_VERTEX_SHADER,vs),f=shader(GLES30.GL_FRAGMENT_SHADER,fs),p=GLES30.glCreateProgram();GLES30.glAttachShader(p,v);GLES30.glAttachShader(p,f);GLES30.glLinkProgram(p);int[] ok=new int[1];GLES30.glGetProgramiv(p,GLES30.GL_LINK_STATUS,ok,0);if(ok[0]==0)throw new IllegalStateException("OpenGL program link failed: "+GLES30.glGetProgramInfoLog(p));GLES30.glDeleteShader(v);GLES30.glDeleteShader(f);return p;}
    private static int shader(int type,String src){int s=GLES30.glCreateShader(type);GLES30.glShaderSource(s,src);GLES30.glCompileShader(s);int[]ok=new int[1];GLES30.glGetShaderiv(s,GLES30.GL_COMPILE_STATUS,ok,0);if(ok[0]==0)throw new IllegalStateException("OpenGL shader failed: "+GLES30.glGetShaderInfoLog(s));return s;}
    private static float clamp(float v,float lo,float hi){return Math.max(lo,Math.min(hi,v));}

    private static final class P{final float x,z;P(float x,float z){this.x=x;this.z=z;}}
    private static final class Enemy{float x,z,hp,speed,attack;int species;Enemy(float x,float z,int s,float hp,float speed){this.x=x;this.z=z;this.species=s;this.hp=hp;this.speed=speed;}}
    private static final class Bullet{float x,y,z,vx,vz,damage,life;Bullet(float x,float y,float z,float vx,float vz,float d,float l){this.x=x;this.y=y;this.z=z;this.vx=vx;this.vz=vz;damage=d;life=l;}}
    private static final class Loot{float x,z;int value;Loot(float x,float z,int v){this.x=x;this.z=z;value=v;}}

    private static final String VS="#version 300 es\nprecision mediump float;in vec3 aPos;in vec3 aNormal;uniform mat4 uMvp;uniform mat4 uModel;out vec3 vNormal;out vec3 vWorld;void main(){vec4 w=uModel*vec4(aPos,1.0);vWorld=w.xyz;vNormal=mat3(uModel)*aNormal;gl_Position=uMvp*vec4(aPos,1.0);}";
    private static final String FS="#version 300 es\nprecision mediump float;in vec3 vNormal;in vec3 vWorld;uniform vec4 uColor;uniform vec3 uCamera;out vec4 outColor;void main(){vec3 n=normalize(vNormal);float sun=max(dot(n,normalize(vec3(.35,.82,.25))),0.0);float light=.34+sun*.66;float dist=distance(vWorld,uCamera);float fog=clamp((dist-34.0)/38.0,0.0,.55);vec3 base=uColor.rgb*light;vec3 fogColor=vec3(.035,.09,.10);outColor=vec4(mix(base,fogColor,fog),uColor.a);}";
}
