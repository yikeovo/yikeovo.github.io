import * as THREE from './vendor/three.module.js';

export const HOME_ACTIVITIES=[
  {id:'tea',room:'客厅',title:'倒一杯热茶',hint:'走近茶几上的茶壶，看看茶水倒进杯子。'},
  {id:'sit',room:'客厅',title:'在沙发上歇一会儿',hint:'走近花布沙发坐下。按空格、起身按钮或直接走动就能站起来。'},
  {id:'tv',room:'客厅',title:'打开老电视',hint:'茶几上有遥控器；打开后，电视会轮播家里的旧照片。'},
  {id:'water',room:'客厅',title:'给窗边的花浇水',hint:'走到窗边的盆栽，拿起旁边的水壶。'},
  {id:'drawer',room:'西北卧室',title:'翻翻书桌的抽屉',hint:'拉开电脑桌正面的抽屉，再点里面的照片。'},
  {id:'lamp',room:'西北卧室',title:'点亮书桌上的灯',hint:'点一下电脑旁的绿色台灯，灯光会照亮书桌；再点可关闭。'}
];
const STORAGE_KEY='laojia-birthday:activities:v1';

export function createHomeActivities({scene,camera,materials:m,interact,sofa,teapot,cups,plant,tv,tvStand,desk,lamp,lampLight}){
  const completed=new Set();try{for(const id of JSON.parse(localStorage.getItem(STORAGE_KEY))||[])if(HOME_ACTIVITIES.some(a=>a.id===id))completed.add(id);}catch{}
  const notices=[],animations=new Map();let revision=0,seated=false,standingPose=null,seatTarget=null;
  let tvOn=false,tvIndex=0,slideElapsed=0,lampOn=false,drawerOpen=false;
  const data=new Map();
  function complete(id){if(!completed.has(id)){completed.add(id);revision++;try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...completed]));}catch{}}}
  function note(message){notices.push(message);revision++;}
  function register(root,id,title,description,action=id){const value={id,kind:'activity',action,title,description};data.set(action,value);interact(root,value);return root;}
  function mesh(geometry,material,parent,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.userData.dynamic=true;o.userData.managedVisibility=true;o.castShadow=false;parent.add(o);return o;}
  function group(parent,x,y,z){const root=new THREE.Group();root.position.set(x,y,z);root.userData.dynamic=true;parent.add(root);return root;}
  function animate(id,duration,step,finish){if(animations.has(id))return false;animations.set(id,{elapsed:0,duration,step,finish});return true;}

  register(sofa,'sofa-seat','在沙发上坐坐','坐下来，给自己留一会儿空闲','sit');
  teapot.userData.dynamic=true;
  register(teapot,'tea-pot','给爸爸倒杯茶','茶几上的壶，真的可以拿起来倒茶','tea');
  const teaStart=teapot.position.clone(),teaRotation=teapot.rotation.clone();
  const liquid=mesh(new THREE.CircleGeometry(.037,24),new THREE.MeshStandardMaterial({color:'#95672b',transparent:true,opacity:.86,roughness:.16}),cups[1],0,.092,0);
  liquid.rotation.x=-Math.PI/2;liquid.visible=false;
  const stream=mesh(new THREE.CylinderGeometry(.004,.005,1,8),new THREE.MeshBasicMaterial({color:'#d6c9a3',transparent:true,opacity:.68}),teapot.parent);stream.visible=false;
  function setStream(from,to){stream.position.copy(from).add(to).multiplyScalar(.5);const delta=to.clone().sub(from);stream.scale.y=delta.length();stream.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}

  // A separate control keeps opening an original photo on the television intact.
  const remote=group(teapot.parent,0,.565,.53);
  mesh(new THREE.BoxGeometry(.11,.035,.25),m.dark,remote);
  mesh(new THREE.CylinderGeometry(.016,.016,.008,16),m.red,remote,0,.02,-.075);
  for(const x of [-.025,.025])for(const z of [-.02,.035,.08])mesh(new THREE.BoxGeometry(.018,.008,.023),m.paper,remote,x,.02,z);
  register(remote,'tv-remote','打开老电视','按一下遥控器，让旧照片回到电视里','tv');
  const screen=group(tvStand,0,1.19,.346+tv.position.z);
  const screenShape=new THREE.Shape();const sw=.86,sh=.53,r=.035;
  screenShape.moveTo(-sw/2+r,-sh/2);screenShape.lineTo(sw/2-r,-sh/2);screenShape.quadraticCurveTo(sw/2,-sh/2,sw/2,-sh/2+r);screenShape.lineTo(sw/2,sh/2-r);screenShape.quadraticCurveTo(sw/2,sh/2,sw/2-r,sh/2);screenShape.lineTo(-sw/2+r,sh/2);screenShape.quadraticCurveTo(-sw/2,sh/2,-sw/2,sh/2-r);screenShape.lineTo(-sw/2,-sh/2+r);screenShape.quadraticCurveTo(-sw/2,-sh/2,-sw/2+r,-sh/2);
  mesh(new THREE.ShapeGeometry(screenShape),new THREE.MeshBasicMaterial({color:'#0c1310'}),screen);
  const screenPhoto=mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:m.photoTextures[0],toneMapped:false}),screen,0,0,.003);
  screen.visible=false;
  function changeSlide(){const texture=m.photoTextures[tvIndex];screenPhoto.material.map=texture;const aspect=texture.image.width/texture.image.height,w=Math.min(.81,.48*aspect);screenPhoto.scale.set(w,w/aspect,1);screenPhoto.material.needsUpdate=true;if(tvOn)tv.userData.interaction.index=tvIndex;}
  changeSlide();

  register(plant,'living-plant','给窗边的花浇水','旁边的水壶还能用，给它浇一点水','water');
  const wateringCan=group(scene,plant.position.x+.56,.13,plant.position.z),canStart=wateringCan.position.clone();
  mesh(new THREE.CylinderGeometry(.09,.075,.19,24),m.enamel,wateringCan);
  const spout=mesh(new THREE.CylinderGeometry(.015,.024,.25,12),m.enamel,wateringCan,-.15,.025,0);spout.rotation.z=1.04;
  const handle=mesh(new THREE.TorusGeometry(.085,.012,8,24,Math.PI*1.5),m.metal,wateringCan,.08,.04,0);handle.rotation.z=-.8;
  register(wateringCan,'watering-can','拿水壶浇花','水壶会提起来，水会落进花盆里','water');
  const water=mesh(new THREE.CylinderGeometry(.006,.011,1,8),new THREE.MeshBasicMaterial({color:'#b7d4d0',transparent:true,opacity:.6}),scene);water.visible=false;

  const drawer=group(desk,-.62,.57,.12);
  mesh(new THREE.BoxGeometry(.5,.045,.43),m.wood,drawer,0,-.055,0);
  for(const side of [-1,1])mesh(new THREE.BoxGeometry(.035,.13,.45),m.darkWood,drawer,side*.25,0,0);
  mesh(new THREE.BoxGeometry(.54,.17,.045),m.wood,drawer,0,0,.24);
  const pull=mesh(new THREE.TorusGeometry(.028,.006,6,20,Math.PI),m.brass,drawer,0,.005,.272);pull.rotation.z=Math.PI;
  register(drawer,'desk-drawer','拉开书桌抽屉','里面还留着什么？','drawer');
  const hiddenPhoto=group(drawer,0,-.027,-.025);
  const photoHeight=.24*m.photoTextures[2].image.height/m.photoTextures[2].image.width;
  const backing=mesh(new THREE.PlaneGeometry(.28,photoHeight+.04),m.paper,hiddenPhoto,0,-.002,0);backing.rotation.x=-Math.PI/2;
  const postcard=mesh(new THREE.PlaneGeometry(.24,photoHeight),new THREE.MeshBasicMaterial({map:m.photoTextures[2],toneMapped:false}),hiddenPhoto);postcard.rotation.x=-Math.PI/2;
  interact(hiddenPhoto,{id:'drawer-photo',kind:'photo',index:2,title:'抽屉里的一张旧照片',description:'拿起来，看看照片里的我们',disabled:true});
  hiddenPhoto.visible=false;

  lamp.material=lamp.material.clone();lamp.userData.dynamic=true;
  register(lamp,'desk-lamp','点亮台灯','点一下，灯光会照亮书桌','lamp');
  const lampBulb=mesh(new THREE.SphereGeometry(.035,12,8),new THREE.MeshBasicMaterial({color:'#ffe6ab'}),desk,lamp.position.x,lamp.position.y-.045,lamp.position.z);lampBulb.visible=false;
  lampLight.intensity=0;lampLight.distance=2.3;lampLight.visible=false;

  function stand(){if(!seated)return false;seated=false;seatTarget=null;if(standingPose)camera.position.copy(standingPose);standingPose=null;data.get('sit').title='在沙发上坐坐';revision++;return true;}
  function perform(action){
    if(action==='sit'){
      if(seated){stand();note('起来走走，看看家里的其他地方。');return true;}
      standingPose=camera.position.clone();seated=true;seatTarget=sofa.localToWorld(new THREE.Vector3(0,1.13,.2));camera.lookAt(tvStand.localToWorld(new THREE.Vector3(0,1.13,0)));
      data.get('sit').title='从沙发上起身';data.get('sit').description='按起身按钮，或直接走动';complete('sit');note('坐下歇一会儿。可以转头看电视，也可以继续倒茶。');return true;
    }
    if(action==='tea'){
      const cup=cups[1].position,target=cup.clone().add(new THREE.Vector3(-.16,.23,0));
      const started=animate('tea',3,t=>{
        const lift=Math.min(1,t/.27),lower=t>.78?(1-t)/.22:1,blend=Math.max(0,Math.min(lift,lower));
        teapot.position.lerpVectors(teaStart,target,blend);teapot.rotation.z=teaRotation.z-.62*blend;
        stream.visible=t>.32&&t<.76;
        setStream(cup.clone().add(new THREE.Vector3(-.02,.27,0)),cup.clone().add(new THREE.Vector3(0,.092,0)));
        if(t>.52)liquid.visible=true;
      },()=>{teapot.position.copy(teaStart);teapot.rotation.copy(teaRotation);stream.visible=false;complete('tea');note('茶倒好了。爸，坐下喝一杯吧。');});
      if(started)revision++;return started;
    }
    if(action==='tv'){
      tvOn=!tvOn;screen.visible=tvOn;slideElapsed=0;changeSlide();
      if(!tvOn)tv.userData.interaction.index=1;
      data.get('tv').title=tvOn?'关上老电视':'打开老电视';data.get('tv').description=tvOn?'电视正在轮播家里的原照片':'按一下遥控器，让旧照片回到电视里';
      if(tvOn)complete('tv');note(tvOn?'电视亮了，旧照片会慢慢翻过。点电视还能打开原照片。':'电视关上了。');return true;
    }
    if(action==='water'){
      const startRotation=plant.rotation.z;
      const started=animate('water',2.5,t=>{
        const blend=Math.max(0,Math.min(t/.25,(1-t)/.2,1));wateringCan.position.lerpVectors(canStart,plant.position.clone().add(new THREE.Vector3(.34,.95,0)),blend);wateringCan.rotation.z=.55*blend;
        water.visible=t>.3&&t<.77;water.position.copy(plant.position).add(new THREE.Vector3(.04,.65,0));water.scale.y=.4;
        plant.rotation.z=startRotation+(t>.3&&t<.8?Math.sin(t*36)*.009:0);
      },()=>{wateringCan.position.copy(canStart);wateringCan.rotation.z=0;plant.rotation.z=startRotation;water.visible=false;complete('water');note('浇好了。窗边这点绿，也要慢慢照顾。');});
      if(started)revision++;return started;
    }
    if(action==='drawer'){
      if(animations.has('drawer'))return false;drawerOpen=!drawerOpen;
      const from=drawer.position.z,to=drawerOpen?.52:.12;
      if(!drawerOpen){hiddenPhoto.visible=false;hiddenPhoto.userData.interaction.disabled=true;}
      animate('drawer',.5,t=>{drawer.position.z=THREE.MathUtils.lerp(from,to,t*t*(3-2*t));},()=>{
        hiddenPhoto.visible=drawerOpen;hiddenPhoto.userData.interaction.disabled=!drawerOpen;
        if(drawerOpen){complete('drawer');note('抽屉里还有一张照片，拿起来看看。');}
        revision++;
      });data.get('drawer').title=drawerOpen?'合上抽屉':'拉开书桌抽屉';revision++;return true;
    }
    if(action==='lamp'){
      lampOn=!lampOn;lampLight.intensity=lampOn?3.3:0;lampLight.visible=lampOn;lamp.material.emissive.set(lampOn?'#e0ac59':'#000000');lamp.material.emissiveIntensity=lampOn?.35:0;lampBulb.visible=lampOn;
      data.get('lamp').title=lampOn?'关上台灯':'点亮台灯';if(lampOn)complete('lamp');note(lampOn?'灯亮了，书桌上暖了一点。':'台灯关好了。');return true;
    }
    return false;
  }
  return{
    perform,stand,get seated(){return seated;},get revision(){return revision;},get completed(){return [...completed];},
    get standingPosition(){return (standingPose||camera.position).clone();},
    get state(){return{seated,tvOn,tvIndex,lampOn,drawerOpen,teaFilled:liquid.visible,busy:[...animations.keys()]};},
    takeNotices(){return notices.splice(0);},
    tick(delta){let changed=false;
      if(seatTarget){camera.position.lerp(seatTarget,1-Math.exp(-delta*9));if(camera.position.distanceTo(seatTarget)<.004){camera.position.copy(seatTarget);seatTarget=null;}changed=true;}
      for(const[id,animation]of animations){animation.elapsed+=delta;const t=Math.min(1,animation.elapsed/animation.duration);animation.step(t);changed=true;if(t===1){animations.delete(id);animation.finish?.();}}
      if(tvOn){slideElapsed+=delta;if(slideElapsed>=6){slideElapsed=0;tvIndex=(tvIndex+1)%m.photoTextures.length;changeSlide();changed=true;}}
      return changed;
    }
  };
}
