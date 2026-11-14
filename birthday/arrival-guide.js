// A short optional walk along the actual courtyard and front doorway.
import {YARD,ENTRY,START} from './layout.js?v=22';
export function createArrivalGuide({world,onUpdate,onFinish,onCancel}){
  const route=[{x:YARD.gate.center,z:10.8,stage:0},{x:ENTRY.x,z:10.8,stage:1},{x:ENTRY.x,z:8.5,stage:1},{x:ENTRY.x,z:5.8,stage:2}];
  const chapters=[['沿坡回家','走上坡，推开院门。'],['穿过院子','再往前，就是大堂。'],['到家了','桌上有一份给你的生日惊喜。']];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,look=world.camera.clone(false);
  let running=false,index=0,elapsed=0,blocked=0,travelled=0,lastUpdate=-1,arrived=false;
  const total=route.reduce((sum,p,i)=>{const prev=i?route[i-1]:{x:START.position[0],z:START.position[2]};return sum+Math.hypot(p.x-prev.x,p.z-prev.z);},0);
  function finish(){running=false;arrived=true;world.camera.lookAt(world.birthdayTarget);world.requestRender();onFinish();}
  function cancel(reason='user'){if(!running)return;running=false;onCancel(reason);}
  return{
    start(){index=0;elapsed=blocked=travelled=0;lastUpdate=-1;arrived=false;running=true;world.openGate();if(reduced){world.openDoor();if(world.positionOnGround(-.25,5.8))finish();else cancel('blocked');}},
    cancel,
    tick(delta){if(!running)return;elapsed+=delta;if(elapsed>35){cancel('blocked');return;}const goal=route[index];
      if(index>=2&&world.camera.position.z<9.3)world.openDoor();
      const dx=goal.x-world.camera.position.x,dz=goal.z-world.camera.position.z,distance=Math.hypot(dx,dz);
      if(distance<.045){index++;if(index===route.length){finish();return;}return;}
      look.position.copy(world.camera.position);look.lookAt(world.camera.position.x+dx/distance*2,world.camera.position.y-.15,world.camera.position.z+dz/distance*2);world.camera.quaternion.slerp(look.quaternion,1-Math.exp(-5*delta));
      const turning=world.camera.quaternion.angleTo(look.quaternion)>.42,waiting=index===0&&!world.gateOpen||index===3&&!world.doorOpen;
      if(!turning&&!waiting){const step=Math.min(distance,Math.max(.45,Math.min(1.8,distance*2.2))*delta),x=world.camera.position.x,z=world.camera.position.z;world.move(dx/Math.max(distance,.001)*step,dz/Math.max(distance,.001)*step);const moved=Math.hypot(world.camera.position.x-x,world.camera.position.z-z);travelled+=moved;blocked=moved<step*.15&&distance>.05?blocked+delta:0;if(blocked>1.5){cancel('blocked');return;}}
      if(elapsed-lastUpdate>.10){lastUpdate=elapsed;const c=chapters[route[Math.min(index,route.length-1)].stage];onUpdate({title:c[0],description:c[1],progress:Math.min(1,travelled/total)});}
    },
    get running(){return running;},get state(){return{running,arrived,index,elapsed,travelled,reduced};}
  };
}
