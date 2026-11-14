import * as THREE from './vendor/three.module.js';
import {limitTextureImages} from './texture-budget.js?v=25';
import {loadAsset,readAsset} from './asset-loading.js?v=25';

export async function applyLightmaps(scene){
  const manifest=await readAsset('assets/lightmaps/manifest.json?v=22','json');
  const [buffer,...images]=await Promise.all([readAsset('assets/lightmaps/uv.bin?v=22','arrayBuffer'),...['architecture','furniture'].map(name=>{const url='assets/lightmaps/'+name+'.webp?v=22';return loadAsset(url,()=>new THREE.TextureLoader().loadAsync(url));})]);
  const textures={architecture:images[0],furniture:images[1]};
  for(const texture of images){texture.colorSpace=THREE.SRGBColorSpace;texture.channel=1;texture.flipY=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;}
  await limitTextureImages(images,2048);
  const uv=new Float32Array(buffer),entries=new Map(manifest.meshes.map(m=>[m.id,m])),materialCache=new Map();let id=0,applied=0;
  scene.traverse(o=>{
    if(!o.isMesh||o.material.transparent||Array.isArray(o.material))return;
    let node=o;while(node){if(node.userData.dynamic||node.userData.interaction?.kind==='door'||node.userData.interaction?.kind==='candle')return;node=node.parent;}
    const record=entries.get(id++);if(!record)return;
    if(o.geometry.index)o.geometry=o.geometry.toNonIndexed();
    if(o.geometry.attributes.position.count!==record.count)throw new Error('Lightmap geometry has changed; rebake lighting');
    o.geometry.setAttribute('uv1',new THREE.BufferAttribute(uv.slice(record.offset,record.offset+record.count*2),2));
    const key=o.material.uuid+':'+record.atlas;
    if(!materialCache.has(key)){const material=o.material.clone();material.lightMap=textures[record.atlas];material.lightMapIntensity=manifest.lightScale*Math.PI;material.envMapIntensity=.24;materialCache.set(key,material);}
    o.material=materialCache.get(key);o.receiveShadow=false;applied++;
  });
  if(applied!==entries.size)throw new Error('Incomplete lighting atlas');
  return{precomputed:true,type:'Cycles diffuse global illumination + PBR',meshes:applied,atlases:2};
}
