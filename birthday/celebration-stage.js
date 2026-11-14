import * as THREE from './vendor/three.module.js';

// Analytic, finite stage effects. Attribute buffers are allocated once; only
// time and framing uniforms change during playback. This uses the home renderer.
export function createCelebrationStage({root,renderer,software,coarse,reduced}){
  const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  const shared={uTime:{value:0},uHalf:{value:new THREE.Vector2(1,1)},uOffset:{value:new THREE.Vector2(0,0)},uPower:{value:1},uPixel:{value:1},uFade:{value:0},uCrown:{value:0},uCharge:{value:0},uClearWidth:{value:.48}};
  const geometries=[],materials=[],objects=[];let seed=95137;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const add=(object,order)=>{object.frustumCulled=false;object.renderOrder=order;object.layers.set(1);root.add(object);objects.push(object);return object;};
  const colours=['#ffe4a8','#fff4da','#dea195','#96d1c5','#e4b67b'].map(c=>new THREE.Color(c));

  const ribbonGeometry=new THREE.BufferGeometry(),along=[],across=[],positions=[],indices=[];
  const segments=software?96:180;
  for(let i=0;i<=segments;i++)for(let side=0;side<2;side++){along.push(i/segments);across.push(side*2-1);positions.push(0,0,0);if(i<segments&&side===0){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
  ribbonGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));ribbonGeometry.setAttribute('aAlong',new THREE.Float32BufferAttribute(along,1));ribbonGeometry.setAttribute('aSide',new THREE.Float32BufferAttribute(across,1));ribbonGeometry.setIndex(indices);geometries.push(ribbonGeometry);
  const ribbonVertex=`
    attribute float aAlong; attribute float aSide;
    uniform float uTime,uPhase,uCrown; uniform vec2 uHalf;
    varying float vAlong,vSide;
    void main(){
      float a=aAlong*8.168+uPhase+uTime*.20;
      float r=.26+sin(aAlong*3.14159)*.67;
      vec2 helix=vec2(cos(a)*r,(aAlong-.5)*1.52);
      vec2 crown=vec2(cos(a)*.80,sin(a)*.46+.045);
      vec2 tangent=vec2(-sin(a)*r*8.168+cos(a)*cos(aAlong*3.14159)*2.105,1.52);
      vec2 normal=normalize(vec2(-tangent.y,tangent.x));
      float width=mix(.018+.052*sin(aAlong*3.14159),.009,uCrown);
      vec2 xy=mix(helix,crown,uCrown)+normal*aSide*width;
      vec3 p=vec3(xy*uHalf,-3.65+sin(a)*.48);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      vAlong=aAlong;vSide=aSide;
    }`;
  const ribbonFragment=`
    uniform vec3 uColour; uniform float uTime,uStrength,uFade;
    varying float vAlong,vSide;
    void main(){
      float edge=pow(max(0.,1.-abs(vSide)),1.8);
      float silk=.55+.45*pow(sin(vSide*19.+vAlong*55.-uTime*.4),2.);
      float core=exp(-vSide*vSide*65.);
      float ends=sin(vAlong*3.14159);
      vec3 colour=mix(uColour,vec3(1.,.91,.69),core*.7);
      gl_FragColor=vec4(colour,(edge*silk*.28+core*.35)*ends*uStrength*uFade);
      #include <colorspace_fragment>
    }`;
  const ribbons=[];
  for(let i=0;i<(software?1:3);i++){
    const material=new THREE.ShaderMaterial({uniforms:{...shared,uPhase:{value:i*2.094},uColour:{value:colours[[0,2,3][i]]},uStrength:{value:0}},vertexShader:ribbonVertex,fragmentShader:ribbonFragment,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});materials.push(material);ribbons.push(add(new THREE.Mesh(ribbonGeometry,material),900.4));
  }

  const fireVertex=`
    attribute vec3 aOrigin,aDirection,aColour;
    attribute float aLaunch,aTail,aSpeed,aSeed,aKind;
    uniform float uTime,uPixel,uScale,uFade,uPower,uClearWidth; uniform vec2 uHalf,uOffset;
    varying vec3 vColour; varying float vAlpha;
    void main(){
      float age=uTime-aLaunch-aTail;
      float a=max(age,0.);
      float travel=(1.-exp(-a*1.65))*.88*aSpeed*uPower;
      vec3 p=aOrigin+vec3(aDirection.xy*travel,aDirection.z*travel*.45);
      p.y-=.135*a*a;
      float life=1.-smoothstep(1.1,2.25,a);
      float sparkle=.70+.30*sin(a*29.+aSeed*80.);
      vAlpha=step(0.,age)*smoothstep(0.,.055,a)*life*sparkle*(1.-aTail*.9)*uFade;
      if(aKind>3.5){
        float f=clamp((uTime-aLaunch+.48-aTail)/.48,0.,1.);
        p=aOrigin;p.y-=(1.-f)*1.65;p.x+=sin(f*4.+aSeed)*.02;
        vAlpha=step(aLaunch-.48+aTail,uTime)*(1.-step(aLaunch+.03,uTime))*f*uFade;
      }
      p.xy+=uOffset;
      // Leave a quieter centre for the birthday words and the charge control.
      vAlpha*=1.-.65*exp(-pow(p.x/uClearWidth,6.)-pow((p.y-.06)/.34,6.));
      p.xy*=uHalf;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      gl_PointSize=clamp((2.0+aSeed*2.)*uPixel*uScale*3./(-p.z),1.,32.);
      vColour=aColour;
    }`;
  const fireFragment=`
    varying vec3 vColour; varying float vAlpha;
    void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.||vAlpha<.002)discard;
      float light=exp(-r*r*5.)*.62+pow(max(0.,1.-r),8.);
      gl_FragColor=vec4(vColour,light*vAlpha);
      #include <colorspace_fragment>
    }`;
  const trailFragment=`
    varying vec3 vColour; varying float vAlpha;
    void main(){if(vAlpha<.002)discard;gl_FragColor=vec4(vColour,vAlpha*.36);
      #include <colorspace_fragment>
    }`;
  function makeGeometry(rows){
    const data={position:[],aOrigin:[],aDirection:[],aColour:[],aLaunch:[],aTail:[],aSpeed:[],aSeed:[],aKind:[]};
    for(const row of rows){data.position.push(0,0,0);for(const key of['aOrigin','aDirection','aColour'])data[key].push(...row[key]);for(const key of['aLaunch','aTail','aSpeed','aSeed','aKind'])data[key].push(row[key]);}
    const geometry=new THREE.BufferGeometry();for(const[key,value]of Object.entries(data))geometry.setAttribute(key,new THREE.Float32BufferAttribute(value,['position','aOrigin','aDirection','aColour'].includes(key)?3:1));geometries.push(geometry);return geometry;
  }
  function fireMaterials(uniforms=shared){
    const base=new THREE.ShaderMaterial({uniforms:{...uniforms,uScale:{value:1}},vertexShader:fireVertex,fragmentShader:fireFragment,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,toneMapped:false});
    const halo=base.clone();halo.uniforms={...uniforms,uScale:{value:3.6}};materials.push(base,halo);return[base,halo];
  }
  const waves=[[-.63,.28,9.40,0],[.63,.34,9.66,2],[0,.64,9.93,1],[-.43,-.02,10.28,1],[.47,.06,10.54,0],[-.78,.55,10.87,2],[.78,.53,11.12,1],[0,.37,11.40,0],[-.53,.22,11.75,0],[.53,.20,11.97,2],[0,.67,12.20,1],[0,-.05,12.43,2]];
  const selected=software?waves.filter((_,i)=>i%2===0):coarse?waves.slice(0,10):waves,arms=software?64:coarse?110:170,samples=software?2:4;
  const sparks=[],trails=[];
  for(let b=0;b<selected.length;b++){
    const[x,y,launch,kind]=selected[b];
    for(let i=0;i<arms;i++){
      const theta=i*2.399963,vy=1-2*(i+.5)/arms,r=Math.sqrt(1-vy*vy);
      let direction=[Math.cos(theta)*r,vy,Math.sin(theta)*r];
      if(kind===1)direction=[direction[0]*.85,Math.abs(vy)*.85+.12,direction[2]];
      if(kind===2)direction=[Math.cos(theta),Math.sin(theta)*.80,Math.sin(theta*2)*.2];
      const row={aOrigin:[x,y,-3.05+(b%3)*.10],aDirection:direction,aColour:colours[(b+(i%9===0?1:0))%colours.length].toArray(),aLaunch:launch,aTail:0,aSpeed:.65+random()*.48,aSeed:random(),aKind:kind};
      for(let j=0;j<samples;j++)sparks.push({...row,aTail:j*.055});
      if(!software)for(let j=0;j<3;j++){trails.push({...row,aTail:j*.10},{...row,aTail:(j+1)*.10});}
    }
    for(let j=0;j<12;j++)sparks.push({aOrigin:[x,y,-3.1],aDirection:[0,0,0],aColour:colours[0].toArray(),aLaunch:launch,aTail:j*.014,aSpeed:1,aSeed:j/12,aKind:4});
  }
  const fireGeometry=makeGeometry(sparks),fireMats=fireMaterials();const fireObjects=fireMats.map(m=>add(new THREE.Points(fireGeometry,m),902));
  if(trails.length){const material=new THREE.ShaderMaterial({uniforms:{...shared,uScale:{value:1}},vertexShader:fireVertex,fragmentShader:trailFragment,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,toneMapped:false});materials.push(material);fireObjects.push(add(new THREE.LineSegments(makeGeometry(trails),material),902));}

  // One reusable encore emitter is controlled by holding/releasing the wish.
  const encoreUniforms={...shared,uTime:{value:0},uFade:{value:0},uOffset:{value:new THREE.Vector2(0,0)},uPower:{value:1}},encoreRows=[];let encoreAt=-99,encoreStrength=1;
  for(let i=0;i<(software?120:coarse?360:680);i++){const theta=i*2.399963,y=1-2*(i+.5)/(software?120:coarse?360:680),r=Math.sqrt(Math.max(0,1-y*y)),row={aOrigin:[0,.18,-2.95],aDirection:[Math.cos(theta)*r,y,Math.sin(theta)*r],aColour:colours[i%colours.length].toArray(),aLaunch:0,aTail:0,aSpeed:1.15,aSeed:random(),aKind:0};for(let j=0;j<(software?2:4);j++)encoreRows.push({...row,aTail:j*.06});}
  const encoreGeo=makeGeometry(encoreRows),encoreObjects=fireMaterials(encoreUniforms).map(m=>add(new THREE.Points(encoreGeo,m),902));
  const chargeGeometry=new THREE.TorusGeometry(.24,.0018,6,100),chargeMaterial=new THREE.MeshBasicMaterial({color:'#f7d991',transparent:true,opacity:0,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending});geometries.push(chargeGeometry);materials.push(chargeMaterial);const chargeRing=add(new THREE.Mesh(chargeGeometry,chargeMaterial),902);chargeRing.position.set(0,0,-3);
  return{
    update(t,hx,hy,fade,charge){
      shared.uTime.value=t;shared.uHalf.value.set(hx,hy);shared.uPixel.value=Math.min(renderer.getPixelRatio(),1.8);shared.uFade.value=fade;shared.uCrown.value=ease((t-5.7)/1.4);shared.uCharge.value=charge;shared.uClearWidth.value=hx/hy<1.1?.90:.48;
      for(const ribbon of ribbons){ribbon.visible=!reduced&&t<10.6;ribbon.material.uniforms.uStrength.value=ease(t/.8)*(1-ease((t-9.2)/1.4))*(1-shared.uCrown.value*.45);}
      for(const object of fireObjects)object.visible=!reduced&&t>8.8;
      encoreUniforms.uTime.value=Math.max(0,t-encoreAt);encoreUniforms.uFade.value=fade*encoreStrength;
      for(const object of encoreObjects)object.visible=!reduced&&t-encoreAt>=0&&t-encoreAt<2.5;
      const unit=Math.min(hx,hy);chargeRing.visible=!reduced&&charge>.01;chargeRing.scale.setScalar(unit*(1+charge*1.6));chargeRing.rotation.z=t*.4;chargeMaterial.opacity=charge*.65*fade;
    },
    burst(t,strength=1,x=0,y=.18){encoreAt=t;encoreStrength=.65+Math.min(1,strength)*.7;encoreUniforms.uPower.value=.7+Math.min(1,strength)*.6;encoreUniforms.uOffset.value.set(x,y-.18);},reset(){encoreAt=-99;},
    get metrics(){return{sparkVertices:fireGeometry.attributes.position.count,waves:selected.length,encoreVertices:encoreGeo.attributes.position.count};},
    dispose(){for(const object of objects)object.removeFromParent();for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();}
  };
}
