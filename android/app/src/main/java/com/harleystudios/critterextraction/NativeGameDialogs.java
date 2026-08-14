package com.harleystudios.critterextraction;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.graphics.Color;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Functional native dialogs for the interactive systems exposed by main/live. */
public final class NativeGameDialogs {
    private static final int BG=0xff111225,PANEL=0xff202344,TEXT=0xfff7f7ff,MUTED=0xffaeb2d1,MINT=0xff7ef7d4,PURPLE=0xff8e82ff;
    private NativeGameDialogs(){}

    public static void controls(Activity a){
        String message="MOBILE CONTROLS\n\nLeft stick — Move\nRight drag — Look / aim direction\nFIRE — Fire equipped weapon\nAIM — Hold aim / tighter spread\nR — Reload\nC — Crouch\nJUMP — Jump\nUSE — Pick up loot, open supplies, hold to extract\nHeal — use Picnic Medkit or Berry Patch\nCAM — first/third person\nShoulder — swap third-person shoulder\nBAG — match inventory\nPause — pause menu\n\nThe native Android build follows the same actions as the /live game instead of desktop keyboard labels.";
        basic(a,"Controls",message);
    }

    public static void profile(Activity a,NativeProfileStore store,Runnable changed){
        NativeProfileStore.Account acct=store.active();LinearLayout box=column(a);EditText name=input(a,"Display name",acct.displayName);EditText handle=input(a,"Username",acct.username);EditText bio=input(a,"Bio",acct.bio);box.addView(name);box.addView(handle);box.addView(bio);
        new AlertDialog.Builder(a).setTitle("Name & Profile").setView(wrap(a,box)).setNegativeButton("Cancel",null).setPositiveButton("Save",(d,w)->{store.updateProfile(name.getText().toString(),handle.getText().toString(),bio.getText().toString(),store.active().speciesId);if(changed!=null)changed.run();}).show();
    }

    public static void accounts(Activity a,NativeProfileStore store,Runnable changed){
        LinearLayout box=column(a);for(NativeProfileStore.Account account:store.accounts()){LinearLayout row=row(a);TextView t=label(a,account.displayName+"  @"+account.username+(account.id.equals(store.active().id)?"  • ACTIVE":""),16,account.id.equals(store.active().id)?MINT:TEXT);row.addView(t,new LinearLayout.LayoutParams(0,-2,1));if(!account.id.equals(store.active().id)){Button use=button(a,"Switch");use.setOnClickListener(v->{store.switchAccount(account.id);if(changed!=null)changed.run();accounts(a,store,changed);});row.addView(use);}if(store.accounts().size()>1){Button del=button(a,"Delete");del.setOnClickListener(v->new AlertDialog.Builder(a).setTitle("Delete account?").setMessage(account.displayName+" and its local save will be removed from this app.").setNegativeButton("Cancel",null).setPositiveButton("Delete",(d,w)->{store.deleteAccount(account.id);if(changed!=null)changed.run();accounts(a,store,changed);}).show());row.addView(del);}box.addView(row);}
        Button create=button(a,"Create New Critter");create.setOnClickListener(v->{EditText e=input(a,"Display name","New Critter");new AlertDialog.Builder(a).setTitle("Create Account").setView(e).setNegativeButton("Cancel",null).setPositiveButton("Create",(d,w)->{store.createAccount(e.getText().toString());if(changed!=null)changed.run();accounts(a,store,changed);}).show();});box.addView(create);
        new AlertDialog.Builder(a).setTitle("Accounts").setView(wrap(a,box)).setPositiveButton("Done",null).show();
    }

    public static void character(Activity a,NativeProfileStore store,Runnable changed){
        ArrayList<String> names=new ArrayList<>(),ids=new ArrayList<>();for(NativeGameData.Species s:NativeGameData.SPECIES.values()){names.add((s.id.equals(store.active().speciesId)?"✓ ":"")+s.name+" — "+s.role);ids.add(s.id);}new AlertDialog.Builder(a).setTitle("Choose Critter").setItems(names.toArray(new String[0]),(d,which)->{store.selectSpecies(ids.get(which));if(changed!=null)changed.run();}).setNegativeButton("Cancel",null).show();
    }

