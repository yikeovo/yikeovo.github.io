import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

export function batchLocalRoot(root) {
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert(),pools=new Map();
  root.traverse(object=>{
    if(!object.isMesh||Array.isArray(object.material)||object.material.transparent||object.userData.dynamic)return;
    let parent=object,nested=false;
    while(parent&&parent!==root){if(parent.userData.interaction){nested=true;break;}parent=parent.parent;}
    if(nested)return;
    const key=object.material.uuid+':'+object.castShadow+':'+object.receiveShadow;
    if(!pools.has(key))pools.set(key,[]);
    pools.get(key).push(object);
  });
  for(const objects of pools.values()){
    if(objects.length<2)continue;
    const geometries=objects.map(object=>{
      let geometry=object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld));
      if(geometry.index){const flat=geometry.toNonIndexed();geometry.dispose();geometry=flat;}
      return geometry;
    });
    const geometry=mergeGeometries(geometries,false);geometries.forEach(item=>item.dispose());
    if(!geometry)continue;
    geometry.computeBoundingSphere();
    const batch=new THREE.Mesh(geometry,objects[0].material);
    batch.castShadow=objects[0].castShadow;batch.receiveShadow=objects[0].receiveShadow;
    root.add(batch);objects.forEach(object=>object.removeFromParent());
  }
}

// Keep interactive and moving objects intact. Batch the static architecture by
// room and material so frustum culling still has useful spatial boundaries.
export function batchStaticScene(scene) {
  scene.updateMatrixWorld(true);
  const pools = new Map();
  let before = 0, merged = 0;
  const center = new THREE.Vector3();
  scene.traverse((object) => {
    if (!object.isMesh) return;
    before++;
    if (Array.isArray(object.material) || (object.material.transparent && !(object.userData.ignorePick && object.geometry.type === 'PlaneGeometry')) || object.userData.dynamic) return;
    let node = object;
    while (node && !node.userData.interaction) node = node.parent;
    if (node) return;
    object.getWorldPosition(center);
    const col = center.x < -2.8 ? 0 : center.x > 2.8 ? 2 : 1;
    const row = center.z < -.2 ? 0 : center.z > 6.5 ? 2 : 1;
    const key = [object.material.uuid, col, row,object.userData.architecture?'architecture':'props',object.userData.room||'outside',!!object.userData.noBake,!!object.userData.roof, object.castShadow, object.receiveShadow].join(':');
    if (!pools.has(key)) pools.set(key, []);
    pools.get(key).push(object);
  });
  for (const objects of pools.values()) {
    if (objects.length < 2) continue;
    const geometries = objects.map((object) => {
      let geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      if (geometry.index) { const nonIndexed = geometry.toNonIndexed(); geometry.dispose(); geometry = nonIndexed; }
      return geometry;
    });
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((item) => item.dispose());
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const batch = new THREE.Mesh(geometry, objects[0].material);
    batch.name = 'static-room-batch';
    batch.userData.architecture=objects[0].userData.architecture;
    batch.userData.noBake=objects[0].userData.noBake;
    batch.userData.roof=objects[0].userData.roof;
    batch.userData.room=objects[0].userData.room;
    batch.castShadow = objects[0].castShadow;
    batch.receiveShadow = objects[0].receiveShadow;
    scene.add(batch);
    objects.forEach((object) => object.removeFromParent());
    merged += objects.length - 1;
  }
  return {before,after:before-merged,removedDrawables:merged};
}
