import * as THREE from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';

// Reconstructed objects, not photograph cut-outs. Their footprints stay equal
// to the furniture dimensions confirmed on the user's plan.
export function createMemorySofa(dimensions,m){
  const [w,h,d]=dimensions,root=new THREE.Group();root.userData.asset='reference-fabric-sofa';
  const add=(geometry,material,x,y,z,parent=root)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  function padded(a,b,c,x,y,z,r=.065,parent=root){
    const geometry=new RoundedBoxGeometry(a,b,c,3,Math.min(r,a/3,b/3,c/3));
    const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
    for(let i=0;i<p.count;i++){
      const px=p.getX(i)+x,py=p.getY(i)+y,pz=p.getZ(i)+z;
      if(Math.abs(n.getY(i))>.65)uv.setXY(i,px/1.4+.5,-pz/.9+.5);
      else if(Math.abs(n.getX(i))>.65)uv.setXY(i,pz/.9+.5,py/.9+.16);
      else uv.setXY(i,px/1.4+.5,py/.9+.16);
    }
    return add(geometry,m.sofaFabric,x,y,z,parent);
  }
  const box=(a,b,c,mat,x,y,z)=>add(new THREE.BoxGeometry(a,b,c),mat,x,y,z);
  for(const x of[-w*.40,w*.40])for(const z of[-d*.32,d*.32])box(.085,.11,.085,m.darkWood,x,.055,z);
  padded(w-.035,.28,d-.05,0,.26,0,.055);
  padded(w-.11,h*.57,.21,0,h*.69,-d*.35,.075).rotation.x=-.10;
  const seatW=(w-.36)/3,seatY=h*.43;
  function seam(width,depth,x,y,z){
    const points=[],r=.042,halfW=width/2-r,halfD=depth/2-r;
    for(let corner=0;corner<4;corner++){const angle=corner*Math.PI/2;for(let j=0;j<=5;j++){const a=angle+j*Math.PI/10;points.push(new THREE.Vector3((corner===0||corner===3?halfW:-halfW)+Math.cos(a)*r,y,(corner<2?halfD:-halfD)+Math.sin(a)*r));}}
    const curve=new THREE.CatmullRomCurve3(points,true);add(new THREE.TubeGeometry(curve,48,.0026,5,true),m.sofaPiping,x,0,z);
  }
  for(let i=0;i<3;i++){
    const x=(i-1)*seatW;
    padded(seatW-.012,.17,d*.74,x,seatY,d*.07,.066);
    seam(seatW-.03,d*.71,x,seatY+.068,d*.07);
  }
  for(const side of[-1,1])padded(.19,h*.44,d*.91,side*(w/2-.095),h*.52,.012,.077);
  // The throw hangs softly over the front; small pleats are actual geometry.
  const positions=[],uv=[],indices=[],nx=60,ny=10;
  for(let row=0;row<=ny;row++)for(let col=0;col<=nx;col++){
    const u=col/nx,v=row/ny,x=(u-.5)*(w-.08),y=.115+v*.255;
    positions.push(x,y,d*.49+Math.sin(u*42)*.012*(1-v));uv.push(x/1.4+.5,y/.9+.16);
    if(row<ny&&col<nx){const a=row*(nx+1)+col;indices.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}
  }
  const throwGeometry=new THREE.BufferGeometry();throwGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));throwGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));throwGeometry.setIndex(indices);throwGeometry.computeVertexNormals();add(throwGeometry,m.sofaFabric,0,0,0);
  return root;
}

export function createMemoryDoorLeaf({pivot,side,width:w,materials:m}){
  const add=(geometry,material,x,y,z,parent=pivot)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const box=(a,b,c,x,y,z,material=m.memoryPaint)=>add(new THREE.BoxGeometry(a,b,c),material,x,y,z);
  const center=-side*w/2,xAt=u=>-side*u;
  // Solid vertical boards below, open slim grilles above the middle rail.
  const inner=w-.095,board=inner/4;
  for(let i=0;i<4;i++)box(board-.003,1.45,.055,center+(i-1.5)*board,.755,0);
  for(const u of[.035,w-.035])box(.065,2.40,.09,xAt(u),1.22,0);
  for(const [y,height]of[[.045,.075],[.68,.055],[1.48,.073],[2.40,.075]])box(w-.015,height,.095,center,y,.012);
  for(let i=1;i<=5;i++){
    const u=.068+(w-.136)*i/6,x=xAt(u);
    box(.023,.87,.045,x,1.935,0);
    if(i%2===0)box((w-.136)/6+.018,.022,.045,xAt(u-(w-.136)/12),2.01,0);
  }
  // Iron hinge collars on the outside stile remain attached while opening.
  for(const y of[.29,1.23,2.15]){const hinge=add(new THREE.CylinderGeometry(.014,.014,.12,10),m.memoryBronze,xAt(.01),y,.02);hinge.rotation.z=0;}
  if(side===1){
    const x=xAt(w-.21),plate=new THREE.Group();plate.position.set(x,1.19,.065);pivot.add(plate);
    const shape=new THREE.Shape();for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,r=i%2?.043:.049;const px=Math.cos(a)*r,py=Math.sin(a)*r*1.15;i?shape.lineTo(px,py):shape.moveTo(px,py);}shape.closePath();
    add(new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1,steps:1}),m.memoryBronze,0,.034,0,plate);
    const relief=(rx,ry,rz,px,py,pz)=>{const object=add(new THREE.SphereGeometry(1,12,8),m.memoryBronze,px,py,pz,plate);object.scale.set(rx,ry,rz);};
    relief(.026,.027,.012,0,.038,.012);relief(.014,.009,.009,-.014,.053,.023);relief(.014,.009,.009,.014,.053,.023);relief(.012,.011,.014,0,.026,.026);
    for(const sign of[-1,1])relief(.010,.014,.008,sign*.029,.043,.012);
    const ring=add(new THREE.TorusGeometry(.036,.006,8,28),m.memoryBronze,0,-.016,.027,plate);ring.rotation.x=.16;
    for(const y of[1.18,1.39]){const lock=add(new THREE.CylinderGeometry(.023,.024,.019,20),m.memoryBronze,xAt(w-.082),y,.067);lock.rotation.x=Math.PI/2;}
  }else{
    box(.015,.16,.025,xAt(w-.07),1.25,.067,m.memoryBronze);
  }
}
