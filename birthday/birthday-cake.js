import * as THREE from './vendor/three.module.js';

// All pastry details are geometry and tiny local canvas textures. No model,
// image CDN, second WebGL renderer, or fullscreen postprocessing is required.
export function createBirthdayCake(interact,options={}){
  const root=new THREE.Group();root.name='birthday-cake';
  const standard=p=>new THREE.MeshStandardMaterial(p);
  const cream=options.fineMaterials?new THREE.MeshPhysicalMaterial({color:'#fff0d8',roughness:.72,clearcoat:.06,clearcoatRoughness:.65,sheen:.18,sheenColor:'#fff2de',sheenRoughness:.85}):standard({color:'#fff0d8',roughness:.78});
  const butter=standard({color:'#f4dfb6',roughness:.86});
  const ceramic=standard({color:'#e7ded0',roughness:.25,metalness:.04});
  const gold=standard({color:'#b99754',roughness:.3,metalness:.7});
  const chocolate=standard({color:'#33201a',roughness:.38});
  const leaf=standard({color:'#587354',roughness:.72,side:THREE.DoubleSide});
  let seed=97231;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function texture(size,draw,height=size){const canvas=document.createElement('canvas');canvas.width=size;canvas.height=height;draw(canvas.getContext('2d'),size,height);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;}
  const grain=texture(128,(c,s)=>{c.fillStyle='#bdbdbd';c.fillRect(0,0,s,s);for(let i=0;i<4500;i++){c.fillStyle=random()>.5?'#ffffff23':'#00000016';c.fillRect(random()*s,random()*s,1,1);}});grain.colorSpace=THREE.NoColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(3,1);
  cream.bumpMap=grain;cream.bumpScale=.0007;
  const berryMap=texture(512,(c,s)=>{const g=c.createLinearGradient(0,0,s,s);g.addColorStop(0,'#ec5753');g.addColorStop(.55,'#ba222c');g.addColorStop(1,'#721d25');c.fillStyle=g;c.fillRect(0,0,s,s);for(let i=0;i<11000;i++){c.fillStyle=random()>.5?'#ffaf8730':'#4c051a20';c.fillRect(random()*s,random()*s,2,2);}for(let row=0;row<10;row++)for(let col=0;col<8;col++){const x=(col+.5+(row%2)*.42)*s/8,y=(row+.5)*s/10;c.save();c.translate(x,y);c.rotate((random()-.5)*.4);c.fillStyle='#651923';c.beginPath();c.ellipse(0,2,4.2,7.2,0,0,Math.PI*2);c.fill();c.fillStyle='#f2bd72';c.beginPath();c.ellipse(-.7,-.7,2.1,4.5,0,0,Math.PI*2);c.fill();c.restore();}});
  const berryMaterial=options.fineMaterials?new THREE.MeshPhysicalMaterial({color:'#ffffff',map:berryMap,roughness:.30,clearcoat:.24,clearcoatRoughness:.28}):standard({color:'#ffffff',map:berryMap,roughness:.3});
  const blueberry=standard({color:'#28354e',roughness:.62});
  function mesh(g,m,parent=root,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  const lathe=(points,segments=64)=>new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),segments);
  const ring=(radius,tube,y,material=cream)=>{const o=mesh(new THREE.TorusGeometry(radius,tube,8,72),material,root,0,y,0);o.rotation.x=Math.PI/2;return o;};
  mesh(lathe([[0,.002],[.315,.002],[.342,.008],[.35,.018],[.343,.028],[.315,.032],[0,.032]]),ceramic);
  ring(.342,.0025,.026,gold);ring(.317,.0014,.033,gold);
  mesh(lathe([[0,.035],[.258,.035],[.282,.046],[.288,.065],[.288,.222],[.282,.246],[.26,.253],[0,.253]]),cream);
  ring(.284,.008,.05,butter);ring(.278,.007,.245);
  function rosette(){const vertices=[],uv=[],indices=[],steps=18,sides=24;
    for(let i=0;i<=steps;i++){const t=i/steps,r=.028*Math.sin(Math.PI*Math.pow(t,.43)),twist=t*.95;
      for(let j=0;j<=sides;j++){const u=j/sides*Math.PI*2,rr=r*(1+.16*Math.cos(u*6));vertices.push(Math.cos(u+twist)*rr+.006*t*t,.047*t,Math.sin(u+twist)*rr);uv.push(j/sides,t);if(i<steps&&j<sides){const n=i*(sides+1)+j;indices.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}}
    }const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  const piping=rosette();for(let i=0;i<18;i++){const a=i*Math.PI*2/18;const o=mesh(piping,cream,root,Math.cos(a)*.241,.247,Math.sin(a)*.241);o.rotation.y=-a;}
  const berryGeometry=lathe([[0,0],[.024,0],[.035,.014],[.033,.04],[.025,.067],[.012,.088],[0,.098]],24);
  for(let i=0;i<6;i++){const a=i*Math.PI*2/6+.22,berry=new THREE.Group();berry.position.set(Math.cos(a)*.167,.255,Math.sin(a)*.167);berry.rotation.set(.16*Math.cos(a),a,.16*Math.sin(a));berry.scale.setScalar(.93+(i%3)*.06);root.add(berry);mesh(berryGeometry,berryMaterial,berry);
    for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(.013,.011,.028,0);shape.quadraticCurveTo(.013,-.011,0,0);const o=mesh(new THREE.ShapeGeometry(shape,6),leaf,berry,0,.004,0);o.rotation.set(-Math.PI/2,0,angle);}
    const blue=mesh(new THREE.SphereGeometry(.014,16,10),blueberry,root,Math.cos(a+.25)*.125,.267,Math.sin(a+.25)*.125);blue.scale.y=.82;
    const crown=mesh(new THREE.TorusGeometry(.004,.0013,5,12),blueberry,root,blue.position.x,.279,blue.position.z);crown.rotation.x=Math.PI/2;
  }
  const plaque=new THREE.Group();plaque.position.set(.01,.292,-.092);plaque.rotation.set(-.12,0,-.06);root.add(plaque);
  const outline=new THREE.Shape();outline.moveTo(-.087,-.027);outline.quadraticCurveTo(-.09,-.035,-.08,-.037);outline.lineTo(.08,-.037);outline.quadraticCurveTo(.09,-.035,.087,-.027);outline.lineTo(.078,.032);outline.quadraticCurveTo(0,.047,-.078,.032);outline.closePath();
  mesh(new THREE.ExtrudeGeometry(outline,{depth:.004,bevelEnabled:true,bevelThickness:.001,bevelSize:.001,bevelSegments:2,steps:1,curveSegments:16}),chocolate,plaque);
  const writing=texture(768,(c,w,h)=>{c.clearRect(0,0,w,h);c.textAlign='center';c.textBaseline='middle';c.fillStyle='#e3c58d';c.font='96px "STKaiti","KaiTi","SimSun",serif';c.fillText('爸，生日快乐',w/2,h/2,w-44);},256);
  mesh(new THREE.PlaneGeometry(.166,.066),new THREE.MeshBasicMaterial({map:writing,transparent:true,toneMapped:false,depthWrite:false}),plaque,0,0,.006);
  const candles=[],flames=[],lit=[false,false,false],smokeTimes=[-99,-99,-99];
  const flameGeometry=lathe([[0,-.012],[.008,-.009],[.011,.003],[.009,.019],[.003,.034],[0,.048]],12);
  const flameMap=texture(32,(c,w,h)=>{const g=c.createLinearGradient(0,h,0,0);g.addColorStop(0,'#6d9adf');g.addColorStop(.19,'#fff7db');g.addColorStop(.46,'#ffe6a0');g.addColorStop(.78,'#fcb54c');g.addColorStop(1,'#e78629');c.fillStyle=g;c.fillRect(0,0,w,h);},128);
  const glowMap=texture(64,(c,s)=>{const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'#ffe8a9aa');g.addColorStop(.25,'#ffc35c55');g.addColorStop(1,'#ffae0000');c.fillStyle=g;c.fillRect(0,0,s,s);});
  for(let i=0;i<3;i++){
    const candle=new THREE.Group();candle.position.set((i-1)*.075,.261,i===1?-.02:.027);root.add(candle);candles.push(candle);const h=i===1?.159:.132;
    const wax=standard({color:['#cfb885','#e8d7b5','#b5b99b'][i],roughness:.52});mesh(new THREE.CylinderGeometry(.006,.0065,h,16),wax,candle,0,h/2,0);mesh(new THREE.CylinderGeometry(.001,.001,.013,6),chocolate,candle,0,h+.004,0);
    for(const y of[.025,.055,.085]){const ribbon=mesh(new THREE.TorusGeometry(.0065,.0008,5,16),gold,candle,0,y,0);ribbon.rotation.x=Math.PI/2;}
    const flame=mesh(flameGeometry,new THREE.MeshBasicMaterial({map:flameMap,toneMapped:false,transparent:true,opacity:.88,depthWrite:false}),candle,.001,h+.016,0);flame.userData.dynamic=true;flame.userData.managedVisibility=true;flame.userData.extinguished=true;flame.visible=false;
    const core=mesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshBasicMaterial({color:'#fff3c6',toneMapped:false}),flame,0,.005,.003);core.scale.set(.004,.016,.004);core.userData.dynamic=true;core.userData.managedVisibility=true;
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));glow.scale.set(.095,.13,1);glow.position.y=.012;flame.add(glow);flames.push(flame);
    interact(candle,{id:'candle-'+i,kind:'candle',index:i,title:'第'+(i+1)+'支蜡烛',description:'为爸爸点亮烛光，留一个心愿'});
  }
  const smokeGeometry=new THREE.BufferGeometry(),smokePositions=new Float32Array(3*7*3);smokeGeometry.setAttribute('position',new THREE.BufferAttribute(smokePositions,3));
  const smokeMaterial=new THREE.PointsMaterial({color:'#d7ccba',size:.012,transparent:true,opacity:.2,depthWrite:false,map:glowMap,alphaTest:.01});const smoke=new THREE.Points(smokeGeometry,smokeMaterial);smoke.visible=false;smoke.frustumCulled=false;root.add(smoke);
  const count=matchMedia('(pointer:coarse)').matches?28:48,confettiPositions=new Float32Array(count*3),colors=new Float32Array(count*3),confettiSeeds=[];
  const palette=['#bd854c','#e1d4b2','#88967b','#bd705a'];for(let i=0;i<count;i++){new THREE.Color(palette[i%palette.length]).toArray(colors,i*3);confettiSeeds.push([random()*Math.PI*2,.25+random()*.5,.3+random()*.6]);}
  const confettiGeometry=new THREE.BufferGeometry();confettiGeometry.setAttribute('position',new THREE.BufferAttribute(confettiPositions,3));confettiGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));const confettiMaterial=new THREE.PointsMaterial({vertexColors:true,size:.013,transparent:true,opacity:.85,depthWrite:false,map:glowMap,alphaTest:.05});const confetti=new THREE.Points(confettiGeometry,confettiMaterial);confetti.visible=false;confetti.frustumCulled=false;root.add(confetti);
  let active=false,time=0,lastTick=-1,celebration=-99;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,animateFlames=options.animateFlames!==false;
  function extinguish(i){if(!lit[i])return false;lit[i]=false;flames[i].visible=false;flames[i].userData.extinguished=true;smokeTimes[i]=reduced?-99:time;return true;}
  // Added after the static atlas is applied, so decorative flakes never shift
  // the baked mesh IDs. A single mesh shares the existing gold material.
  let refined=false;
  function refine(){if(refined)return;refined=true;const vertices=[];
    for(let i=0;i<28;i++){const a=i*2.399963,r=.105+random()*.108,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Array.from({length:6},(_,j)=>j*Math.PI/3+.22).some(b=>Math.hypot(x-Math.cos(b)*.167,z-Math.sin(b)*.167)<.044))continue;const s=.002+random()*.0023,y=.255+random()*.001;vertices.push(x-s,y,z-s*.4,x+s*.2,y+.0009,z+s,x+s,y+.0004,z);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();const flakes=mesh(geometry,gold);flakes.name='cake-gold-leaf';flakes.userData.room='hall';
  }
  return{root,flames,refine,get litCount(){return lit.filter(Boolean).length;},setActive(value){active=value;},light(){for(let i=0;i<3;i++){lit[i]=true;flames[i].visible=true;flames[i].userData.extinguished=false;}},reset(){for(let i=0;i<3;i++){lit[i]=false;flames[i].visible=false;flames[i].userData.extinguished=true;smokeTimes[i]=-99;}celebration=-99;confetti.visible=false;smoke.visible=false;},extinguish,celebrate(){if(!reduced)celebration=time;},
    tick(delta,elapsed){time=elapsed;const hasSmoke=smokeTimes.some(t=>time-t<1.5),hasConfetti=time-celebration<3.4;if(!(active&&!reduced&&animateFlames&&lit.some(Boolean))&&!hasSmoke&&!hasConfetti){const changed=smoke.visible||confetti.visible;smoke.visible=confetti.visible=false;return changed;}if(elapsed-lastTick<1/30)return false;lastTick=elapsed;
      if(active&&animateFlames)flames.forEach((o,i)=>{if(lit[i]){o.scale.set(1+Math.sin(time*9+i)*.06,1+Math.sin(time*7.3+i*2)*.11,1);o.rotation.z=Math.sin(time*5.3+i)*.08;}});
      smoke.visible=hasSmoke;if(hasSmoke){for(let i=0;i<3;i++)for(let j=0;j<7;j++){const t=time-smokeTimes[i]-j*.045,k=(i*7+j)*3;smokePositions[k]=candles[i].position.x+Math.sin(t*7+j)*.008;smokePositions[k+1]=t>=0&&t<1.5?.43+t*.055:-10;smokePositions[k+2]=candles[i].position.z+Math.cos(t*4+j)*.006;}smokeGeometry.attributes.position.needsUpdate=true;}
      confetti.visible=hasConfetti;if(hasConfetti){const t=time-celebration;for(let i=0;i<count;i++){const[a,s,h]=confettiSeeds[i],k=i*3;confettiPositions[k]=Math.cos(a)*(.12+t*s*.25)+Math.sin(t*3+i)*.018;confettiPositions[k+1]=.3+h*t-.2*t*t;confettiPositions[k+2]=Math.sin(a)*(.12+t*s*.25);}confettiGeometry.attributes.position.needsUpdate=true;confettiMaterial.opacity=Math.max(0,.85*(1-t/3.4));}
      return true;
    }
  };
}
