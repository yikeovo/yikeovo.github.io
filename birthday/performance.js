import * as THREE from './vendor/three.module.js';

export function supportsHardwareAA(){
  const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{antialias:false,powerPreference:'high-performance'});
  if(!gl)return false;
  const ext=gl.getExtension('WEBGL_debug_renderer_info'),name=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'';
  const hardware=!/SwiftShader|llvmpipe|software|Basic Render Driver/i.test(name);
  gl.getExtension('WEBGL_lose_context')?.loseContext();return hardware;
}

// A software WebGL driver cannot afford the PBR fragment shader. Its fallback
// retains the actual Cycles light UVs, albedo, AO, tone mapping and geometry.
// Hardware rendering continues to use the existing PBR materials.
export function prepareSoftwareMaterials(scene,lamp){
  const cache=new Map(),position=new THREE.Vector3();lamp.getWorldPosition(position);
  const uniforms={homeLampPosition:{value:position},homeLampPower:{value:0}};
  scene.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material))return;
    const source=o.material;if(!source.isMeshStandardMaterial||source.transparent)return;
    // Keep moving light sources and the green lamp's emissive response intact.
    if(o.userData.dynamic&&!source.lightMap)return;
    if(!cache.has(source)){
      const material=new THREE.MeshBasicMaterial({color:source.color,map:source.map,lightMap:source.lightMap,lightMapIntensity:source.lightMapIntensity,aoMap:source.aoMap,aoMapIntensity:source.aoMapIntensity,alphaMap:source.alphaMap,alphaTest:source.alphaTest,side:source.side,toneMapped:source.toneMapped,fog:source.fog});
      material.userData={...source.userData,softwareBaked:true};
      if(!source.lightMap)material.color.multiplyScalar(source.emissive?.getHex()?1:.52);
      const detail=source.userData.albedoDetail;
      material.onBeforeCompile=shader=>{
        Object.assign(shader.uniforms,uniforms);
        shader.vertexShader='varying vec3 homePosition;\nvarying vec3 homeNormal;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nhomePosition=(modelMatrix*vec4(transformed,1.0)).xyz;homeNormal=normalize(mat3(modelMatrix)*normal);');
        shader.fragmentShader='uniform vec3 homeLampPosition;uniform float homeLampPower;varying vec3 homePosition;varying vec3 homeNormal;\n'+shader.fragmentShader;
        if(detail!==undefined)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuse,diffuseColor.rgb,'+detail.toFixed(4)+');');
        shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = reflectedLight.indirectDiffuse;','vec3 lampDelta=homeLampPosition-homePosition;float lampDistance=length(lampDelta);float lampDiffuse=max(0.0,dot(normalize(homeNormal),normalize(lampDelta)));\nvec3 outgoingLight=reflectedLight.indirectDiffuse+diffuseColor.rgb*vec3(1.0,.77,.43)*homeLampPower*lampDiffuse*pow(max(0.0,1.0-lampDistance/2.3),2.0)/(lampDistance*lampDistance+.2);');
      };
      material.customProgramCacheKey=()=> 'home-software-baked:'+detail;
      cache.set(source,material);
    }
    o.material=cache.get(source);
  });
  return{materials:cache.size,update(){uniforms.homeLampPower.value=lamp.intensity*.22;}};
}

export async function warmRenderer(renderer,scene,camera,onProgress,lamp,extraLight){
  await renderer.compileAsync(scene,camera);
  if(lamp){lamp.visible=true;await renderer.compileAsync(scene,camera);if(extraLight){extraLight.visible=true;await renderer.compileAsync(scene,camera);extraLight.visible=false;}lamp.visible=false;}
  const textures=new Set();scene.traverse(o=>{if(o.isMesh)for(const material of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(material))if(value?.isTexture)textures.add(value);});
  let count=0;for(const texture of textures){renderer.initTexture(texture);if(++count%3===0){onProgress?.(count/textures.size);await new Promise(resolve=>setTimeout(resolve,0));}}
  return{textures:textures.size,programs:renderer.info.programs.length};
}
