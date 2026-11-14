import * as THREE from './vendor/three.module.js';
const MAGIC=0x344c4248;
function entries(scene){const result=[];scene.updateMatrixWorld(true);scene.traverse(object=>{if(object.isMesh&&!Array.isArray(object.material)&&object.material.isMeshStandardMaterial)result.push(object);});return result;}
function distanceToBox(x,y,z,dx,dy,dz,b,max){
  if(x>b[0]&&x<b[3]&&y>b[1]&&y<b[4]&&z>b[2]&&z<b[5])return max;
  let lo=0,hi=max;
  for(let i=0;i<3;i++){
    const origin=i===0?x:i===1?y:z,direction=i===0?dx:i===1?dy:dz;
    if(Math.abs(direction)<1e-7){if(origin<b[i]||origin>b[i+3])return max;continue;}
    let a=(b[i]-origin)/direction,c=(b[i+3]-origin)/direction;
    if(a>c)[a,c]=[c,a];lo=Math.max(lo,a);hi=Math.min(hi,c);if(lo>hi)return max;
  }
  return lo<max?lo:max;
}
export function generateLighting(scene,colliders,wallBounds,lamps){
  const boxes=colliders.map(b=>[b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z]);
  const shadeBoxes=wallBounds.map(b=>[b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z]);
  shadeBoxes.push([-8.6,3.12,-6.6,8.6,3.32,6.6]);
  const objects=entries(scene),arrays=[],cache=new Map(),p=new THREE.Vector3(),n=new THREE.Vector3();
  const sun=new THREE.Vector3(-12,16,18).normalize();
  for(const object of objects){
    const geometry=object.geometry,positions=geometry.attributes.position,normals=geometry.attributes.normal,color=new Uint8Array(positions.count*3);
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
    for(let i=0;i<positions.count;i++){
      p.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);n.fromBufferAttribute(normals,i).applyMatrix3(normalMatrix).normalize();
      const key=[p.x,p.y,p.z,n.x,n.y,n.z].map(v=>Math.round(v*40)).join(',');
      let rgb=cache.get(key);
      if(!rgb){
        let ambient=.68+.13*n.y,occlusion=0;
        const ox=p.x+n.x*.045,oy=p.y+n.y*.045,oz=p.z+n.z*.045;
        const directions=[[n.x,n.y,n.z],[n.x*.75,n.y*.75+.65,n.z*.75],[n.x+.5,n.y+.3,n.z-.4],[n.x-.5,n.y+.3,n.z+.4]];
        for(const d of directions){const length=Math.hypot(...d)||1;let hit=1.15;for(const b of boxes)hit=Math.min(hit,distanceToBox(ox,oy,oz,d[0]/length,d[1]/length,d[2]/length,b,hit));occlusion+=1-hit/1.15;}
        ambient*=1-occlusion/directions.length*.37;
        let sunlight=Math.max(0,n.dot(sun))*.36;
        if(sunlight>.01)for(const b of shadeBoxes)if(distanceToBox(ox,oy,oz,sun.x,sun.y,sun.z,b,30)<29.9){sunlight=0;break;}
        let lampLight=0;
        for(const lamp of lamps){const dx=lamp.x-p.x,dy=lamp.y-p.y,dz=lamp.z-p.z,d2=dx*dx+dy*dy+dz*dz;if(d2<13)lampLight+=Math.max(0,(dx*n.x+dy*n.y+dz*n.z)/Math.sqrt(d2+.01))*.65/(1+d2*.5);}
        const heightShade=.94+.06*Math.min(1,Math.max(0,p.y)/1.5);
        rgb=[Math.min(1,(ambient+sunlight+lampLight)*heightShade),Math.min(1,(ambient*.98+sunlight*.94+lampLight*.93)*heightShade),Math.min(1,(ambient*.93+sunlight*.78+lampLight*.78)*heightShade)].map(v=>Math.round(v*255));
        cache.set(key,rgb);
      }
      color.set(rgb,i*3);
    }
    arrays.push(color);
  }
  const header=new Uint32Array(2+arrays.length);header[0]=MAGIC;header[1]=arrays.length;arrays.forEach((a,i)=>header[i+2]=a.length);
  const output=new Uint8Array(header.byteLength+arrays.reduce((s,a)=>s+a.length,0));output.set(new Uint8Array(header.buffer));let cursor=header.byteLength;
  arrays.forEach(a=>{output.set(a,cursor);cursor+=a.length;});
  return output;
}
export function applyLighting(scene,binary){
  const objects=entries(scene);let arrays=null;
  if(binary){const header=new DataView(binary);if(header.getUint32(0,true)===MAGIC&&header.getUint32(4,true)===objects.length){let cursor=(2+objects.length)*4;arrays=objects.map((object,i)=>{const length=header.getUint32((2+i)*4,true);if(length!==object.geometry.attributes.position.count*3)throw new Error('Lighting mesh mismatch');const array=new Uint8Array(binary,cursor,length);cursor+=length;return array;});}}
  const materials=new Map();
  objects.forEach((object,index)=>{
    const source=object.material;
    if(!materials.has(source)){
      const material=new THREE.MeshBasicMaterial({map:source.map,color:source.color,transparent:source.transparent,opacity:source.opacity,side:source.side,depthWrite:source.depthWrite,vertexColors:!source.transparent});
      if(source.emissiveIntensity>0&&source.emissive?.getHex())material.color.copy(source.color).add(source.emissive.clone().multiplyScalar(Math.min(1,source.emissiveIntensity)));
      materials.set(source,material);
    }
    if(!source.transparent){
      object.geometry=object.geometry.clone();
      const colors=arrays?.[index]||new Uint8Array(object.geometry.attributes.position.count*3).fill(210);
      object.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3,true));
    }
    object.material=materials.get(source);
  });
  return{meshes:objects.length,precomputed:!!arrays,bytes:binary?.byteLength||0};
}
