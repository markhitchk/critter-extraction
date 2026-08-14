package com.harleystudios.critterextraction;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.List;

/** Shared low-poly OpenGL meshes used by every native critter and world prop. */
public final class MeshFactory3D {
    public static final class Mesh {
        public final FloatBuffer positions;
        public final FloatBuffer normals;
        public final int vertexCount;
        Mesh(float[] p, float[] n) {
            positions = buffer(p); normals = buffer(n); vertexCount = p.length / 3;
        }
    }

    private static FloatBuffer buffer(float[] values) {
        FloatBuffer b = ByteBuffer.allocateDirect(values.length * 4).order(ByteOrder.nativeOrder()).asFloatBuffer();
        b.put(values).position(0); return b;
    }

    public static Mesh cube() {
        float[] p = {
            -.5f,-.5f,.5f, .5f,-.5f,.5f, .5f,.5f,.5f, -.5f,-.5f,.5f, .5f,.5f,.5f, -.5f,.5f,.5f,
            .5f,-.5f,-.5f, -.5f,-.5f,-.5f, -.5f,.5f,-.5f, .5f,-.5f,-.5f, -.5f,.5f,-.5f, .5f,.5f,-.5f,
            -.5f,-.5f,-.5f, -.5f,-.5f,.5f, -.5f,.5f,.5f, -.5f,-.5f,-.5f, -.5f,.5f,.5f, -.5f,.5f,-.5f,
            .5f,-.5f,.5f, .5f,-.5f,-.5f, .5f,.5f,-.5f, .5f,-.5f,.5f, .5f,.5f,-.5f, .5f,.5f,.5f,
            -.5f,.5f,.5f, .5f,.5f,.5f, .5f,.5f,-.5f, -.5f,.5f,.5f, .5f,.5f,-.5f, -.5f,.5f,-.5f,
            -.5f,-.5f,-.5f, .5f,-.5f,-.5f, .5f,-.5f,.5f, -.5f,-.5f,-.5f, .5f,-.5f,.5f, -.5f,-.5f,.5f
        };
        float[] n = new float[p.length];
        float[][] face = {{0,0,1},{0,0,-1},{-1,0,0},{1,0,0},{0,1,0},{0,-1,0}};
        for(int f=0;f<6;f++) for(int v=0;v<6;v++) { int o=(f*18)+(v*3); n[o]=face[f][0]; n[o+1]=face[f][1]; n[o+2]=face[f][2]; }
        return new Mesh(p,n);
    }

    public static Mesh sphere(int lat, int lon) {
        List<Float> p=new ArrayList<>(), n=new ArrayList<>();
        for(int y=0;y<lat;y++) {
            double t0=Math.PI*y/lat-Math.PI/2.0, t1=Math.PI*(y+1)/lat-Math.PI/2.0;
            for(int x=0;x<lon;x++) {
                double a0=Math.PI*2*x/lon, a1=Math.PI*2*(x+1)/lon;
                addSphereTri(p,n,t0,a0,t1,a0,t1,a1); addSphereTri(p,n,t0,a0,t1,a1,t0,a1);
            }
        }
        return new Mesh(toArray(p),toArray(n));
    }

    private static void addSphereTri(List<Float> p,List<Float> n,double t0,double a0,double t1,double a1,double t2,double a2){
        addSphereVertex(p,n,t0,a0); addSphereVertex(p,n,t1,a1); addSphereVertex(p,n,t2,a2);
    }
    private static void addSphereVertex(List<Float> p,List<Float> n,double t,double a){
        float x=(float)(Math.cos(t)*Math.sin(a)), y=(float)Math.sin(t), z=(float)(Math.cos(t)*Math.cos(a));
        n.add(x);n.add(y);n.add(z); p.add(x*.5f);p.add(y*.5f);p.add(z*.5f);
    }

    public static Mesh cylinder(int seg) {
        List<Float> p=new ArrayList<>(), n=new ArrayList<>();
        for(int i=0;i<seg;i++) {
            double a0=2*Math.PI*i/seg,a1=2*Math.PI*(i+1)/seg;
            float x0=(float)Math.sin(a0)*.5f,z0=(float)Math.cos(a0)*.5f,x1=(float)Math.sin(a1)*.5f,z1=(float)Math.cos(a1)*.5f;
            addQuad(p,n,x0,-.5f,z0,x1,-.5f,z1,x1,.5f,z1,x0,.5f,z0,(float)Math.sin((a0+a1)/2),0,(float)Math.cos((a0+a1)/2));
            addTri(p,n,0,.5f,0,x0,.5f,z0,x1,.5f,z1,0,1,0);
            addTri(p,n,0,-.5f,0,x1,-.5f,z1,x0,-.5f,z0,0,-1,0);
        }
        return new Mesh(toArray(p),toArray(n));
    }

    public static Mesh cone(int seg) {
        List<Float> p=new ArrayList<>(), n=new ArrayList<>();
        for(int i=0;i<seg;i++) {
            double a0=2*Math.PI*i/seg,a1=2*Math.PI*(i+1)/seg;
            float x0=(float)Math.sin(a0)*.5f,z0=(float)Math.cos(a0)*.5f,x1=(float)Math.sin(a1)*.5f,z1=(float)Math.cos(a1)*.5f;
            float nx=(float)Math.sin((a0+a1)/2), nz=(float)Math.cos((a0+a1)/2);
            addTri(p,n,x0,-.5f,z0,x1,-.5f,z1,0,.5f,0,nx,.45f,nz);
            addTri(p,n,0,-.5f,0,x1,-.5f,z1,x0,-.5f,z0,0,-1,0);
        }
        return new Mesh(toArray(p),toArray(n));
    }

    private static void addQuad(List<Float>p,List<Float>n,float ax,float ay,float az,float bx,float by,float bz,float cx,float cy,float cz,float dx,float dy,float dz,float nx,float ny,float nz){
        addTri(p,n,ax,ay,az,bx,by,bz,cx,cy,cz,nx,ny,nz); addTri(p,n,ax,ay,az,cx,cy,cz,dx,dy,dz,nx,ny,nz);
    }
    private static void addTri(List<Float>p,List<Float>n,float ax,float ay,float az,float bx,float by,float bz,float cx,float cy,float cz,float nx,float ny,float nz){
        float[] v={ax,ay,az,bx,by,bz,cx,cy,cz}; for(float f:v)p.add(f); for(int i=0;i<3;i++){n.add(nx);n.add(ny);n.add(nz);} }
    private static float[] toArray(List<Float> list){ float[] a=new float[list.size()]; for(int i=0;i<a.length;i++)a[i]=list.get(i); return a; }
    private MeshFactory3D(){}
}