    public static void loadouts(Activity a,NativeProfileStore store,Runnable changed){
        ArrayList<NativeGameData.Loadout> ls=new ArrayList<>(NativeGameData.LOADOUTS.values());String[] labels=new String[ls.size()];for(int i=0;i<ls.size();i++){NativeGameData.Loadout l=ls.get(i);labels[i]=(l.id.equals(store.active().loadoutId)?"✓ ":"")+l.name+" • "+l.tag+"\n"+l.description;}
        new AlertDialog.Builder(a).setTitle("Choose Kit").setItems(labels,(d,which)->{NativeGameData.Loadout l=ls.get(which);if(l.custom&&store.active().prepared.isEmpty()){toast(a,"Pack items from Stash before using Custom Loadout.");stash(a,store,changed);return;}store.selectLoadout(l.id);if(changed!=null)changed.run();toast(a,l.name+" selected.");}).setNegativeButton("Cancel",null).show();
    }

    public static void stash(Activity a,NativeProfileStore store,Runnable changed){
        NativeProfileStore.Account acct=store.active();LinearLayout box=column(a);box.addView(label(a,"ACCOUNT STASH  "+acct.stash.size()+" / "+NativeGameData.STASH_SLOTS+" slots",13,MINT));if(acct.stash.isEmpty())box.addView(label(a,"Stash is empty. Extract loot or buy supplies at the Trading Post.",13,MUTED));for(NativeProfileStore.Stack s:new ArrayList<>(acct.stash)){NativeGameData.Item item=NativeGameData.ITEMS.get(s.itemId);LinearLayout r=row(a);r.addView(label(a,(item==null?s.itemId:item.name)+"  ×"+s.qty,14,TEXT),new LinearLayout.LayoutParams(0,-2,1));Button pack=button(a,"Pack 1");pack.setOnClickListener(v->{if(store.moveStashToPrepared(s.itemId,1)){if(changed!=null)changed.run();stash(a,store,changed);}else toast(a,"Backpack full.");});r.addView(pack);box.addView(r);}box.addView(label(a,"\nPREPARED BACKPACK  "+acct.prepared.size()+" / "+NativeGameData.BACKPACK_SLOTS+" slots",13,MINT));if(acct.prepared.isEmpty())box.addView(label(a,"No custom items packed.",13,MUTED));for(NativeProfileStore.Stack s:new ArrayList<>(acct.prepared)){NativeGameData.Item item=NativeGameData.ITEMS.get(s.itemId);LinearLayout r=row(a);r.addView(label(a,(item==null?s.itemId:item.name)+"  ×"+s.qty,14,TEXT),new LinearLayout.LayoutParams(0,-2,1));Button back=button(a,"Return 1");back.setOnClickListener(v->{if(store.movePreparedToStash(s.itemId,1)){if(changed!=null)changed.run();stash(a,store,changed);}else toast(a,"Stash full.");});r.addView(back);box.addView(r);}new AlertDialog.Builder(a).setTitle("Stash & Prepared Gear").setView(wrap(a,box)).setPositiveButton("Done",null).show();
    }

