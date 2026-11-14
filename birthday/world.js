import * as THREE from './vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { batchStaticScene,batchLocalRoot } from './scene-batches.js?v=22';
import { createMaterials, labelTexture,finishSurfaceMaterials } from './materials.js?v=25';
import {loadQualityAssets} from './quality-assets.js?v=25';
import {applyLightmaps} from './lightmaps.js?v=25';
import {createHomeActivities} from './activities.js?v=22';
import {HOUSE,ENTRY,YARD,TOILETS,STAIRS,BLACK_ROOM,RAMP,START,ROOM_AREAS,PORTALS,WINDOWS,FURNITURE as F,MAP_BOUNDS} from './layout.js?v=22';
import {prepareSoftwareMaterials,warmRenderer,supportsHardwareAA} from './performance.js?v=22';
import {createBirthdayCake} from './birthday-cake.js?v=22';
import {createBirthdayShow} from './birthday-show.js?v=22';
import {createMemorySofa,createMemoryDoorLeaf} from './memory-furnishings.js?v=22';

export {HOUSE,ROOM_AREAS};

export async function createHomeWorld(canvas, photos, onProgress) {
  const coarse = matchMedia('(pointer:coarse)').matches;
  const bakeMode=new URLSearchParams(window.location.search).has('bake');
  window.HOME_STARTUP?.stage('连接三维显示');
  let renderer;
  try{renderer=new THREE.WebGLRenderer({ canvas, antialias: supportsHardwareAA(), powerPreference: 'high-performance', preserveDrawingBuffer: false });}
  catch(cause){const error=new Error('浏览器无法创建 WebGL 2 画面');error.code='WEBGL_UNAVAILABLE';error.cause=cause;throw error;}
  canvas.addEventListener('webglcontextlost',()=>{const error=new Error('WebGL context lost');error.code='WEBGL_CONTEXT_LOST';window.HOME_STARTUP?.fail(error);});
  let quality = 'detail';
  const debugExtension=renderer.getContext().getExtension('WEBGL_debug_renderer_info');
  const backend=debugExtension?renderer.getContext().getParameter(debugExtension.UNMASKED_RENDERER_WEBGL):'';
  if(window.HOME_STARTUP)window.HOME_STARTUP.state.graphics={renderer:backend,maxTextureSize:renderer.capabilities.maxTextureSize};
  const softwareBackend=/SwiftShader|llvmpipe|software|Basic Render Driver/i.test(backend);
  let adaptiveScale=1,frameAverage=16,slowFrames=0,lastAdaptation=0,stillSharp=false,lastVisualMotion=performance.now();
  const resolution = () => {
    const area=innerWidth*innerHeight;
    if(softwareBackend){if(stillSharp&&quality==='detail')return Math.min(devicePixelRatio,1,Math.sqrt(2100000/area));return Math.min(devicePixelRatio,1,Math.sqrt((quality==='detail'?460800:230400)/area))*adaptiveScale;}
    if(quality==='detail')return Math.max(1,Math.min(devicePixelRatio,2,Math.sqrt((coarse?2100000:4200000)/area))*adaptiveScale);
    return Math.min(devicePixelRatio,1,Math.sqrt(700000/area))*adaptiveScale;
  };
  function applyResolution(){const ratio=resolution();if(Math.abs(renderer.getPixelRatio()-ratio)<.0001)return;renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);}
  renderer.setPixelRatio(resolution());
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bdccd0');
  scene.fog = new THREE.FogExp2('#c3cfcd', .003);
  const camera = new THREE.PerspectiveCamera(coarse ? 66 : 62, innerWidth / innerHeight, .06, 90);
  camera.position.set(...START.position);
  camera.rotation.order = 'YXZ';
  camera.lookAt(...START.lookAt);
  window.HOME_STARTUP?.stage('搬回家里的家具');
  const assets=await loadQualityAssets(renderer,value=>onProgress?.(value*.7));
  scene.environment=assets.environment;
  scene.background=assets.background;scene.backgroundBlurriness=.035;scene.backgroundIntensity=.65;scene.backgroundRotation.y=1.3;
  scene.environmentIntensity=.55;
  const ambient = new THREE.HemisphereLight('#dce7ed', '#77765e', .12);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight('#fff0d4', 3.2);
  sun.position.set(-10, 12, 22);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: .5, far: 55 });
  sun.shadow.bias = -.0004;
  sun.shadow.normalBias = .035;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  window.HOME_STARTUP?.stage('摆好照片和房间陈设');
  const m = await createMaterials(renderer, photos, value=>onProgress?.(.7+value*.25));
  const colliderObjects = [];
  const interactables = [];
  const pickables = [];
  const doorPivots = [];
  const lamps = [];
  const occluders = [];
  const roomLight = new THREE.PointLight('#ffe6bc', 12, 10, 2);
  roomLight.position.set(0, 2.6, 2);
  scene.add(roomLight);
  let doorTarget = 0;
  let doorAmount = 0;
  let gateTarget=0,gateAmount=0,standingHeight=START.position[1]-1.65;
  let birthdayComplete = false,birthdayFocus=null;
  let dirty = true, renderCount = 0, lastShadow = -1;
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 10);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowCtx = shadowCanvas.getContext('2d');
  const gradient = shadowCtx.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, '#0007'); gradient.addColorStop(.5, '#0004'); gradient.addColorStop(1, '#0000');
  shadowCtx.fillStyle = gradient; shadowCtx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: .6 });

  function mesh(geometry, material, x, y, z, parent = scene) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    pickables.push(object);
    return object;
  }
  function box(w, h, d, material, x, y, z, parent = scene, radius = 0) {
    const geometry=radius?new RoundedBoxGeometry(w,h,d,3,Math.min(radius,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d);
    physicalUV(geometry,material,x,y,z);
    return mesh(geometry,material,x,y,z,parent);
  }
  function physicalUV(geometry,material,x=0,y=0,z=0){
    if(![m.wood,m.darkWood,m.door,m.plaster,m.dado,m.ceiling,m.floor].includes(material))return;
    const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
    for(let i=0;i<p.count;i++){const px=p.getX(i)+x,py=p.getY(i)+y,pz=p.getZ(i)+z;
      if(Math.abs(n.getY(i))>.7)uv.setXY(i,px*.5,pz*.5);
      else if(Math.abs(n.getX(i))>.7)uv.setXY(i,pz*.5,py*.5);
      else uv.setXY(i,px*.5,py*.5);
    }
  }
  function structure(w,h,d,material,x,y,z){
    const geometry=new THREE.BoxGeometry(w,h,d);physicalUV(geometry,material,x,y,z);return mesh(geometry,material,x,y,z);
  }
  function cylinder(top, bottom, height, material, x, y, z, parent = scene, segments = 24) {
    return mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material, x, y, z, parent);
  }
  function sphere(rx, ry, rz, material, x, y, z, parent = scene) {
    const object = mesh(sphereGeometry, material, x, y, z, parent); object.scale.set(rx, ry, rz); return object;
  }
  function group(x, y, z, angle = 0) { const object = new THREE.Group(); object.position.set(x, y, z); object.rotation.y = angle; scene.add(object); return object; }
  function collide(object) { colliderObjects.push(object); return object; }
  function physicalBounds(root){const result=new THREE.Box3();root.traverse(o=>{if(!o.isMesh||o.userData.ignorePick||!isVisible(o)||(o.material.transparent&&o.material.opacity<.2))return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();result.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});return result;}
  function interact(object, data) { object.userData.interaction = data; interactables.push(object); return object; }
  function contact(parent, w, d) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), shadowMaterial);
    plane.rotation.x = -Math.PI / 2; plane.position.y = .012; plane.userData.ignorePick = true; parent.add(plane);
  }
  function label(lines, w, h, x, y, z, parent = scene, options) {
    return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: labelTexture(lines, options), toneMapped: false }), x, y, z, parent);
  }
  function solidWall(axis, fixed, from, to, bottom, top) {
    if (to - from < .01 || top - bottom < .01) return;
    function part(low, high, material) {
      if (high - low < .01) return;
      const object = structure(axis === 'x' ? to - from : .2, high - low, axis === 'x' ? .2 : to - from, material,
        axis === 'x' ? (from + to) / 2 : fixed, (low + high) / 2, axis === 'x' ? fixed : (from + to) / 2);
      if (low < 1.8 && high > .25) collide(object);
      occluders.push(object);
    }
    if (bottom < .85) { part(bottom, Math.min(top, .85), m.dado); part(.85, top, m.plaster); }
    else part(bottom, top, m.plaster);
    if (bottom === 0) box(axis === 'x' ? to - from : .23, .08, axis === 'x' ? .23 : to - from, m.darkWood,
      axis === 'x' ? (from + to) / 2 : fixed, .04, axis === 'x' ? fixed : (from + to) / 2);
  }
  function wall(axis, fixed, from, to, openings = []) {
    let cursor = from;
    for (const opening of openings.sort((a, b) => a.center - b.center)) {
      const left = opening.center - opening.width / 2, right = opening.center + opening.width / 2;
      solidWall(axis, fixed, cursor, left, 0, HOUSE.height);
      solidWall(axis, fixed, left, right, 0, opening.bottom || 0);
      solidWall(axis, fixed, left, right, (opening.bottom || 0) + opening.height, HOUSE.height);
      cursor = right;
      if (opening.window) windowFrame(axis, fixed, opening);
      else doorway(axis, fixed, opening);
    }
    solidWall(axis, fixed, cursor, to, 0, HOUSE.height);
  }
  function doorway(axis, fixed, opening) {
    const root = group(axis === 'x' ? opening.center : fixed, 0, axis === 'x' ? fixed : opening.center, axis === 'x' ? 0 : Math.PI / 2);
    const frameMaterial=opening.main?m.memoryPaint:m.darkWood;
    box(.075, opening.height, .26, frameMaterial, -opening.width / 2, opening.height / 2, 0, root);
    box(.075, opening.height, .26, frameMaterial, opening.width / 2, opening.height / 2, 0, root);
    box(opening.width + .1, .1, .26, frameMaterial, 0, opening.height, 0, root);
    if (opening.main) return;
    const leaf = new THREE.Group();
    leaf.position.set(-opening.width / 2 + .03, 0, 0);
    leaf.rotation.y = -Math.PI / 2.05; root.add(leaf);
    const doorLeaf = box(opening.width - .09, opening.height - .08, .055, m.wood, (opening.width - .09) / 2, opening.height / 2, 0, leaf);
    occluders.push(doorLeaf);
    box(opening.width - .24, .08, .07, m.darkWood, opening.width / 2 - .04, .7, .01, leaf);
    box(opening.width - .24, .08, .07, m.darkWood, opening.width / 2 - .04, 1.65, .01, leaf);
  }
  function windowFrame(axis, fixed, opening) {
    const root = group(axis === 'x' ? opening.center : fixed, opening.bottom + opening.height / 2, axis === 'x' ? fixed : opening.center, axis === 'x' ? 0 : Math.PI / 2);
    const w = opening.width, h = opening.height;
    [-w / 2, w / 2].forEach((x) => box(.07, h + .12, .18, m.darkWood, x, 0, 0, root));
    [-h / 2, h / 2].forEach((y) => box(w + .1, .07, .18, m.darkWood, 0, y, 0, root));
    [-w / 6, w / 6].forEach((x) => box(.045, h, .1, m.wood, x, 0, .015, root));
    box(w, .04, .1, m.wood, 0, .05, .015, root);
    const glass = box(w - .1, h - .1, .012, m.glass, 0, 0, 0, root);
    glass.castShadow = false; glass.userData.ignorePick = true;
    box(w + .25, .09, .37, m.plaster, 0, -h / 2 - .04, .04, root);
    const rod = cylinder(.014, .014, w + .5, m.metal, 0, h / 2 + .15, .15, root); rod.rotation.z = Math.PI / 2;
    [-1, 1].forEach((side) => {
      const geometry = new THREE.PlaneGeometry(.52, h + .3, 28, 18);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.cos(positions.getX(i) * 80) * .035);
      geometry.computeVertexNormals();
      const curtain = mesh(geometry, m.linen, side * (w / 2 - .1), -.03, .18, root);
      curtain.castShadow = true; curtain.userData.ignorePick = true;
    });
  }

  // The outer shell and every doorway are real geometry; the player remains at eye height.
  const surroundings=box(45,.14,45,m.concrete,0,RAMP.bottom-.14,2);surroundings.userData.noBake=true;
  // The old house and courtyard stand above the road reached by the south ramp.
  structure(17,.8,14.6,m.concrete,0,-.48,0);
  structure(YARD.right-YARD.left,.8,YARD.front-YARD.rear,m.concrete,(YARD.left+YARD.right)/2,-.46,(YARD.front+YARD.rear)/2);
  structure(17,.14,14.6,m.floor,0,-.07,0);
  structure(YARD.right-YARD.left,.12,YARD.front-YARD.rear,m.concrete,(YARD.left+YARD.right)/2,-.06,(YARD.front+YARD.rear)/2);
  const openings=(axis,fixed)=>[...WINDOWS.filter(w=>w.axis===axis&&w.fixed===fixed).map(w=>({...w,window:true})),...PORTALS.filter(p=>p.axis===axis&&p.fixed===fixed).map(p=>({...p}))];
  wall('x',HOUSE.front,HOUSE.left,HOUSE.right,openings('x',HOUSE.front));
  wall('x',HOUSE.rear,HOUSE.left,HOUSE.right,openings('x',HOUSE.rear));
  wall('z',HOUSE.left,HOUSE.rear,HOUSE.front,openings('z',HOUSE.left));
  wall('z',HOUSE.right,HOUSE.rear,HOUSE.front);
  wall('z',HOUSE.partitionLeft,HOUSE.rear,HOUSE.front,openings('z',HOUSE.partitionLeft));
  wall('z',HOUSE.partitionRight,HOUSE.rear,HOUSE.front,openings('z',HOUSE.partitionRight));
  wall('x',-.1,HOUSE.left,HOUSE.partitionLeft,openings('x',-.1));
  wall('x',-1.2,HOUSE.partitionLeft,HOUSE.partitionRight,openings('x',-1.2));
  wall('x',.2,HOUSE.partitionRight,HOUSE.right);
  const roofSlab=structure(17,.2,14.6,m.ceiling,0,3.25,0);roofSlab.userData.roof=true;occluders.push(roofSlab);
  const roofSurface=structure(17,.025,14.6,m.concrete,0,3.3375,0);roofSurface.userData.roof=true;
  function plainWall(axis,fixed,from,to,height,bottom=0){if(to-from<.01)return;const o=box(axis==='x'?to-from:.18,height,axis==='x'?.18:to-from,m.plaster,axis==='x'?(from+to)/2:fixed,bottom+height/2,axis==='x'?fixed:(from+to)/2);if(bottom>=STAIRS.height)o.userData.roof=true;collide(o);occluders.push(o);return o;}
  // Flat roof reached by the confirmed outdoor stairs, without an invented upper floor.
  plainWall('x',HOUSE.rear,HOUSE.left,HOUSE.right,.65,STAIRS.height);
  plainWall('x',HOUSE.front,HOUSE.left,HOUSE.right,.65,STAIRS.height);
  plainWall('z',HOUSE.right,HOUSE.rear,HOUSE.front,.65,STAIRS.height);
  plainWall('z',HOUSE.left,HOUSE.rear,STAIRS.landing[2],.65,STAIRS.height);
  plainWall('z',HOUSE.left,STAIRS.landing[3],HOUSE.front,.65,STAIRS.height);
  const gate=YARD.gate;
  plainWall('x',YARD.front,TOILETS.at(-1).right,gate.center-gate.width/2,YARD.wallHeight);
  plainWall('x',YARD.front,gate.center+gate.width/2,YARD.right,YARD.wallHeight);
  plainWall('z',YARD.left,STAIRS.landing[2],BLACK_ROOM.rear,YARD.wallHeight);
  plainWall('z',YARD.left,BLACK_ROOM.front,YARD.toilet.rear,YARD.wallHeight);
  plainWall('x',STAIRS.landing[2],YARD.left,HOUSE.left,YARD.wallHeight);
  plainWall('z',YARD.right,YARD.rear,YARD.front,YARD.wallHeight);
  const gateRoot=group(gate.center,0,gate.fixed),gatePivot=new THREE.Group();gateRoot.name='south-yard-gate';gatePivot.position.x=-gate.width/2;gatePivot.userData.dynamic=true;gateRoot.add(gatePivot);
  [-1,1].forEach(side=>collide(box(.16,2.28,.24,m.plaster,side*(gate.width/2+.06),1.14,0,gateRoot)));
  box(gate.width+.3,.12,.26,m.plaster,0,2.25,0,gateRoot);
  box(gate.width-.08,gate.height,.065,m.door,(gate.width-.08)/2,gate.height/2,0,gatePivot);
  for(const y of [.15,.95,1.85])box(gate.width-.16,.07,.09,m.darkWood,(gate.width-.08)/2,y,.025,gatePivot);
  const gateHandle=mesh(new THREE.TorusGeometry(.045,.009,8,20),m.brass,gate.width-.2,1.0,.07,gatePivot);
  interact(gatePivot,{id:'yard-gate',kind:'gate',title:'院门',description:'推开院门，进院子看看'});
  // One sloped mesh and the walking surface use the same endpoints.
  const rampGeometry=new THREE.BoxGeometry(RAMP.right-RAMP.left,1,RAMP.front-RAMP.rear),rampPositions=rampGeometry.attributes.position;
  for(let i=0;i<rampPositions.count;i++){const t=(rampPositions.getZ(i)+(RAMP.front-RAMP.rear)/2)/(RAMP.front-RAMP.rear);rampPositions.setY(i,rampPositions.getY(i)>0?THREE.MathUtils.lerp(RAMP.top,RAMP.bottom,t):RAMP.bottom-.08);}
  rampGeometry.computeVertexNormals();const ramp=mesh(rampGeometry,m.concrete,(RAMP.left+RAMP.right)/2,0,(RAMP.rear+RAMP.front)/2);ramp.name='south-entry-ramp';
  // A real ground-level room beneath the upper stair flight, entered from the bedroom.
  const black=BLACK_ROOM;
  structure(black.right-black.left,.12,black.front-black.rear,m.floor,(black.left+black.right)/2,-.06,(black.rear+black.front)/2);
  plainWall('z',black.left,black.rear,black.front,black.height);
  plainWall('x',black.rear,black.left,black.right,black.height);
  plainWall('x',black.front,black.left,black.right,black.height);
  const blackCeiling=structure(black.right-black.left,.08,black.front-black.rear,m.ceiling,(black.left+black.right)/2,black.height+.04,(black.rear+black.front)/2);blackCeiling.name='black-room-ceiling';occluders.push(blackCeiling);
  // Exterior west stair, rising northwards, then landing east onto the roof.
  const tread=(STAIRS.front-STAIRS.rear)/STAIRS.steps;
  for(let i=0;i<STAIRS.steps;i++){const h=(i+1)*STAIRS.height/STAIRS.steps,z=STAIRS.front-(i+.5)*tread,overRoom=z-tread/2<black.front;
    // Thin upper treads keep the space below usable; the lower flight has a solid base.
    const thickness=overRoom?Math.min(.14,h-black.height-.09):h;
    box(STAIRS.right-STAIRS.left,thickness,tread,m.concrete,(STAIRS.left+STAIRS.right)/2,h-thickness/2,z);
    if(overRoom)box(STAIRS.right-STAIRS.left,STAIRS.height/STAIRS.steps+.025,.045,m.concrete,(STAIRS.left+STAIRS.right)/2,h-STAIRS.height/STAIRS.steps/2-.03,z+tread/2-.0225);
  }
  const [ll,lr,ln,ls]=STAIRS.landing;box(lr-ll,.16,ls-ln,m.concrete,(ll+lr)/2,STAIRS.height-.08,(ln+ls)/2);
  const railA=new THREE.Vector3(STAIRS.left-.04,.9,STAIRS.front),railB=new THREE.Vector3(STAIRS.left-.04,STAIRS.height+.9,STAIRS.rear),railDelta=railB.clone().sub(railA);
  const rail=mesh(new THREE.CylinderGeometry(.025,.025,railDelta.length(),10),m.metal,0,0,0);rail.position.copy(railA).add(railB).multiplyScalar(.5);rail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),railDelta.normalize());
  for(let i=0;i<=5;i++){const t=i/5;const z=THREE.MathUtils.lerp(STAIRS.front,STAIRS.rear,t),y=t*STAIRS.height;box(.035,.9,.035,m.metal,STAIRS.left-.04,y+.45,z);}
  for(const [toiletIndex,toilet] of TOILETS.entries()){
  if(!toiletIndex)plainWall('z',toilet.left,toilet.rear,toilet.front,2.35);plainWall('z',toilet.right,toilet.rear,toilet.front,2.35);plainWall('x',toilet.front,toilet.left,toilet.right,2.35);
  const toiletDoorX=(toilet.left+toilet.right)/2;
  plainWall('x',toilet.rear,toilet.left,toiletDoorX-.4,2.35);plainWall('x',toilet.rear,toiletDoorX+.4,toilet.right,2.35);plainWall('x',toilet.rear,toiletDoorX-.4,toiletDoorX+.4,.3,2.05);
  doorway('x',toilet.rear,{center:toiletDoorX,width:.8,height:2.05});
  const roofLeft=toilet.left-(toiletIndex===0?.08:0),roofRight=toilet.right+(toiletIndex===TOILETS.length-1?.08:0);
  const toiletRoof=box(roofRight-roofLeft,.14,toilet.front-toilet.rear+.16,m.concrete,(roofLeft+roofRight)/2,2.42,(toilet.rear+toilet.front)/2);occluders.push(toiletRoof);
  box(.52,.065,.76,m.enamel,toiletDoorX,.035,toilet.front-.65,scene,.06);
  const panHole=mesh(new THREE.CircleGeometry(1,28),m.dark,toiletDoorX,.071,toilet.front-.65);panHole.rotation.x=-Math.PI/2;panHole.scale.set(.11,.24,1);
  for(const side of [-1,1])box(.105,.018,.4,m.ceramic,toiletDoorX+side*.18,.079,toilet.front-.65,scene,.015);
  toiletRoof.name='toilet-roof-'+toiletIndex;
  }

  const doorRoot = group(ENTRY.x, 0, ENTRY.z);
  [-1, 1].forEach((side) => {
    const leafWidth=(ENTRY.width-.088)/2,pivot = new THREE.Group(); pivot.position.x = side * (ENTRY.width/2-.04); doorRoot.add(pivot);
    createMemoryDoorLeaf({pivot,side,width:leafWidth,materials:m});
    doorPivots.push({ pivot, side });
  });
  interact(doorRoot, { id: 'door', kind: 'door', title: '家门', description: '点一下，推开家门' });
  label(['回 家'], .55, .24, ENTRY.x, 2.79, HOUSE.front+.115, scene, { background: '#bdb49d', color: '#4b5546' });
  scene.traverse(object=>{if(object.isMesh)object.userData.architecture=true;});

  function chair(x, z, angle = 0) {
    return placeModel('chinese_armchair',[.58,1.08,.57],x,z,angle);
  }
  function placeModel(id,dimensions,x,z,angle=0){const root=new THREE.Group();root.add(assets.model(id,dimensions));root.name=id;root.position.set(x,0,z);root.rotation.y=angle;scene.add(root);collide(root);return root;}
  function table(x, z, w, d, height = .78, angle = 0) {
    const root = group(x, 0, z, angle);
    box(w, .075, d, m.wood, 0, height, 0, root, .025);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(.085, height - .02, .085, m.darkWood, sx * (w / 2 - .1), height / 2 - .02, sz * (d / 2 - .1), root);
    box(w - .08, .1, .05, m.darkWood, 0, height - .1, d / 2 - .08, root);
    contact(root, w * 1.35, d * 1.35); collide(root); return root;
  }
  function cabinet(x, z, w, h, d, angle = 0) {
    const root = group(x, 0, z, angle);
    box(w, h, d, m.wood, 0, h / 2 + .08, 0, root, .018);
    box(w + .06, .065, d + .04, m.darkWood, 0, h + .12, 0, root, .012);
    for (const side of [-1, 1]) {
      box(w / 2 - .06, h - .15, .03, m.darkWood, side * w / 4, h / 2 + .08, d / 2 + .012, root);
      box(w / 2 - .13, h - .23, .035, m.wood, side * w / 4, h / 2 + .08, d / 2 + .033, root);
      sphere(.018, .018, .025, m.brass, side * .065, h / 2 + .13, d / 2 + .07, root);
    }
    contact(root, w * 1.2, d * 1.5); collide(root); return root;
  }
  function cup(x, y, z, parent = scene) {
    const root = new THREE.Group(); root.position.set(x, y, z); parent.add(root);
    cylinder(.045, .035, .085, m.ceramic, 0, .045, 0, root, 16);
    const handle = mesh(new THREE.TorusGeometry(.026, .006, 5, 12), m.ceramic, .045, .05, 0, root); handle.rotation.y = Math.PI / 2;
    cylinder(.038, .038, .002, m.darkWood, 0, .089, 0, root, 16); return root;
  }
  function pot(x, z, scale = 1) {
    return placeModel(x<0?'potted_plant_01':'potted_plant_02',.72*scale,x,z,(x+z)*.35);
  }
  function photoFrame(index, width, x, y, z, angle = 0, parent = scene) {
    const texture = m.photoTextures[index];
    const height = width * texture.image.height / texture.image.width;
    const root = new THREE.Group(); root.position.set(x, y, z); root.rotation.y = angle; parent.add(root);
    box(width + .16, height + .16, .055, m.darkWood, 0, 0, 0, root, .008);
    box(width + .09, height + .09, .015, m.paper, 0, 0, .035, root);
    const photoMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: .85 });
    mesh(new THREE.PlaneGeometry(width, height), photoMaterial, 0, 0, .047, root);
    interact(root, { id: 'photo-' + index, kind: 'photo', index, title: photos[index].caption, description: '点开相框，看看原来的照片' });
    return root;
  }
  function bed(x, z, angle = 0) {
    const root = group(x, 0, z, angle);
    root.name='bed';
    box(1.65, .24, 2.15, m.darkWood, 0, .28, 0, root, .035);
    box(1.58, .22, 2.05, m.paleLinen, 0, .48, 0, root, .08);
    box(1.67, .9, .1, m.wood, 0, .64, -1.03, root, .045);
    box(1.48, .07, .1, m.darkWood, 0, 1.02, -1.03, root);
    const blanket=new THREE.PlaneGeometry(1.88,1.85,52,48);blanket.rotateX(-Math.PI/2);
    const cloth=blanket.attributes.position;
    for(let i=0;i<cloth.count;i++){
      const x=cloth.getX(i),z=cloth.getZ(i),edge=Math.max(0,Math.abs(x)-.76);
      cloth.setY(i,-edge*2.4-Math.max(0,z-.78)*1.9+.012*Math.sin(x*37+z*6)+.006*Math.sin(z*51-x*9));
    }
    blanket.computeVertexNormals();mesh(blanket,m.quilt,0,.65,.24,root);
    [-.4, .4].forEach((x) => box(.65, .16, .4, m.paleLinen, x, .66, -.67, root, .065));
    const folded=box(1.6,.075,.26,m.paleLinen,0,.72,.63,root,.035);
    contact(root, 2.4, 2.8); collide(root); return root;
  }
  function pendant(x, z) {
    cylinder(.006, .006, .3, m.dark, x, 3.01, z, scene, 8);
    const shade = cylinder(.12, .27, .14, m.enamel, x, 2.81, z);
    shade.material = m.enamel;
    sphere(.07, .045, .07, new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: '#ffdaa0', emissiveIntensity: 1.4 }), x, 2.74, z);
    lamps.push(new THREE.Vector3(x, 2.6, z));
  }
  function teapot(x, y, z, parent = scene) {
    const root=new THREE.Group();root.position.set(x,y,z);parent.add(root);parent=root;x=y=z=0;
    sphere(.09, .07, .08, m.enamel, x, y + .08, z, parent);
    cylinder(.055, .055, .015, m.enamel, x, y + .15, z, parent, 16);
    sphere(.015, .015, .015, m.dark, x, y + .17, z, parent);
    const spout = cylinder(.017, .025, .12, m.enamel, x + .09, y + .1, z, parent, 10); spout.rotation.z = -Math.PI / 3;
    const handle = mesh(new THREE.TorusGeometry(.066, .009, 7, 20, Math.PI * 1.5), m.dark, x - .065, y + .08, z, parent); handle.rotation.z = -.8;
    return root;
  }

  function memorySofa(p){const root=createMemorySofa(p.size,m);root.position.set(p.x,0,p.z);root.rotation.y=p.angle;scene.add(root);collide(root);return root;}
  const livingSofas=F.livingSofas.map(memorySofa);const sofa=livingSofas[0];
  livingSofas.forEach((o,i)=>{o.name='living-sofa-'+i;});
  const cornerPorcelain=placeModel('antique_ceramic_vase_01',F.porcelain.size,F.porcelain.x,F.porcelain.z,F.porcelain.angle);cornerPorcelain.name='living-corner-porcelain';contact(cornerPorcelain,.65,.65);
  const coffee = placeModel('chinese_tea_table',F.livingTea.size,F.livingTea.x,F.livingTea.z);coffee.name='living-tea-table';
  const teaCups=[cup(-.2,.53,-.3,coffee),cup(.2,.53,.35,coffee)];const teaPot=teapot(.15,.53,-.35,coffee);
  const dish = cylinder(.19, .15, .025, m.ceramic, -.05, .54, .05, coffee);
  for (let i = 0; i < 4; i++) sphere(.055, .05, .055, new THREE.MeshStandardMaterial({ color: '#c8943f', roughness: .5 }), Math.sin(i * 2) * .09, .6, Math.cos(i * 2) * .09, coffee);
  const tvStand = placeModel('chinese_console_table',F.livingTV.size,F.livingTV.x,F.livingTV.z,F.livingTV.angle);tvStand.name='living-tv-cabinet';
  const tv = assets.model('television_02',[1.08,.9,.68]); tv.position.set(0,.68,.06);tvStand.add(tv);
  interact(tv, { id: 'tv', kind: 'photo', index: 1, title: '电视里的旧照片', description: '打开这张照片，看看沙发上的那一刻' });
  photoFrame(0, 1.55, -5.8, 1.88, .025);
  const livingPlant=pot(F.plant.x,F.plant.z,1.05);
  label(['2026 · 十一月', '13', '星期五'], .46, .67, -7.35, 1.8, .025, scene, { color: '#a94836', background: '#ede7d7', width: 512, height: 768 });

  // The main hall and its birthday table.
  const birthdayTable = table(F.birthday.x,F.birthday.z,F.birthday.w,F.birthday.d,.77);birthdayTable.name='birthday-table';
  const runnerGeometry=new THREE.PlaneGeometry(.76,1.22,12,28);runnerGeometry.rotateX(-Math.PI/2);const runnerPositions=runnerGeometry.attributes.position;for(let i=0;i<runnerPositions.count;i++){const z=runnerPositions.getZ(i),overhang=Math.max(0,Math.abs(z)-.42);runnerPositions.setY(i,-overhang*overhang*2.5+Math.sin(runnerPositions.getX(i)*38)*.0006);}runnerGeometry.computeVertexNormals();mesh(runnerGeometry,m.paleLinen,0,.815,0,birthdayTable);
  const cake=createBirthdayCake(interact,{animateFlames:!softwareBackend,fineMaterials:!softwareBackend}),cakeRoot=cake.root;cakeRoot.position.set(-.18,.815,.03);birthdayTable.add(cakeRoot);
  const birthdayLight=new THREE.PointLight('#ffe0b0',3.2,2.6,2);birthdayLight.position.set(F.birthday.x+.32,1.9,F.birthday.z+.52);birthdayLight.visible=false;scene.add(birthdayLight);
  interact(cakeRoot, { id: 'cake', kind: 'birthday', title: '给爸爸的生日蛋糕', description: '来许个愿，一起过生日' });
  const envelope = box(.34, .008, .23, m.paper, .45, .817, .1, birthdayTable);
  interact(envelope, { id: 'letter', kind: 'letter', title: '写给爸爸的一封信', description: '拆开，慢慢读' });
  const hallSofas=F.hallSofas.map(memorySofa);hallSofas.forEach((o,i)=>{o.name='hall-sofa-'+i;});
  const hallCabinet = placeModel('chinese_console_table',F.hallTV.size,F.hallTV.x,F.hallTV.z,F.hallTV.angle);hallCabinet.name='hall-tv-cabinet';
  const hallTV=assets.model('television_02',[.8,.67,.5]);hallTV.position.set(-.35,.97,0);hallCabinet.add(hallTV);interact(hallTV,{id:'hall-tv',kind:'photo',index:0,title:'大堂电视柜里的照片',description:'看看家里留下的照片'});
  label(['爸，生日快乐。', '2026.11.13'], 1.1, .29, -.55, 2.15, -1.075, scene, { color: '#6d7154', background: '#ded6bd' });

  // Confirmed headings: north bedroom headboard south; southeast headboard west.
  const nwBed=bed(F.northwestBed.x,F.northwestBed.z,F.northwestBed.angle);nwBed.name='northwest-bed';
  const nwWardrobe=placeModel('chinese_cabinet',[1.5,2.1,.55],F.northwestWardrobe.x,F.northwestWardrobe.z,F.northwestWardrobe.angle);nwWardrobe.name='northwest-wardrobe';
  const nightstand = cabinet(-3.3,-2.3,.5,.58,.4);
  photoFrame(3, .45, 0, .86, .01, 0, nightstand);
  const northBed=bed(F.northBed.x,F.northBed.z,F.northBed.angle);northBed.name='north-bedroom-bed';
  const northWardrobe=placeModel('chinese_cabinet',[1.6,2.1,.55],F.northWardrobe.x,F.northWardrobe.z,F.northWardrobe.angle);northWardrobe.name='north-bedroom-wardrobe';
  const desk = table(F.northwestDesk.x,F.northwestDesk.z,1.9,.75,.76,F.northwestDesk.angle);desk.name='northwest-computer-desk';
  const northwestChair=chair(F.northwestDesk.x+1.0,F.northwestDesk.z,F.northwestDesk.angle+Math.PI);northwestChair.name='northwest-desk-chair';
  function desktop(parent,id,index){
    const root=new THREE.Group();root.name=id;parent.add(root);
    const monitor=assets.model('television_02',[.62,.5,.4]);monitor.position.set(0,.81,-.12);root.add(monitor);
    box(.2,.045,.18,m.dark,0,.795,-.12,root,.018);
    box(.25,.57,.43,m.enamel,.64,.315,-.05,root,.025);
    box(.18,.035,.012,m.dark,.64,.48,.173,root);cylinder(.012,.012,.006,m.green,.70,.40,.181,root,12).rotation.x=Math.PI/2;
    box(.48,.025,.17,m.enamel,0,.813,.18,root,.01);
    for(let row=0;row<4;row++)for(let col=0;col<12;col++)box(.029,.008,.026,m.paper,-.205+col*.037,.83,.125+row*.035,root,.002);
    sphere(.035,.018,.052,m.dark,.38,.825,.18,root);
    const texture=m.photoTextures[index],aspect=texture.image.width/texture.image.height,w=Math.min(.47,.27*aspect);
    mesh(new THREE.PlaneGeometry(.5,.294),new THREE.MeshBasicMaterial({color:'#101a16'}),0,1.093,.083,root);
    mesh(new THREE.PlaneGeometry(w,w/aspect),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),0,1.093,.086,root);
    interact(root,{id,kind:'photo',index,title:'电脑桌里的旧照片',description:'打开完整的原照片'});return root;
  }
  desktop(desk,'northwest-computer',2);
  photoFrame(2, .32, .55, 1.15, -.1, -.16, desk);
  for (let i = 0; i < 6; i++) {
    const bookMaterial = [m.green, m.red, m.paper][i % 3];
    const book = box(.045, .24 + (i % 3) * .025, .17, bookMaterial, -.58 + i * .055, .94, -.12, desk);
    book.rotation.z = i < 2 ? -.12 : 0;
  }
  cylinder(.12, .12, .025, m.green, -.65, .815, .12, desk);
  const lampStem = cylinder(.012, .012, .28, m.brass, -.65, .96, .12, desk, 8);
  const lamp = sphere(.17, .08, .11, m.green, -.65, 1.12, .12, desk);
  const lampLight = new THREE.PointLight('#ffdfab', 1.8, 1.8, 2); lampLight.position.set(-.65, 1.08, .20); desk.add(lampLight);
  const southeastBed=bed(F.southeastBed.x,F.southeastBed.z,F.southeastBed.angle);southeastBed.name='southeast-bed';
  const otherTable = table(F.southeastDesk.x,F.southeastDesk.z,1.9,.75,.76,F.southeastDesk.angle);otherTable.name='southeast-computer-desk';
  const southeastChair=chair(F.southeastDesk.x,F.southeastDesk.z-1.0,Math.PI);southeastChair.name='southeast-desk-chair';desktop(otherTable,'southeast-computer',0);
  const album = box(.38, .045, .29, m.darkWood, -.62, .83, .03, otherTable, .012);
  const cover = mesh(new THREE.PlaneGeometry(.3,.225),new THREE.MeshBasicMaterial({map:m.photoTextures[0]}),-.62,.856,.03,otherTable);
  cover.rotation.x=-Math.PI/2;
  interact(album,{id:'family-album',kind:'album',title:'家里的旧相册',description:'翻翻家里的旧照片'});
  interact(cover,{id:'album-cover',kind:'album',title:'家里的旧相册',description:'翻翻家里的旧照片'});
  const notebook = box(.28,.025,.36,m.paper,-.1,.817,.1,desk);
  interact(notebook,{id:'memory-book',kind:'memory',title:'还记得的老家',description:'留下一件你记得的小事'});
  const radio = new THREE.Group();radio.position.set(.72,1.11,0);hallCabinet.add(radio);
  box(.34,.22,.13,m.darkWood,0,0,0,radio,.02);
  box(.19,.13,.01,m.dark,-.05,.015,.075,radio);
  for(let k=0;k<8;k++)box(.002,.115,.015,m.brass,-.12+k*.02,.015,.083,radio);
  const dial=cylinder(.025,.025,.025,m.brass,.1,.015,.085,radio,14);dial.rotation.x=Math.PI/2;
  interact(radio,{id:'radio',kind:'music',title:'柜子上的收音机',description:'点一下播放收音机，再点暂停'});
  const vase=assets.model('antique_ceramic_vase_01',[.18,.31,.18]);vase.position.set(-1.0,.97,0);hallCabinet.add(vase);
  // A few human-scale details finish the rooms without changing the supplied layout.
  label(['给爸爸'],.21,.105,.45,.826,.1,birthdayTable,{width:512,height:256,color:'#755a42'});
  const mat=box(1.6,.018,.62,m.linen,ENTRY.x,.012,HOUSE.front+.55);
  const welcomeMat=label(['欢迎回家'],1.25,.35,ENTRY.x,.027,HOUSE.front+.55,scene,{width:768,height:256,color:'#615943',background:'#b8aa83'});welcomeMat.rotation.x=-Math.PI/2;
  // Wall-floor contact shading is static, avoiding a second full-screen scene pass.
  const edgeCanvas=document.createElement('canvas');edgeCanvas.width=64;edgeCanvas.height=32;
  const edgeCtx=edgeCanvas.getContext('2d'),edgeGradient=edgeCtx.createLinearGradient(0,0,0,32);
  edgeGradient.addColorStop(0,'#0000');edgeGradient.addColorStop(1,'#0005');edgeCtx.fillStyle=edgeGradient;edgeCtx.fillRect(0,0,64,32);
  const edgeTexture=new THREE.CanvasTexture(edgeCanvas);
  const edgeMaterial=new THREE.MeshBasicMaterial({map:edgeTexture,transparent:true,depthWrite:false,opacity:.32,side:THREE.DoubleSide});
  for(const room of ROOM_AREAS){const [l,r,b,f]=room.bounds;
    for(const [x,z,w,d] of [[(l+r)/2,b+.13,r-l,.26],[(l+r)/2,f-.13,r-l,.26],[l+.13,(b+f)/2,.26,f-b],[r-.13,(b+f)/2,.26,f-b]]){
      const shade=new THREE.Mesh(new THREE.PlaneGeometry(w,d),edgeMaterial);shade.rotation.x=-Math.PI/2;shade.position.set(x,.006,z);shade.userData.ignorePick=true;scene.add(shade);
    }
  }

  // Kitchen: tiled splashback, stove, metal pot, sink, cupboards, bowls.
  const counter = cabinet(F.kitchenCounter.x,F.kitchenCounter.z,4.85,.72,.8,F.kitchenCounter.angle);counter.name='east-kitchen-counter';
  for (let x = -2.35; x < 2.4; x += .3) for (let y = .95; y < 1.5; y += .2) box(.294,.194,.025,m.ceramic,x,y,-.43,counter);
  box(4.95, .05, .87, m.ceramic, 0, .89, 0, counter);
  box(.95, .025, .6, m.dark, -1.2, .94, .01, counter);
  for (const x of [-1.43, -.97]) {
    const ring = mesh(new THREE.TorusGeometry(.14, .015, 8, 24), m.black, x, .96, .02, counter); ring.rotation.x = Math.PI / 2;
    for (let k = 0; k < 4; k++) { const bar = box(.3, .02, .02, m.metal, x, .965, .02, counter); bar.rotation.y = k * Math.PI / 2; }
  }
  cylinder(.19, .15, .2, m.metal, -1.42, 1.085, .02, counter);
  cylinder(.21, .2, .025, m.metal, -1.42, 1.2, .02, counter);
  sphere(.035, .025, .035, m.dark, -1.42, 1.24, .02, counter);
  for (const side of [-1, 1]) box(.09, .03, .045, m.dark, -1.42 + side * .22, 1.1, .02, counter, .01);
  box(.78, .03, .53, m.metal, 1.45, .93, .01, counter);
  box(.61, .025, .38, m.dark, 1.45, .95, .01, counter, .055);
  box(.56, .025, .33, m.metal, 1.45, .952, .01, counter, .045);
  const faucet = mesh(new THREE.TorusGeometry(.09, .012, 8, 24, Math.PI), m.metal, 1.45, 1.12, -.2, counter);
  faucet.rotation.y = Math.PI / 2;
  cylinder(.013, .013, .15, m.metal, 1.45, 1.03, -.29, counter, 8);
  for (let i = 0; i < 4; i++) cylinder(.1, .065, .035, m.ceramic, .2, .97 + i * .03, -.06, counter, 20);
  const chopping = box(.38, .015, .3, m.wood, -.35, .944, .02, counter, .04);
  interact(chopping, { id: 'kitchen-note', kind: 'kitchen', title: '下一次一起吃的饭', description: '记下一道想和家人一起吃的菜' });
  const pendantPositions=[[0,2.2],[-5.4,3.7],[-5.5,-3.8],[0,-4.2],[5.5,-3.5],[5.6,3.6]];
  pendantPositions.forEach(([x,z])=>pendant(x,z));

  // Modest exterior context, kept secondary to the remembered house.
  const grass = new THREE.MeshStandardMaterial({ color: '#737d52', roughness: 1 });
  box(6, .08, 22, grass, -13, RAMP.bottom-.04, 0);
  box(6, .08, 22, grass, 13, RAMP.bottom-.04, 0);
  const activities=createHomeActivities({scene,camera,materials:m,interact,sofa,teapot:teaPot,cups:teaCups,plant:livingPlant,tv,tvStand,desk,lamp,lampLight});
  scene.updateMatrixWorld(true);
  const layoutEvidence=scene.children.filter(o=>o.name).map(o=>{const bounds=physicalBounds(o);return{name:o.name,position:o.position.toArray(),rotationY:o.rotation.y,bounds:[bounds.min.toArray(),bounds.max.toArray()],head:o.name.endsWith('-bed')?o.localToWorld(new THREE.Vector3(0,0,-1.03)).toArray():null};});
  interactables.filter(object=>object.isGroup&&object.userData.interaction.kind!=='door').forEach(batchLocalRoot);
  doorPivots.forEach(({pivot})=>batchLocalRoot(pivot));
  scene.updateMatrixWorld(true);
  const colliders = colliderObjects.map(physicalBounds);
  const wallBounds = occluders.map((object) => new THREE.Box3().setFromObject(object));
  const interactiveMeshes=[];
  scene.traverse(object=>{if(!object.isMesh)return;let parent=object;while(parent&&!parent.userData.interaction)parent=parent.parent;if(parent)interactiveMeshes.push(object);});
  const interactionPoints=interactables.map(object=>({object,data:object.userData.interaction,center:new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3())}));
  const pickGroups=interactables.map(object=>({object,data:object.userData.interaction,bounds:new THREE.Box3().setFromObject(object),proxy:object.userData.interaction.action==='sit'||object.userData.interaction.action==='water'||['tv','hall-tv'].includes(object.userData.interaction.id),meshes:interactiveMeshes.filter(mesh=>{let p=mesh;while(p&&!p.userData.interaction)p=p.parent;return p===object;})}));
  const objectCenter=new THREE.Vector3();
  scene.traverse(object=>{if(!object.isMesh||object.userData.architecture)return;object.getWorldPosition(objectCenter);object.userData.room=ROOM_AREAS.find(room=>objectCenter.x>room.bounds[0]&&objectCenter.x<room.bounds[1]&&objectCenter.z>room.bounds[2]&&objectCenter.z<room.bounds[3])?.id||'outside';});
  const batches=batchStaticScene(scene);
  let lighting={precomputed:false,type:'PBR + HDR environment'};
  if(!bakeMode){
    window.HOME_STARTUP?.stage('点亮老家的房间');
    lighting=await applyLightmaps(scene);
    if(!softwareBackend)cake.refine();
    sun.intensity=0;ambient.intensity=.05;roomLight.intensity=0;lampLight.intensity=0;
    scene.remove(sun,sun.target,roomLight);
    renderer.shadowMap.enabled=false;
  }
  finishSurfaceMaterials(scene);
  const softwareMaterials=!bakeMode&&softwareBackend?prepareSoftwareMaterials(scene,lampLight):null;
  const wishShow=!bakeMode?createBirthdayShow({scene,camera,renderer,photoTextures:m.photoTextures,photos,software:softwareBackend}):null;
  window.HOME_STARTUP?.stage('准备画面和生日演出');
  let warmup=null;if(!bakeMode)warmup=await warmRenderer(renderer,scene,camera,value=>onProgress?.(.96+value*.035),lampLight,birthdayLight);
  if(wishShow){await wishShow.warmup();warmup.programs=renderer.info.programs.length;}
  const playerRadius = .22;
  function inside(x,z,bounds,margin=0){return x>=bounds[0]+margin-1e-6&&x<=bounds[1]-margin+1e-6&&z>=bounds[2]+margin-1e-6&&z<=bounds[3]-margin+1e-6;}
  function surfaceHeight(x,z,fromHeight=standingHeight){
    // Being under the stairs and being on them are distinct walking layers.
    if(fromHeight<.5&&inside(x,z,[BLACK_ROOM.left,BLACK_ROOM.right,BLACK_ROOM.rear,BLACK_ROOM.front]))return 0;
    if(inside(x,z,[STAIRS.left,STAIRS.right,STAIRS.rear,STAIRS.front]))return Math.min(STAIRS.height,Math.ceil((STAIRS.front-z)/(STAIRS.front-STAIRS.rear)*STAIRS.steps)*STAIRS.height/STAIRS.steps);
    if(inside(x,z,STAIRS.landing))return STAIRS.height;
    if(fromHeight>3&&inside(x,z,[HOUSE.left,HOUSE.right,HOUSE.rear,HOUSE.front]))return STAIRS.height;
    if(inside(x,z,[RAMP.left,RAMP.right,RAMP.rear,RAMP.front]))return THREE.MathUtils.lerp(RAMP.top,RAMP.bottom,(z-RAMP.rear)/(RAMP.front-RAMP.rear));
    return 0;
  }
  function isWalkable(x, z,{fromHeight=standingHeight,ignoreDoors=false,radius=playerRadius}={}) {
    const withinHouse=inside(x,z,[HOUSE.left,HOUSE.right,HOUSE.rear,HOUSE.front]);
    const withinYard=inside(x,z,[YARD.left,YARD.right,YARD.rear,YARD.front]);
    const stairAlley=inside(x,z,[YARD.left,HOUSE.left,STAIRS.landing[2],YARD.front]);
    const gateApproach=inside(x,z,[RAMP.left,RAMP.right,RAMP.rear,RAMP.front]);
    if(!withinHouse&&!withinYard&&!stairAlley&&!gateApproach)return false;
    const nextHeight=surfaceHeight(x,z,fromHeight);
    if(nextHeight-fromHeight>.25||fromHeight-nextHeight>.3)return false;
    if(!ignoreDoors&&fromHeight<.3&&doorAmount<.78&&Math.abs(x-ENTRY.x)<ENTRY.width/2+radius&&Math.abs(z-ENTRY.z)<.14+radius)return false;
    if(!ignoreDoors&&fromHeight<.3&&gateAmount<.78&&Math.abs(z-YARD.gate.fixed)<.14+radius&&Math.abs(x-YARD.gate.center)<YARD.gate.width/2+radius)return false;
    for (const bounds of colliders) {
      if (bounds.min.y > nextHeight+1.9 || bounds.max.y < nextHeight+.08) continue;
      if (x > bounds.min.x - radius && x < bounds.max.x + radius && z > bounds.min.z - radius && z < bounds.max.z + radius) return false;
    }
    return true;
  }
  function move(dx, dz) {
    if(Math.abs(dx)+Math.abs(dz)<.000001)return;
    if(Math.hypot(dx,dz)>.00001&&activities.seated)activities.stand();
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .07));
    for (let step = 0; step < count; step++) {
      const x = camera.position.x + dx / count, z = camera.position.z + dz / count;
      if (isWalkable(x, camera.position.z)) camera.position.x = x;
      if (isWalkable(camera.position.x, z)) camera.position.z = z;
      standingHeight=surfaceHeight(camera.position.x,camera.position.z);
    }
  }
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hitPoint=new THREE.Vector3(),projection=new THREE.Vector3();
  const boxHit=new THREE.Vector3(),pickHits=[];
  function wallDistance(ray,maximum){let nearest=maximum;for(const bounds of wallBounds){const hit=ray.intersectBox(bounds,hitPoint);if(hit)nearest=Math.min(nearest,camera.position.distanceTo(hit));}return nearest;}
  function pick(clientX = innerWidth / 2, clientY = innerHeight / 2) {
    scene.updateMatrixWorld(true);camera.updateMatrixWorld();
    const bounds = canvas.getBoundingClientRect();
    pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    raycaster.far = 4.8;
    const maximum=wallDistance(raycaster.ray,4.8);
    let nearest=maximum+.03,selected=null;
    for(const entry of pickGroups){
      if(entry.data.disabled||!isVisible(entry.object))continue;
      if(entry.object.userData.dynamic||entry.data.kind==='door'||entry.data.kind==='gate')entry.bounds.setFromObject(entry.object);
      if(!raycaster.ray.intersectBox(entry.bounds,boxHit))continue;
      const broadDistance=entry.bounds.containsPoint(camera.position)?0:camera.position.distanceTo(boxHit);
      if(broadDistance>nearest)continue;
      if(entry.proxy||(entry.data.kind==='door'&&doorAmount<.78)){nearest=broadDistance;selected=entry.data;continue;}
      pickHits.length=0;raycaster.intersectObjects(entry.meshes,false,pickHits);
      const hit=pickHits.find(hit=>!hit.object.userData.ignorePick&&isVisible(hit.object));
      if(hit&&hit.distance<nearest){nearest=hit.distance;selected=entry.data;}
    }
    return selected;
  }
  function location() {
    const x = camera.position.x, z = camera.position.z;
    if(standingHeight>3&&inside(x,z,[HOUSE.left,HOUSE.right,HOUSE.rear,HOUSE.front]))return{id:'roof',name:'屋顶平台',note:'从西侧室外楼梯上来。沿原路可以回到院子。'};
    if(standingHeight>.05&&(inside(x,z,[STAIRS.left,STAIRS.right,STAIRS.rear,STAIRS.front])||inside(x,z,STAIRS.landing)))return{id:'stairs',name:'室外楼梯',note:'楼梯在房子西南侧，通向房顶。'};
    const toiletIndex=TOILETS.findIndex(t=>inside(x,z,[t.left,t.right,t.rear,t.front]));if(toiletIndex>=0)return{id:'toilet-'+toiletIndex,name:toiletIndex?'新增厕所':'原厕所',note:'院子西南角，两间厕所的门朝北。'};
    if(z>YARD.front)return{id:'outside',name:'院门外的坡',note:'沿坡向北上行，就是院门。'};
    return ROOM_AREAS.find((room) => x > room.bounds[0] && x < room.bounds[1] && z > room.bounds[2] && z < room.bounds[3])
      || { id: 'outside', name:'院子', note:'院门在南墙东端；正门在北边，楼梯和两间厕所在西侧。' };
  }
  const previousCamera=new Array(7).fill(NaN);
  const visibilityMeshes=[];scene.traverse(object=>{if(object.isMesh&&!object.userData.architecture&&object.userData.room)visibilityMeshes.push(object);});
  const viewFrustum=new THREE.Frustum(),viewMatrix=new THREE.Matrix4();
  const portalConnections=PORTALS.map(p=>({...p}));
  for(const window of WINDOWS){const x=window.center,z=window.fixed+(window.fixed<0?.2:-.2),room=ROOM_AREAS.find(room=>inside(x,z,room.bounds));if(room)portalConnections.push({...window,a:'outside',b:room.id});}
  const aperture=portalConnections.map(p=>{const x=p.axis==='x'?p.center:p.fixed,z=p.axis==='x'?p.fixed:p.center;return{...p,box:new THREE.Box3(new THREE.Vector3(x-(p.axis==='x'?p.width/2:.15),(p.bottom||0)+.05,z-(p.axis==='z'?p.width/2:.15)),new THREE.Vector3(x+(p.axis==='x'?p.width/2:.15),(p.bottom||0)+p.height,z+(p.axis==='z'?p.width/2:.15)))};});
  const aperturePoint=new THREE.Vector3();for(const p of aperture){p.corners=[];for(const a of[-1,1])for(const b of[0,1])p.corners.push(new THREE.Vector3(p.axis==='x'?p.center+a*p.width/2:p.fixed,(p.bottom||0)+(b?p.height:.05),p.axis==='z'?p.center+a*p.width/2:p.fixed));}
  let visibilityKey='';
  function isVisible(object){for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;}
  function updateVisibility(){
    camera.updateMatrixWorld();viewMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);viewFrustum.setFromProjectionMatrix(viewMatrix);
    // The new front door has open upper grilles even while the lower panels
    // block walking. Keep the hall visible through that actual opening.
    for(const p of aperture){if(p.main){const low=doorAmount<.15?1.53:.05;p.box.min.y=low;p.corners.forEach((corner,i)=>{corner.y=i%2?p.height:low;});}p.rect=null;if(!viewFrustum.intersectsBox(p.box))continue;let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;for(const corner of p.corners){aperturePoint.copy(corner).applyMatrix4(camera.matrixWorldInverse);if(aperturePoint.z>-.08){left=bottom=-1;right=top=1;break;}aperturePoint.copy(corner).project(camera);left=Math.min(left,aperturePoint.x);right=Math.max(right,aperturePoint.x);bottom=Math.min(bottom,aperturePoint.y);top=Math.max(top,aperturePoint.y);}p.rect=[left,right,bottom,top];}
    const current=location().id,visible=new Set([current]),queue=[{room:current,clip:[-1,1,-1,1],path:[current]}];
    for(let i=0;i<queue.length;i++)for(const p of aperture){const state=queue[i];if(!p.rect)continue;const next=p.a===state.room?p.b:p.b===state.room?p.a:null;if(!next||next==='outside'||state.path.includes(next))continue;if(state.room==='outside'&&(p.fixed<0?camera.position.z>p.fixed:camera.position.z<p.fixed))continue;const clip=[Math.max(state.clip[0],p.rect[0]),Math.min(state.clip[1],p.rect[1]),Math.max(state.clip[2],p.rect[2]),Math.min(state.clip[3],p.rect[3])];if(clip[0]>clip[1]+.01||clip[2]>clip[3]+.01)continue;visible.add(next);queue.push({room:next,clip,path:[...state.path,next]});}
    visible.add('outside');
    const key=[...visible].sort().join(',');if(key===visibilityKey)return;visibilityKey=key;
    visibilityMeshes.forEach(object=>{if(!object.userData.managedVisibility)object.visible=visible.has(object.userData.room)&&!object.userData.extinguished;});
  }
  function cameraChanged(){const values=[camera.position.x,camera.position.y,camera.position.z,camera.quaternion.x,camera.quaternion.y,camera.quaternion.z,camera.quaternion.w];return values.some((v,i)=>Math.abs(v-previousCamera[i])>.00001||Number.isNaN(previousCamera[i]));}
  let lastDraw=0;
  function birthdayFraming(){const portrait=innerWidth<760||innerWidth/innerHeight<1.15;camera.setViewOffset(innerWidth,innerHeight,portrait?0:innerWidth*.16,portrait?innerHeight*.1:0,innerWidth,innerHeight);camera.updateProjectionMatrix();}
  function beginBirthday(){
    if(birthdayFocus)return;const target=cakeRoot.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.25,0)),portrait=innerWidth<760||innerWidth/innerHeight<1.15;
    const position=target.clone().add(portrait?new THREE.Vector3(.72,.72,1.62):new THREE.Vector3(.7,.48,1.15));const look=camera.clone(false);look.position.copy(position);look.lookAt(target);
    birthdayFocus={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov,view:camera.view?{...camera.view}:null,start:camera.position.clone(),startQ:camera.quaternion.clone(),target:position,targetQ:look.quaternion.clone(),center:target,radius:Math.hypot(position.x-target.x,position.z-target.z),angle:Math.atan2(position.x-target.x,position.z-target.z),height:position.y-target.y,t:0};
    camera.fov=portrait?48:43;birthdayFraming();birthdayLight.visible=true;cake.setActive(true);dirty=true;
  }
  function endBirthday(){wishShow?.stop();if(!birthdayFocus)return;camera.position.copy(birthdayFocus.position);camera.quaternion.copy(birthdayFocus.quaternion);camera.fov=birthdayFocus.fov;if(birthdayFocus.view?.enabled){const v=birthdayFocus.view;camera.setViewOffset(v.fullWidth,v.fullHeight,v.offsetX,v.offsetY,v.width,v.height);}else camera.clearViewOffset();camera.updateProjectionMatrix();birthdayFocus=null;birthdayLight.visible=false;cake.setActive(false);dirty=true;}
  function draw(force=true){const now=performance.now();if(!force&&now-lastDraw<15.5)return;updateVisibility();softwareMaterials?.update();renderer.render(scene,camera);lastDraw=now;previousCamera.splice(0,7,camera.position.x,camera.position.y,camera.position.z,camera.quaternion.x,camera.quaternion.y,camera.quaternion.z,camera.quaternion.w);dirty=false;renderCount++;}
  return {
    scene, camera, renderer, colliders, interactables, isWalkable, move, pick, location,activities,
    isGroundWalkable(x,z,{ignoreDoors=false,margin=0}={}){const height=surfaceHeight(x,z,0);return height<=.01&&isWalkable(x,z,{fromHeight:height,ignoreDoors,radius:playerRadius+margin});},
    layout:{HOUSE,ENTRY,YARD,TOILETS,STAIRS,BLACK_ROOM,RAMP,START,ROOM_AREAS,PORTALS,WINDOWS,FURNITURE:F,MAP_BOUNDS},
    layoutEvidence,
    bakeLights:{pendants:pendantPositions,windows:WINDOWS},
    get elevation(){return standingHeight;},
    get birthdayTarget(){return cakeRoot.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.25,0));},
    beginBirthday,endBirthday,
    setBirthdayPaused(value){if(birthdayFocus)cake.setActive(!value);wishShow?.setPaused(value);},
    startBirthdayShow(options){if(!birthdayFocus)return;wishShow?.start(options);dirty=true;},
    skipBirthdayShow(){wishShow?.skip();dirty=true;},
    setBirthdayShowSound(value){return wishShow?.setSound(value)??false;},
    toggleBirthdayShowPause(){return wishShow?.togglePause()??false;},
    tapBirthdayShow(x,y){const result=wishShow?.tap(x,y);dirty=true;return result;},
    birthdayShowPhotoAt(x,y){return wishShow?.hitPhoto(x,y)??null;},
    beginBirthdayCharge(){return wishShow?.beginCharge()??false;},
    releaseBirthdayCharge(){wishShow?.releaseCharge();dirty=true;},
    cancelBirthdayCharge(){wishShow?.cancelCharge();dirty=true;},
    saluteBirthday(){wishShow?.salute(1);dirty=true;},
    get birthdayShowState(){return wishShow?.state;},
    orbitBirthday(dx,dy){if(!birthdayFocus)return;const f=birthdayFocus;f.t=1;f.angle-=dx*.005;f.height=THREE.MathUtils.clamp(f.height+dy*.003,.22,1.08);camera.position.set(f.center.x+Math.sin(f.angle)*f.radius,f.center.y+f.height,f.center.z+Math.cos(f.angle)*f.radius);camera.lookAt(f.center);dirty=true;},
    captureBirthdayFrame(){
      const view=camera.view?{...camera.view}:null,previousRatio=renderer.getPixelRatio(),width=innerWidth,height=innerHeight,desired=width/height>1000/900?900/height:1000/width,captureRatio=Math.min(Math.max(1,desired),Math.sqrt(2600000/(width*height)));
      try{camera.clearViewOffset();renderer.setPixelRatio(captureRatio);renderer.setSize(width,height,false);draw();const shot=document.createElement('canvas');shot.width=canvas.width;shot.height=canvas.height;shot.getContext('2d').drawImage(canvas,0,0);return shot;}
      finally{if(view?.enabled)camera.setViewOffset(view.fullWidth,view.fullHeight,view.offsetX,view.offsetY,view.width,view.height);else camera.clearViewOffset();renderer.setPixelRatio(previousRatio);renderer.setSize(width,height,false);draw();}
    },
    get birthdayState(){return{focused:!!birthdayFocus,lit:cake.litCount,complete:birthdayComplete};},
    resetPosition(){activities.stand();standingHeight=START.position[1]-1.65;camera.position.set(...START.position);camera.lookAt(...START.lookAt);gateTarget=1;dirty=true;},
    positionOnGround(x,z){const height=surfaceHeight(x,z,0);if(height>.01||!isWalkable(x,z,{fromHeight:height,ignoreDoors:true}))return false;activities.stand();standingHeight=height;camera.position.set(x,height+1.65,z);dirty=true;return true;},
    performActivity(action){const changed=activities.perform(action);if(changed)dirty=true;return changed;},
    openDoor() { doorTarget = 1; dirty=true; },
    toggleDoor() { if (Math.abs(camera.position.z - ENTRY.z) < .5&&Math.abs(camera.position.x-ENTRY.x)<ENTRY.width/2+.2) return; doorTarget = doorTarget ? 0 : 1; dirty=true; },
    openGate(){gateTarget=1;dirty=true;},
    toggleGate(){if(Math.abs(camera.position.z-YARD.gate.fixed)<.5&&Math.abs(camera.position.x-YARD.gate.center)<YARD.gate.width/2+.2)return;gateTarget=gateTarget?0:1;dirty=true;},
    get gateOpen(){return gateAmount>.78;},
    get doorOpen() { return doorAmount > .78; },
    finishBirthday() { birthdayComplete=true;for(let i=0;i<3;i++)cake.extinguish(i);dirty=true; },
    lightBirthday(){cake.light();dirty=true;},
    extinguish(index){cake.extinguish(index);dirty=true;},
    relightBirthday() { wishShow?.stop();birthdayComplete=false;cake.reset();dirty=true; },
    resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();if(birthdayFocus){birthdayFraming();const f=birthdayFocus,portrait=innerWidth<760||innerWidth/innerHeight<1.15;f.radius=portrait?Math.hypot(.72,1.62):Math.hypot(.7,1.15);f.height=portrait?.72:.48;f.t=1;camera.fov=portrait?48:43;camera.position.set(f.center.x+Math.sin(f.angle)*f.radius,f.center.y+f.height,f.center.z+Math.cos(f.angle)*f.radius);camera.lookAt(f.center);if(wishShow?.state.running)camera.clearViewOffset();camera.updateProjectionMatrix();}wishShow?.resize();renderer.setPixelRatio(resolution()); renderer.setSize(innerWidth, innerHeight, false);dirty=true; },
    setQuality(value){quality=value==='detail'?'detail':'smooth';adaptiveScale=1;stillSharp=false;lastVisualMotion=performance.now();frameAverage=16;slowFrames=0;applyResolution();dirty=true;},
    get quality(){return quality;},
    get inMotion(){return cameraChanged();},
    get stats(){return{batches,lighting,warmup,renderCount,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio(),quality,adaptiveScale,backend,software:softwareBackend,softwareMaterials:softwareMaterials?.materials||0,renderPhase:softwareBackend?(stillSharp?'still':'motion'):'hardware',buffer:[canvas.width,canvas.height],visibleRooms:visibilityKey};},
    observeFrame(ms,moving){
      if(!moving||ms>2000||ms<1||document.hidden)return;
      frameAverage=frameAverage*.85+ms*.15;
      slowFrames=frameAverage>38?slowFrames+1:Math.max(0,slowFrames-1);
      const now=performance.now(),minimum=softwareBackend?.85:.8;
      if(slowFrames>8&&adaptiveScale>minimum&&now-lastAdaptation>900){adaptiveScale=Math.max(minimum,adaptiveScale*.9);applyResolution();dirty=true;slowFrames=0;lastAdaptation=now;}
    },
    requestRender(){dirty=true;},
    nearby(){
      camera.updateMatrixWorld();
      return interactionPoints.filter(item=>item.data.kind!=='door'&&item.data.kind!=='candle'&&!item.data.disabled&&isVisible(item.object)).map(item=>{
        if(item.object.userData.dynamic)new THREE.Box3().setFromObject(item.object).getCenter(item.center);
        const distance=camera.position.distanceTo(item.center);
        if(distance>3.3)return null;
        const direction=item.center.clone().sub(camera.position).normalize(),ray=new THREE.Ray(camera.position,direction);
        if(wallDistance(ray,distance)<distance-.12)return null;
        projection.copy(item.center).project(camera);
        if(projection.z<0||projection.z>1||Math.abs(projection.x)>.88||Math.abs(projection.y)>.75)return null;
        return{data:item.data,x:(projection.x+1)*.5,y:(1-projection.y)*.5,distance};
      }).filter(Boolean).sort((a,b)=>a.distance-b.distance).filter((item,index,all)=>{
        const key=d=>d.kind==='photo'?'photo:'+d.index:d.kind==='activity'?'activity:'+d.action:d.id;
        return all.findIndex(v=>key(v.data)===key(item.data))===index;
      }).slice(0,3);
    },
    render:draw,
    tick(delta, elapsed) {
      const activityChanged=activities.tick(delta);if(activityChanged)dirty=true;
      const cakeChanged=cake.tick(delta,elapsed),showChanged=wishShow?.tick(delta);if(cakeChanged||showChanged)dirty=true;
      if(birthdayFocus&&birthdayFocus.t<1){birthdayFocus.t=Math.min(1,birthdayFocus.t+delta/(matchMedia('(prefers-reduced-motion: reduce)').matches?.01:.9));const t=1-Math.pow(1-birthdayFocus.t,3);camera.position.lerpVectors(birthdayFocus.start,birthdayFocus.target,t);camera.quaternion.slerpQuaternions(birthdayFocus.startQ,birthdayFocus.targetQ,t);dirty=true;}
      if(!birthdayFocus&&!activities.seated&&Math.abs(camera.position.y-(standingHeight+1.65))>.001){camera.position.y=THREE.MathUtils.damp(camera.position.y,standingHeight+1.65,18,delta);dirty=true;}
      const beforeDoor = doorAmount;
      doorAmount = THREE.MathUtils.damp(doorAmount, doorTarget, 5, delta);
      const changingDoor=Math.abs(beforeDoor-doorAmount)>.0001;
      if (changingDoor&&elapsed-lastShadow>.12){renderer.shadowMap.needsUpdate=true;lastShadow=elapsed;}
      doorPivots.forEach(({ pivot, side }) => { pivot.rotation.y = side * doorAmount * 1.58; });
      const beforeGate=gateAmount;gateAmount=THREE.MathUtils.damp(gateAmount,gateTarget,5,delta);gatePivot.rotation.y=gateAmount*1.53;
      if(softwareBackend&&quality==='detail'){
        const now=performance.now(),moving=activityChanged||cakeChanged||showChanged||changingDoor||Math.abs(beforeGate-gateAmount)>.0001||cameraChanged();
        if(moving){lastVisualMotion=now;if(stillSharp){stillSharp=false;applyResolution();dirty=true;}}
        else if(!stillSharp&&now-lastVisualMotion>650){stillSharp=true;applyResolution();dirty=true;}
      }
      if(dirty||changingDoor||Math.abs(beforeGate-gateAmount)>.0001||cameraChanged())draw(false);
    },
    dispose() { wishShow?.dispose();renderer.dispose(); }
  };
}
