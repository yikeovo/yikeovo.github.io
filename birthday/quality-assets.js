import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {HDRLoader} from './vendor/addons/loaders/HDRLoader.js';
import {limitTextureImages} from './texture-budget.js?v=11';

// Originals and their CC0 provenance are recorded in docs/quality-assets.json.
export async function loadQualityAssets(renderer,onProgress){
  const ids=['chinese_tea_table','chinese_armchair','chinese_cabinet','chinese_console_table','television_02','antique_ceramic_vase_01','potted_plant_01','potted_plant_02'];
  const loader=new GLTFLoader(),models=new Map();let done=0;
  await Promise.all(ids.map(async id=>{const gltf=await loader.loadAsync('assets/runtime/models/'+id+'/'+(id.startsWith('potted_')?'web.glb':'model.gltf'));gltf.scene.traverse(o=>{
    if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;
    for(const m of Array.isArray(o.material)?o.material:[o.material]){m.envMapIntensity=.65;for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key])m[key].anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}
  });models.set(id,gltf.scene);onProgress?.(++done/ids.length);}));
  if(matchMedia('(pointer:coarse)').matches){const textures=[];models.forEach(root=>root.traverse(o=>{if(o.isMesh)for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','alphaMap'])textures.push(o.material[key]);}));await limitTextureImages(textures,1024);}
  const hdr=await new HDRLoader().loadAsync('assets/environment/lebombo_1k.hdr');
  hdr.mapping=THREE.EquirectangularReflectionMapping;
  const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(hdr).texture;hdr.dispose();pmrem.dispose();
  const background=await new HDRLoader().loadAsync('assets/environment/spruit_sunrise_1k.hdr');background.mapping=THREE.EquirectangularReflectionMapping;
  function model(id,dimensions){
    const root=new THREE.Group(),source=models.get(id).clone(true);root.name=id;
    const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    source.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));root.add(source);
    if(typeof dimensions==='number')root.scale.setScalar(dimensions/size.x);
    else if(dimensions)root.scale.set(dimensions[0]/size.x,dimensions[1]/size.y,dimensions[2]/size.z);
    root.userData.asset=id;return root;
  }
  return{model,environment,background};
}