    public static void merchant(Activity a,NativeProfileStore store,Runnable changed){
        NativeProfileStore.Account acct=store.active();LinearLayout box=column(a);box.addView(label(a,"🌸 "+NativeGameData.formatPetals(acct.petals),18,MINT));box.addView(label(a,"BUY SUPPLIES",13,TEXT));for(String id:NativeGameData.MERCHANT_BUY_IDS){NativeGameData.Item item=NativeGameData.ITEMS.get(id);if(item==null)continue;LinearLayout r=row(a);r.addView(label(a,item.name+"  • "+item.buyPrice+" 🌸",13,TEXT),new LinearLayout.LayoutParams(0,-2,1));Button buy=button(a,"Buy");buy.setOnClickListener(v->{toast(a,store.buy(id,1));if(changed!=null)changed.run();merchant(a,store,changed);});r.addView(buy);box.addView(r);}box.addView(label(a,"\nSELL FROM STASH",13,TEXT));if(acct.stash.isEmpty())box.addView(label(a,"Nothing to sell.",13,MUTED));for(NativeProfileStore.Stack s:new ArrayList<>(acct.stash)){NativeGameData.Item item=NativeGameData.ITEMS.get(s.itemId);if(item==null||!item.canSell)continue;LinearLayout r=row(a);r.addView(label(a,item.name+" ×"+s.qty+"  • "+item.sellPrice+" 🌸 each",13,TEXT),new LinearLayout.LayoutParams(0,-2,1));Button sell=button(a,"Sell 1");sell.setOnClickListener(v->{toast(a,store.sell(s.itemId,1));if(changed!=null)changed.run();merchant(a,store,changed);});r.addView(sell);box.addView(r);}Button junk=button(a,"Sell Safe Junk");junk.setOnClickListener(v->{toast(a,store.sellSafeJunk());if(changed!=null)changed.run();merchant(a,store,changed);});box.addView(junk);if(!acct.transactions.isEmpty()){box.addView(label(a,"\nRECENT TRANSACTIONS",13,MINT));for(int i=0;i<Math.min(8,acct.transactions.size());i++)box.addView(label(a,acct.transactions.get(i),11,MUTED));}new AlertDialog.Builder(a).setTitle("Trading Post").setView(wrap(a,box)).setPositiveButton("Done",null).show();
    }

    public static void settings(Activity a,NativeProfileStore store,Runnable changed){
        NativeGameData.Settings s=store.active().settings;LinearLayout box=column(a);
        Spinner camera=spinner(a,new String[]{"third","first"},s.cameraMode);Spinner shoulder=spinner(a,new String[]{"right","left"},s.shoulderSide);Spinner difficulty=spinner(a,new String[]{"cozy","standard","spicy"},s.difficulty);Spinner respawn=spinner(a,new String[]{"off","slow","normal","fast"},s.enemyRespawnRate);Spinner quality=spinner(a,new String[]{"low","medium","high"},s.quality);
        addField(box,a,"Camera",camera);addField(box,a,"Shoulder",shoulder);addField(box,a,"Difficulty",difficulty);addField(box,a,"Enemy respawn",respawn);addField(box,a,"Graphics quality",quality);
        SeekBar fov=seek(a,60,100,Math.round(s.fov));SeekBar sensitivity=seek(a,25,200,Math.round(s.sensitivity*100));SeekBar hud=seek(a,75,125,s.hudScale);SeekBar volume=seek(a,0,100,s.volume);addField(box,a,"Field of view",fov);addField(box,a,"Look sensitivity",sensitivity);addField(box,a,"HUD scale",hud);addField(box,a,"Volume",volume);
        CheckBox invert=check(a,"Invert Y",s.invertY),assist=check(a,"Aim assist",s.aimAssist),reload=check(a,"Auto reload",s.autoReload),hints=check(a,"Show hints",s.showHints),fog=check(a,"Fog",s.fogEnabled),motion=check(a,"Reduced motion",s.reducedMotion),touch=check(a,"Always show touch controls",s.touchAlways);box.addView(invert);box.addView(assist);box.addView(reload);box.addView(hints);box.addView(fog);box.addView(motion);box.addView(touch);
        new AlertDialog.Builder(a).setTitle("Settings").setView(wrap(a,box)).setNegativeButton("Cancel",null).setPositiveButton("Save",(d,w)->{NativeGameData.Settings n=new NativeGameData.Settings();n.cameraMode=(String)camera.getSelectedItem();n.shoulderSide=(String)shoulder.getSelectedItem();n.difficulty=(String)difficulty.getSelectedItem();n.enemyRespawnRate=(String)respawn.getSelectedItem();n.quality=(String)quality.getSelectedItem();n.fov=fov.getProgress()+60;n.sensitivity=(sensitivity.getProgress()+25)/100f;n.hudScale=hud.getProgress()+75;n.volume=volume.getProgress();n.invertY=invert.isChecked();n.aimAssist=assist.isChecked();n.autoReload=reload.isChecked();n.showHints=hints.isChecked();n.fogEnabled=fog.isChecked();n.reducedMotion=motion.isChecked();n.touchAlways=touch.isChecked();store.updateSettings(n);if(changed!=null)changed.run();}).show();
    }

