import * as THREE from './vendor/three.module.js';
import {limitTextureImages} from './texture-budget.js?v=11';

function paintedTexture(draw, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export function labelTexture(lines, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = options.width || 768;
  canvas.height = options.height || 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = options.background || '#eae3ce';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = options.border || '#c4baa3';
  ctx.lineWidth = 3;
  ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
  ctx.textAlign = 'center';
  ctx.fillStyle = options.color || '#4f5747';
  const lineHeight = canvas.height / (lines.length + 1);
  lines.forEach((line, index) => {
    ctx.font = (index === 0 ? '48' : '32') + 'px "SimSun", serif';
    ctx.fillText(line, canvas.width / 2, lineHeight * (index + 1), canvas.width - 70);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export async function createMaterials(renderer, photos, onProgress) {
  let seed = 27183;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => onProgress?.(loaded / Math.max(1, total));
  const loader = new THREE.TextureLoader(manager);
  const urls = photos.map((photo) => photo.src);
  const loaded = await Promise.all(urls.map((url) => loader.loadAsync(url)));
  loaded.forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  });
  const photoTextures = loaded;
  async function pbr(id){const maps=await Promise.all(['Diffuse','nor_gl','Rough'].map(name=>loader.loadAsync('assets/runtime/pbr/'+id+'/'+name+'.webp')));maps.forEach((t,i)=>{t.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());});return{map:maps[0],normalMap:maps[1],roughnessMap:maps[2]};}
  const [stone,wallMaps,woodMaps,linenMaps]=await Promise.all([pbr('terrazzo_tiles'),pbr('white_plaster_02'),pbr('wood_table_worn'),pbr('rough_linen')]);
  const sofaFabric=await loader.loadAsync('assets/textures/memory-jacquard-v16.webp');sofaFabric.colorSpace=THREE.SRGBColorSpace;sofaFabric.wrapS=sofaFabric.wrapT=THREE.RepeatWrapping;sofaFabric.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const oldPaint=paintedTexture((ctx,s)=>{ctx.fillStyle='#609989';ctx.fillRect(0,0,s,s);for(let i=0;i<7500;i++){const x=random()*s,y=random()*s;ctx.fillStyle=['#2b63501b','#c3c4a518','#e3ddbc14','#687a601f'][i%4];ctx.fillRect(x,y,.6+random()*1.4,1+random()*15);}for(let i=0;i<170;i++){ctx.fillStyle='#8c826a28';ctx.fillRect(random()*s,random()*s,1+random()*2,1+random()*5);}},512);
  if(matchMedia('(pointer:coarse)').matches)await limitTextureImages([stone,wallMaps,woodMaps,linenMaps].flatMap(set=>Object.values(set)),1024);
  const floor = paintedTexture((ctx, size) => {
    ctx.fillStyle = '#b5b2a5'; ctx.fillRect(0, 0, size, size);
    const colors = ['#dedbce', '#e6e3d7', '#6e706b', '#8c8d81', '#c4b7a0', '#a2a397'];
    for (let i = 0; i < 3000; i++) {
      const x = random() * size, y = random() * size, r = 1 + random() * 3;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x, y - r * .7); ctx.lineTo(x + r, y - r * .3); ctx.lineTo(x + r * .5, y + r); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#8e928858'; ctx.lineWidth = 1.6;
    ctx.strokeRect(.5, .5, size - 1, size - 1);
  });
  floor.repeat.set(16.8, 12.8);
  const concrete = paintedTexture((ctx, size) => {
    ctx.fillStyle = '#8e938a'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 24000; i++) {
      ctx.fillStyle = random() > .5 ? '#ced0bd24' : '#444e4320';
      ctx.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
    }
  }); concrete.repeat.set(7, 7);
  const woven = paintedTexture((ctx, size) => {
    ctx.fillStyle = '#d0c5ac'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < size; i += 3) {
      ctx.strokeStyle = '#655b442b'; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.strokeStyle = '#fff6e93b'; ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }
  });
  const floral = paintedTexture((ctx, size) => {
    ctx.fillStyle = '#6c765c'; ctx.fillRect(0, 0, size, size);
    for (let row = -1; row < 6; row++) for (let col = -1; col < 6; col++) {
      const x = col * 110 + ((row % 2) * 45), y = row * 107;
      ctx.strokeStyle = '#b7b494'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x + 23, y + 31, 27, 8, -.8, 0, Math.PI * 2); ctx.stroke();
      for (let p = 0; p < 7; p++) {
        const a = p * Math.PI * 2 / 7;
        ctx.fillStyle = ['#b98c80', '#b17e75', '#bfa08a'][p % 3];
        ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 16, y + Math.sin(a) * 16, 15, 10, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#cbbb92'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = .09;
    for (let i = 0; i < size; i += 2) { ctx.fillStyle = i % 4 ? '#fff' : '#000'; ctx.fillRect(i, 0, 1, size); }
  }); floral.repeat.set(2, 2);
  const quilt = paintedTexture((ctx, size) => {
    ctx.fillStyle = '#a9b5b3'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < size; i += 64) {
      ctx.fillStyle = '#eee6cb85'; ctx.fillRect(i, 0, 25, size); ctx.fillRect(0, i, size, 25);
      ctx.fillStyle = '#536c7024'; ctx.fillRect(i + 28, 0, 3, size); ctx.fillRect(0, i + 28, size, 3);
    }
    ctx.strokeStyle = '#fff4'; ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 4) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke(); }
  });
  const roof = paintedTexture((ctx, size) => {
    ctx.fillStyle = '#544e45'; ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 64) for (let x = 0; x < size; x += 36) {
      const gradient = ctx.createLinearGradient(x, 0, x + 36, 0);
      gradient.addColorStop(0, '#3b3c36'); gradient.addColorStop(.4, '#7e7b6c'); gradient.addColorStop(1, '#50534a');
      ctx.fillStyle = gradient; ctx.fillRect(x + 1, y + 1, 34, 62);
      ctx.fillStyle = '#d4cdac30'; ctx.fillRect(x + 5, y + 57, 25, 3);
    }
  }); roof.repeat.set(6, 3);
  const standard = (properties) => new THREE.MeshStandardMaterial(properties);
  const mats = {
    plaster: standard({ ...wallMaps,color: '#e7e8e1', roughness: .95,normalScale:new THREE.Vector2(.28,.28) }),
    dado: standard({ ...wallMaps,color: '#d9dcd5', roughness: .92,normalScale:new THREE.Vector2(.2,.2) }),
    ceiling: standard({ ...wallMaps,color: '#eee9df', roughness: 1,normalScale:new THREE.Vector2(.15,.15) }),
    wood: standard({ ...woodMaps,color: '#b7a18b', roughness: .72,normalScale:new THREE.Vector2(.4,.4) }),
    darkWood: standard({ ...woodMaps,color: '#756452', roughness: .7,normalScale:new THREE.Vector2(.4,.4) }),
    door: standard({ ...woodMaps,color: '#728b78', roughness: .9,normalScale:new THREE.Vector2(.4,.4) }),
    memoryPaint: standard({map:oldPaint,roughness:.87,metalness:.10,bumpMap:oldPaint,bumpScale:.0008}),
    memoryBronze: standard({color:'#6f6859',metalness:.72,roughness:.57}),
    sofaFabric: standard({map:sofaFabric,normalMap:linenMaps.normalMap,normalScale:new THREE.Vector2(.22,.22),color:'#ded2c5',roughness:.98,side:THREE.DoubleSide}),
    sofaPiping: standard({color:'#713c35',roughness:1}),
    floor: standard({ ...stone,color:'#bcb9a9',roughness: .58,normalScale:new THREE.Vector2(.3,.3),envMapIntensity:.65 }),
    concrete: standard({ map: concrete, color: '#c1c2af', roughness: .94, bumpMap: concrete, bumpScale: .018 }),
    floral: standard({ map: floral, roughness: 1 }),
    quilt: standard({ map: quilt, normalMap:linenMaps.normalMap,normalScale:new THREE.Vector2(.2,.2),roughness: 1,side:THREE.DoubleSide }),
    linen: standard({ ...linenMaps,color: '#ece8db', roughness: 1,normalScale:new THREE.Vector2(.25,.25),side:THREE.DoubleSide }),
    paleLinen: standard({ ...linenMaps,color: '#f7f2e9', roughness: 1,normalScale:new THREE.Vector2(.2,.2) }),
    green: standard({ color: '#54634a', roughness: .76 }),
    leaf: standard({ color: '#476641', roughness: .8, side: THREE.DoubleSide }),
    terracotta: standard({ color: '#906448', roughness: .85 }),
    dark: standard({ color: '#252a27', roughness: .58 }),
    black: standard({ color: '#171a18', roughness: .66 }),
    metal: standard({ color: '#8f948e', metalness: .78, roughness: .33 }),
    brass: standard({ color: '#a28a51', metalness: .65, roughness: .35 }),
    ceramic: standard({ color: '#e8e1cc', roughness: .26, metalness: .03 }),
    enamel: standard({ color: '#d5e1d9', roughness: .24, metalness: .12 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#dce6da', roughness: .08, transparent: true, opacity: .13, metalness: .15, depthWrite: false }),
    red: standard({ color: '#a14335', roughness: .8 }),
    paper: standard({ color: '#eee5cf', roughness: .95 }),
    cake: standard({ color: '#eee0bd', roughness: .63 }),
    icing: standard({ color: '#fff4df', roughness: .45 }),
    roof: standard({ map: roof, roughness: .86 }),
    photoTextures
  };
  // Keep the scanned microstructure without turning a remembered home into ruins.
  for(const [name,amount] of [['plaster',.16],['dado',.12],['ceiling',.07],['floor',.52],['linen',.35],['paleLinen',.22]])mats[name].userData.albedoDetail=amount;
  return mats;
}

export function finishSurfaceMaterials(scene){
  scene.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material]){
    const amount=material.userData.albedoDetail;if(amount===undefined&&!material.lightMap)continue;
    material.onBeforeCompile=shader=>{
      if(amount!==undefined)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = mix(diffuse, diffuseColor.rgb, '+amount.toFixed(4)+');');
      // Cycles already integrated diffuse environment lighting. Keep the HDR
      // reflections, while avoiding a second unoccluded diffuse contribution.
      const fill=material.alphaTest>0?.5:amount===undefined?.12:.04;
      if(material.lightMap)shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>','#include <lights_fragment_maps>\n iblIrradiance *= '+fill.toFixed(3)+';');
    };
    material.customProgramCacheKey=()=>String(amount)+':'+!!material.lightMap;material.needsUpdate=true;
  }});
}
