import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {HDRLoader} from './vendor/addons/loaders/HDRLoader.js';
import {limitTextureImages} from './texture-budget.js?v=25';
import {loadAsset} from './asset-loading.js?v=25';

// Originals and their CC0 provenance are recorded in docs/quality-assets.json.
export async function loadQualityAssets(renderer,onProgress){
  const ids=['chinese_tea_table','chinese_armchair','chinese_cabinet','chinese_console_table','television_02','antique_ceramic_vase_01','potted_plant_01','potted_plant_02'];
  const loader=new GLTFLoader(),models=new Map();let done=0;
  const coarse=matchMedia('(pointer:coarse)').matches;
  if(coarse)loader.register(parser=>{
    // HTML image decoding avoids the mobile ImageBitmap decode path; the same
    // source art, material settings and resolution are retained.
    parser.textureLoader=new THREE.TextureLoader(parser.options.manager);
    parser.textureLoader.setCrossOrigin(parser.options.crossOrigin);
    return{name:'HOME_mobile_image_decoder'};
  });
  async function loadModel(id){const url='assets/runtime/models/'+id+'/'+(id.startsWith('potted_')?'web.glb':'model.gltf');const gltf=await loadAsset(url,()=>loader.loadAsync(url));gltf.scene.traverse(o=>{
    if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;
    for(const m of Array.isArray(o.material)?o.material:[o.material]){m.envMapIntensity=.65;for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key])m[key].anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}
  });
  if(coarse){const textures=[];gltf.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','alphaMap'])textures.push(m[key]);});await limitTextureImages(textures,1024);}
  models.set(id,gltf.scene);onProgress?.(++done/ids.length);}
  if(coarse){for(const id of ids)await loadModel(id);}else await Promise.all(ids.map(loadModel));
  const hdr=await loadAsset('assets/environment/lebombo_1k.hdr',()=>new HDRLoader().loadAsync('assets/environment/lebombo_1k.hdr'));
  hdr.mapping=THREE.EquirectangularReflectionMapping;
  const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(hdr).texture;hdr.dispose();pmrem.dispose();
  const background=await loadAsset('assets/environment/spruit_sunrise_1k.hdr',()=>new HDRLoader().loadAsync('assets/environment/spruit_sunrise_1k.hdr'));background.mapping=THREE.EquirectangularReflectionMapping;
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
