import * as THREE from './vendor/three.module.js';
import {createCelebrationStage} from './celebration-stage.js?v=22';

// One finite performance in the existing renderer. No extra canvas loop or FBO.
export function createBirthdayShow({scene,camera,renderer,photoTextures,photos,software=false}){
  const coarse=matchMedia('(pointer:coarse)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count=software?900:coarse?2400:4600,photoPages=Math.max(1,Math.ceil(photoTextures.length/4)),duration=reduced?7+(photoPages-1)*2:20+(photoPages-1)*4;
  const root=new THREE.Group();root.name='birthday-wish-performance';root.visible=false;root.userData.dynamic=true;camera.add(root);scene.add(camera);
  let running=false,paused=false,userPaused=false,time=0,drawTime=0,view=null,layerMask=1,callbacks={},stage='',sound=false,context=null,gain=null,voices=[],holding=false,charge=0,encoreUntil=0,shots=0;
  let seed=7931;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);},mix=THREE.MathUtils.lerp;
  const seeds=Array.from({length:count},()=>[random(),random(),random(),random()]);
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count),alphas=new Float32Array(count).fill(1);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aAlpha',new THREE.BufferAttribute(alphas,1).setUsage(THREE.DynamicDrawUsage));
  const palette=['#ffe2a2','#fff3d9','#e0b488','#97c8c1','#e0a299'].map(c=>new THREE.Color(c));
  for(let i=0;i<count;i++){palette[i%palette.length].toArray(colors,i*3);sizes[i]=2.8+seeds[i][2]*2.6;}
  const particleMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,vertexColors:true,toneMapped:false,uniforms:{uPixel:{value:1},uOpacity:{value:1},uScale:{value:1}},vertexShader:'attribute float aSize; attribute float aAlpha; varying vec3 vColor; varying float vAlpha; uniform float uPixel; uniform float uScale; void main(){vColor=color;vAlpha=aAlpha; vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=clamp(aSize*uPixel*uScale*3./(-p.z),1.,36.);}',fragmentShader:'varying vec3 vColor; varying float vAlpha; uniform float uOpacity; void main(){float r=length(gl_PointCoord-.5)*2.; if(r>1.)discard; float a=exp(-r*r*5.)*.65+pow(max(0.,1.-r),6.); gl_FragColor=vec4(vColor,a*uOpacity*vAlpha);\n#include <colorspace_fragment>\n}'});
  const points=new THREE.Points(geometry,particleMaterial);points.frustumCulled=false;points.renderOrder=901;root.add(points);
  const haloMaterial=particleMaterial.clone();haloMaterial.uniforms.uScale.value=3.5;const halo=new THREE.Points(geometry,haloMaterial);halo.frustumCulled=false;halo.renderOrder=901;root.add(halo);
  const backdropMaterial=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,uniforms:{uOpacity:{value:0},uResolution:{value:new THREE.Vector2(1,1)},uTime:{value:0}},vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform float uOpacity,uTime;uniform vec2 uResolution;void main(){vec2 uv=gl_FragCoord.xy/uResolution;vec2 p=(uv-.5)*vec2(uResolution.x/uResolution.y,1.);float warm=exp(-dot(p-vec2(.1,-.08),p-vec2(.1,-.08))*3.);float cool=exp(-dot(p-vec2(-.65,.4),p-vec2(-.65,.4))*3.);vec3 c=vec3(.0015,.003,.003)+vec3(.028,.012,.003)*warm+vec3(.002,.014,.017)*cool;float angle=atan(p.x,p.y+.95);float rays=pow(max(0.,sin(angle*13.+uTime*.035)),22.)*exp(-length(p-vec2(0.,-.75))*.6);c+=vec3(.015,.009,.002)*rays;float ring=exp(-pow((length(p*vec2(.85,1.))-.46)/.007,2.));c+=vec3(.007,.005,.002)*ring*smoothstep(5.,7.,uTime)*(1.-smoothstep(10.,11.,uTime));gl_FragColor=vec4(c,uOpacity);
  #include <colorspace_fragment>
  }`});
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),backdropMaterial);backdrop.frustumCulled=false;backdrop.renderOrder=900;root.add(backdrop);
  const paperCanvas=document.createElement('canvas');paperCanvas.width=paperCanvas.height=256;const paper=paperCanvas.getContext('2d');paper.fillStyle='#efe5cf';paper.fillRect(0,0,256,256);for(let i=0;i<2200;i++){paper.fillStyle=random()>.5?'#ffffff10':'#92774808';paper.fillRect(random()*256,random()*256,1,1);}paper.strokeStyle='#b89a5d66';paper.lineWidth=.8;paper.strokeRect(6.5,6.5,243,243);const paperTexture=new THREE.CanvasTexture(paperCanvas);paperTexture.colorSpace=THREE.SRGBColorSpace;
  const cards=photoTextures.map((texture,i)=>{
    const group=new THREE.Group(),ratio=texture.image.width/texture.image.height;group.name='wish-photo-'+i;
    const frameMaterial=new THREE.MeshBasicMaterial({map:paperTexture,color:'#ffffff',transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false});
    const imageMaterial=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false});
    const frame=new THREE.Mesh(new THREE.PlaneGeometry(1,1),frameMaterial),image=new THREE.Mesh(new THREE.PlaneGeometry(1,1),imageMaterial);
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#665d47';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='44px "SimSun",serif';ctx.fillText(photos[i].caption,384,48,720);
    const captionTexture=new THREE.CanvasTexture(canvas);captionTexture.colorSpace=THREE.SRGBColorSpace;
    const caption=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:captionTexture,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false}));
    frame.renderOrder=903;image.renderOrder=caption.renderOrder=904;image.position.z=caption.position.z=.002;group.add(frame,image,caption);root.add(group);return{group,ratio,frame,image,caption,captionTexture,index:i,page:Math.floor(i/4),slot:i%4,pageSize:Math.min(4,photoTextures.length-Math.floor(i/4)*4)};
  });
  const burstCount=software?144:288,burstSize=burstCount/4,burstPositions=new Float32Array(burstCount*3),burstColors=new Float32Array(burstCount*3),burstSizes=new Float32Array(burstCount),burstAlphas=new Float32Array(burstCount),bursts=Array.from({length:4},()=>({start:-99,x:0,y:0}));let burstCursor=0;
  for(let i=0;i<burstCount;i++){palette[i%palette.length].toArray(burstColors,i*3);burstSizes[i]=3+seeds[i][1]*2;}
  const burstGeometry=new THREE.BufferGeometry();burstGeometry.setAttribute('position',new THREE.BufferAttribute(burstPositions,3).setUsage(THREE.DynamicDrawUsage));burstGeometry.setAttribute('color',new THREE.BufferAttribute(burstColors,3));burstGeometry.setAttribute('aSize',new THREE.BufferAttribute(burstSizes,1));burstGeometry.setAttribute('aAlpha',new THREE.BufferAttribute(burstAlphas,1).setUsage(THREE.DynamicDrawUsage));
  const burstCore=new THREE.Points(burstGeometry,particleMaterial),burstHalo=new THREE.Points(burstGeometry,haloMaterial);for(const mesh of[burstCore,burstHalo]){mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=902;root.add(mesh);}
  const photoRay=new THREE.Raycaster();photoRay.layers.set(1);const pointer=new THREE.Vector2();
  const effects=createCelebrationStage({root,renderer,software,coarse,reduced});
  let glyphs=[],portrait=false,hx=1,hy=1;
  function resize(){
    portrait=innerWidth/innerHeight<1.1;hy=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*3;hx=hy*camera.aspect;
    if(running&&view){const small=innerWidth<760||innerWidth/innerHeight<1.15;view={...view,fullWidth:innerWidth,fullHeight:innerHeight,width:innerWidth,height:innerHeight,offsetX:small?0:innerWidth*.16,offsetY:small?innerHeight*.1:0};}
    particleMaterial.uniforms.uPixel.value=Math.min(devicePixelRatio,1.65)*(coarse?1.08:1);
    haloMaterial.uniforms.uPixel.value=particleMaterial.uniforms.uPixel.value;
    const c=document.createElement('canvas');c.width=1000;c.height=portrait?440:200;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 126px "SimSun",serif';if(portrait){ctx.fillText('爸，',500,130);ctx.fillText('生日快乐',500,315);}else ctx.fillText('爸，生日快乐',500,100);
    const pixels=ctx.getImageData(0,0,c.width,c.height).data,samples=[];for(let y=0;y<c.height;y+=3)for(let x=0;x<c.width;x+=3)if(pixels[(y*c.width+x)*4+3]>140)samples.push([(x/c.width-.5)*(portrait?1.87:1.75),(.5-y/c.height)*(portrait?.72:.39)]);
    glyphs=Array.from({length:count},(_,i)=>samples[Math.floor(i*samples.length/count)]||[0,0]);
    for(const card of cards){const pair=card.pageSize<=2,width=hx*(portrait?(pair?.82:.76):(pair?.49:.36)),height=Math.min(width/card.ratio,hy*(portrait?(pair?.68:innerHeight<680?.42:.51):(pair?(innerHeight<500?.60:.98):.69))),fittedWidth=height*card.ratio,captionHeight=Math.min(.06,hy*.065);card.image.scale.set(fittedWidth,height,1);card.frame.scale.set(fittedWidth+.025,height+captionHeight+.035,1);card.image.position.y=captionHeight/2;card.caption.scale.set(fittedWidth,captionHeight,1);card.caption.position.y=-height/2-.003;}
    if(running)paint();
  }
  function syncAudio(){if(!context)return;const freeze=paused||userPaused||document.hidden||!running||!sound;(freeze?context.suspend():context.resume()).catch(()=>{});}
  function note(frequency,delay,amplitude=.45,life=1.5){const oscillator=context.createOscillator(),envelope=context.createGain(),start=context.currentTime+delay;oscillator.type='sine';oscillator.frequency.value=frequency;envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(amplitude,start+.016);envelope.gain.exponentialRampToValueAtTime(.0001,start+life);oscillator.connect(envelope);envelope.connect(gain);oscillator.start(start);oscillator.stop(start+life+.1);voices.push(oscillator);oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();voices=voices.filter(o=>o!==oscillator);};}
  function score(){
    if(!sound||!running)return;try{context??=new(window.AudioContext||window.webkitAudioContext)();gain??=context.createGain();gain.gain.value=.085;gain.connect(context.destination);const notes=[[0,261.63],[.38,329.63],[.76,392],[1.4,523.25],[2.3,440],[3,392],[4,329.63],[5.3,523.25],[5.7,659.25],[6.1,783.99],[7.5,587.33],[8,523.25],[9.4,392],[10,523.25],[10.5,659.25],[11.3,783.99],[12.1,523.25]];let scheduled=0;for(const[offset,f]of notes){const at=offset/14*duration-time;if(at>=0){note(f,at);scheduled++;}}for(let i=0;i<14;i++){const at=(9.4+i*.22)/14*duration-time;if(at>=0)note([523.25,659.25,783.99,1046.5][i%4],at,.22,.85);}for(const offset of[9.4,10.5,11.4,12.2]){const at=offset/14*duration-time;if(at>=0)note(130.81,at,.35,1.1);}if(!scheduled)note(523.25,.02);syncAudio();}catch{sound=false;}
  }
  function silence(){for(const voice of voices){try{voice.stop();}catch{}}voices=[];if(gain)gain.disconnect();}
  const visibility=syncAudio;document.addEventListener('visibilitychange',visibility);
  function end(notify=false){const done=callbacks.onComplete;running=false;paused=userPaused=holding=false;charge=0;root.visible=false;camera.layers.mask=layerMask;silence();syncAudio();if(view?.enabled)camera.setViewOffset(view.fullWidth,view.fullHeight,view.offsetX,view.offsetY,view.width,view.height);else camera.clearViewOffset();camera.updateProjectionMatrix();callbacks={};if(notify)done?.();}
  function salute(strength=.7,x=0,y=.18){if(!running)return;const t=time/duration*14;effects.burst(t,strength,x,y);if(reduced){const b=bursts[burstCursor++%4];b.start=time-.09;b.x=x;b.y=y;}encoreUntil=Math.max(encoreUntil,time+duration/14*(reduced?.7:2.5));shots++;if(sound&&context)note(523.25+strength*261.63,.01);}
  function releaseCharge(){if(!holding)return;holding=false;salute(Math.max(.3,charge));charge=0;callbacks.onCharge?.(0);}
  function paint(){
    const t=time/duration*14;
    const extraFade=Math.max(encoreUntil>duration?1-ease((time-(encoreUntil-.65))/.65):0,holding?ease(charge/.2):0);
    const fade=Math.max(1-ease((t-13.2)/.8),extraFade);
    // During the opaque middle acts, skip the hidden house's PBR draws.
    camera.layers.mask=t>.9&&(t<13.2||extraFade>.98)?2:layerMask|2;
    const next=t<1.7?'ember':t<6?'memories':t<10?'words':'fireworks';if(next!==stage){stage=next;callbacks.onStage?.(stage);}callbacks.onProgress?.(time/duration);
    backdropMaterial.uniforms.uOpacity.value=ease(t/.65)*fade;backdropMaterial.uniforms.uResolution.value.set(innerWidth,innerHeight).multiplyScalar(renderer.getPixelRatio());backdropMaterial.uniforms.uTime.value=t;
    const form=ease((t-5.5)/1.4),release=ease((t-9.8)/.8),pageLength=4.6/photoPages;
    // A maximum of four frames share a page. Extra photographs get their own
    // entrance instead of overlapping the lower row of the original layout.
    for(const c of cards){
      const i=c.index,side=c.slot%2?-1:1,row=c.slot<2?1:-1,pair=c.pageSize<=2,start=1.55+c.page*pageLength,end=start+pageLength;
      const alpha=ease((t-start-(reduced?0:c.slot*.06))/(reduced?.25:.55))*(1-ease((t-(end-.4))/.4)),entry=reduced?1:ease((t-start-c.slot*.06)/.55),bob=reduced?0:Math.sin(t*.65+i)*.026;
      const finalX=c.pageSize===1?0:side*(portrait?.47:pair?.46:.63),x=mix(side*(portrait?.88:1.15),finalX,entry),y=pair?(portrait?-.10:innerHeight<500?-.18:-.16):portrait?(row>0?(innerHeight<680?.12:.21):-.38):row*.30;
      c.group.position.set(x*hx,hy*y+bob,-3.05-(1-entry)*.65+(reduced?0:Math.sin(t*.4+i)*.07));c.group.rotation.set(reduced?0:.02*Math.sin(t+i),reduced?0:-side*(.035+(1-entry)*.2),side*.035+(reduced?0:Math.sin(t*.45+i)*.01));c.group.visible=alpha>.002;c.image.material.opacity=alpha;c.frame.material.opacity=c.caption.material.opacity=alpha*.95;
    }
    particleMaterial.uniforms.uOpacity.value=fade*(reduced?.7:1);haloMaterial.uniforms.uOpacity.value=fade*.09;
    for(let i=0;i<count;i++){
      const[a,b,c,d]=seeds[i],k=i*3,theta=a*Math.PI*2;let x,y,z;alphas[i]=1;
      if(reduced){[x,y]=glyphs[i];z=-3;}
      else if(t<1.7){const p=t/1.7,angle=theta+p*7,rad=(.025+b*.17)*(1+p*1.3);x=Math.cos(angle)*rad;y=-.39+p*(.35+c*.8);z=-3+Math.sin(angle)*.17;}
      else{
        const spin=theta+(t-1.7)*.16,heartX=16*Math.pow(Math.sin(spin),3)/18,heartY=(13*Math.cos(spin)-5*Math.cos(2*spin)-2*Math.cos(3*spin)-Math.cos(4*spin))/19;
        x=heartX*(.54+(b-.5)*.055);y=heartY*.49+.06+(c-.5)*.028;z=-3+Math.sin(theta*3+t*.3)*.13;
        if(i%5===0){x=(a-.5)*2.1;y=(b-.5)*1.8;z=-3.2+(c-.5)*1.5;}
        x=mix(x,glyphs[i][0],form);y=mix(y,glyphs[i][1]+.08,form);z=mix(z,-3+(d-.5)*.025,form);
        if(release>0){x=mix(x,(a-.5)*2.25,release);y=mix(y,(b-.5)*1.85,release);z=mix(z,-3.4+(c-.5),release);alphas[i]=1-release+release*(.10+d*.12);}
      }
      positions[k]=x*hx;positions[k+1]=y*hy;positions[k+2]=z;
    }
    geometry.attributes.position.needsUpdate=true;
    geometry.attributes.aAlpha.needsUpdate=true;
    let activeBurst=false;const unit=Math.min(hx,hy);for(let i=0;i<burstCount;i++){const b=bursts[Math.floor(i/burstSize)],age=time-b.start,k=i*3,theta=i*2.399963,r=reduced?.09:(.2+seeds[i][1]*.35)*(1-Math.exp(-age*3));const live=age>=0&&age<2.6;burstAlphas[i]=live?ease(age/.08)*(1-ease((age-.4)/2.2))*.8:0;burstPositions[k]=b.x*hx+Math.cos(theta)*r*unit;burstPositions[k+1]=b.y*hy+Math.sin(theta)*r*unit-(reduced?0:age*age*.025*unit);burstPositions[k+2]=-3+(seeds[i][2]-.5)*.2;activeBurst||=live;}burstCore.visible=burstHalo.visible=activeBurst;burstGeometry.attributes.position.needsUpdate=burstGeometry.attributes.aAlpha.needsUpdate=true;
    effects.update(t,hx,hy,fade,charge);callbacks.onCharge?.(charge);

  }
  root.traverse(object=>object.layers.set(1));resize();
  return{
    async warmup(){const mask=camera.layers.mask;camera.layers.enable(1);root.visible=true;try{await renderer.compileAsync(scene,camera);}finally{root.visible=false;camera.layers.mask=mask;}},
    start(options={}){if(running)end();callbacks=options;time=drawTime=charge=encoreUntil=shots=0;stage='';running=true;paused=userPaused=holding=false;effects.reset();bursts.forEach(b=>b.start=-99);layerMask=camera.layers.mask;view=camera.view?{...camera.view}:null;camera.clearViewOffset();camera.updateProjectionMatrix();resize();root.visible=true;paint();score();},
    stop(){if(running)end(false);},skip(){if(running)end(true);},
    tick(delta){if(!running||paused||userPaused)return false;time+=delta;if(holding){charge=Math.min(1,charge+delta/.95);if(charge>=1)releaseCharge();}drawTime+=delta;if(time>=duration&&time>=encoreUntil&&!holding){end(true);return true;}if(drawTime<(software?1/24:1/60))return false;drawTime=0;paint();return true;},
    beginCharge(){if(!running||paused||userPaused)return false;holding=true;charge=0;return true;},releaseCharge,cancelCharge(){holding=false;charge=0;callbacks.onCharge?.(0);},salute,
    setPaused(value){paused=value;syncAudio();},togglePause(){if(running)userPaused=!userPaused;syncAudio();return userPaused;},
    hitPhoto(x,y){if(!running)return null;camera.updateMatrixWorld(true);pointer.set(x/innerWidth*2-1,1-y/innerHeight*2);photoRay.setFromCamera(pointer,camera);const visible=cards.filter(c=>c.group.visible&&c.image.material.opacity>.3);const hits=photoRay.intersectObjects(visible.flatMap(c=>[c.frame,c.image]),false);return hits.length?cards.find(c=>c.image===hits[0].object||c.frame===hits[0].object).index:null;},
    tap(x,y){if(!running)return null;const index=this.hitPhoto(x,y);if(index!==null)return{kind:'photo',index};const b=bursts[burstCursor++%4];b.start=time-.09;b.x=x/innerWidth*2-1;b.y=1-y/innerHeight*2;if(stage==='fireworks')salute(.65,b.x,b.y);paint();return{kind:'light'};},
    setSound(value){sound=value;silence();if(sound)score();return sound;},resize,
    get state(){return{running,stage,time,duration,particles:count,reduced,sound,paused:paused||userPaused,userPaused,holding,charge,shots,photoPages,visiblePhotos:cards.filter(c=>c.group.visible&&c.image.material.opacity>.3).map(c=>c.index),effects:effects.metrics,bursts:bursts.filter(b=>time-b.start>=0&&time-b.start<2.6).length,audio:context?.state||'off'};},
    dispose(){end();effects.dispose();paperTexture.dispose();document.removeEventListener('visibilitychange',visibility);geometry.dispose();burstGeometry.dispose();particleMaterial.dispose();haloMaterial.dispose();backdrop.geometry.dispose();backdropMaterial.dispose();for(const c of cards){for(const mesh of[c.frame,c.image,c.caption]){mesh.geometry.dispose();mesh.material.dispose();}c.captionTexture.dispose();}root.removeFromParent();context?.close().catch(()=>{});}
  };
}