    public static void saveTools(Activity a,NativeProfileStore store,Runnable changed){
        LinearLayout box=column(a);Button export=button(a,"Show Save JSON");export.setOnClickListener(v->{EditText e=input(a,"Save JSON",store.exportJson());e.setMinLines(12);e.setGravity(Gravity.TOP);new AlertDialog.Builder(a).setTitle("Export Save").setView(e).setPositiveButton("Done",null).show();});Button imp=button(a,"Import Save JSON");imp.setOnClickListener(v->{EditText e=input(a,"Paste save JSON","");e.setMinLines(10);e.setGravity(Gravity.TOP);new AlertDialog.Builder(a).setTitle("Import Save").setView(e).setNegativeButton("Cancel",null).setPositiveButton("Import",(d,w)->{if(store.importJson(e.getText().toString())){toast(a,"Save imported.");if(changed!=null)changed.run();}else toast(a,"Invalid save data.");}).show();});box.addView(export);box.addView(imp);new AlertDialog.Builder(a).setTitle("Portable Save").setView(box).setPositiveButton("Done",null).show();
    }

    private static void basic(Activity a,String title,String message){new AlertDialog.Builder(a).setTitle(title).setMessage(message).setPositiveButton("Done",null).show();}
    private static LinearLayout column(Activity a){LinearLayout l=new LinearLayout(a);l.setOrientation(LinearLayout.VERTICAL);l.setPadding(dp(a,18),dp(a,12),dp(a,18),dp(a,12));l.setBackgroundColor(PANEL);return l;}
    private static LinearLayout row(Activity a){LinearLayout l=new LinearLayout(a);l.setOrientation(LinearLayout.HORIZONTAL);l.setGravity(Gravity.CENTER_VERTICAL);l.setPadding(0,dp(a,4),0,dp(a,4));return l;}
    private static ScrollView wrap(Activity a,View v){ScrollView s=new ScrollView(a);s.setBackgroundColor(BG);s.addView(v);return s;}
    private static TextView label(Activity a,String text,int sp,int color){TextView t=new TextView(a);t.setText(text);t.setTextSize(sp);t.setTextColor(color);t.setPadding(dp(a,6),dp(a,7),dp(a,6),dp(a,7));return t;}
    private static Button button(Activity a,String text){Button b=new Button(a);b.setText(text);b.setAllCaps(false);b.setTextColor(TEXT);b.setBackgroundColor(PURPLE);return b;}
    private static EditText input(Activity a,String hint,String value){EditText e=new EditText(a);e.setHint(hint);e.setText(value);e.setTextColor(TEXT);e.setHintTextColor(MUTED);e.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);e.setPadding(dp(a,12),dp(a,10),dp(a,12),dp(a,10));return e;}
    private static CheckBox check(Activity a,String text,boolean checked){CheckBox c=new CheckBox(a);c.setText(text);c.setTextColor(TEXT);c.setChecked(checked);return c;}
    private static Spinner spinner(Activity a,String[] values,String selected){Spinner s=new Spinner(a);ArrayAdapter<String> adapter=new ArrayAdapter<>(a,android.R.layout.simple_spinner_dropdown_item,values);s.setAdapter(adapter);for(int i=0;i<values.length;i++)if(values[i].equals(selected))s.setSelection(i);return s;}
    private static SeekBar seek(Activity a,int min,int max,int current){SeekBar b=new SeekBar(a);b.setMax(max-min);b.setProgress(Math.max(0,Math.min(max-min,current-min)));return b;}
    private static void addField(LinearLayout parent,Activity a,String label,View field){parent.addView(label(a,label,11,MINT));parent.addView(field,new LinearLayout.LayoutParams(-1,-2));}
    private static int dp(Activity a,int v){return Math.round(v*a.getResources().getDisplayMetrics().density);}
    private static void toast(Activity a,String s){Toast.makeText(a,s,Toast.LENGTH_SHORT).show();}
}
