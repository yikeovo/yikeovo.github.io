// A floor route is planned with the same clearance checks used by real walking.
// Stairs are excluded: the room below them is a separate ground-floor surface.
export function findWalkingRoute(start,goal,canWalk,bounds){
  const step=.14,[left,right,rear,front]=bounds,nx=Math.ceil((right-left)/step)+1,nz=Math.ceil((front-rear)/step)+1,count=nx*nz;
  if(![start.x,start.z,goal.x,goal.z].every(Number.isFinite))return null;
  const point=id=>({x:left+(id%nx)*step,z:rear+Math.floor(id/nx)*step});
  const cache=new Int8Array(count);
  function valid(id){if(!cache[id]){const p=point(id);cache[id]=canWalk(p.x,p.z)?1:-1;}return cache[id]===1;}
  function clear(a,b){const samples=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.055));for(let i=0;i<=samples;i++){const t=i/samples;if(!canWalk(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;}
  function nearest(p){let best=-1,distance=Infinity;const x=Math.round((p.x-left)/step),z=Math.round((p.z-rear)/step);for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){const a=x+dx,b=z+dz;if(a<0||a>=nx||b<0||b>=nz)continue;const id=b*nx+a,q=point(id),d=Math.hypot(q.x-p.x,q.z-p.z);if(d<distance&&valid(id)&&clear(p,q)){best=id;distance=d;}}return best;}
  if(!canWalk(start.x,start.z)||!canWalk(goal.x,goal.z))return null;
  const first=nearest(start),last=nearest(goal);if(first<0||last<0)return null;
  const costs=new Float32Array(count).fill(Infinity),parents=new Int32Array(count).fill(-1),closed=new Uint8Array(count),heap=[];
  function push(id,score){const item={id,score};let i=heap.length;heap.push(item);while(i){const parent=(i-1)>>1;if(heap[parent].score<=score)break;heap[i]=heap[parent];i=parent;}heap[i]=item;}
  function pop(){const result=heap[0],tail=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=tail.score)break;heap[i]=heap[child];i=child;}heap[i]=tail;}return result.id;}
  const target=point(last),heuristic=id=>{const p=point(id);return Math.hypot(p.x-target.x,p.z-target.z);};costs[first]=0;push(first,heuristic(first));
  while(heap.length){const id=pop();if(closed[id])continue;closed[id]=1;if(id===last)break;const x=id%nx,z=Math.floor(id/nx);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const a=x+dx,b=z+dz;if(a<0||a>=nx||b<0||b>=nz)continue;const next=b*nx+a;if(closed[next]||!valid(next))continue;
      if(dx&&dz&&(!valid(z*nx+a)||!valid(b*nx+x)))continue;
      const cost=costs[id]+step*Math.hypot(dx,dz);if(cost>=costs[next])continue;parents[next]=id;costs[next]=cost;push(next,cost+heuristic(next));
    }
  }
  if(!closed[last])return null;
  const ids=[];for(let at=last;at>=0;at=parents[at])ids.push(at);ids.reverse();
  const raw=[start,...ids.map(point),goal],corners=[raw[0]];
  for(let i=1;i<raw.length-1;i++){const a=raw[i-1],b=raw[i],c=raw[i+1],cross=(b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x);if(Math.abs(cross)>.00001)corners.push(b);}
  corners.push(goal);const route=[start];let at=0;
  while(at<corners.length-1){let next=corners.length-1;while(next>at+1&&!clear(corners[at],corners[next]))next--;if(!clear(corners[at],corners[next]))return null;route.push(corners[next]);at=next;}
  return{points:route,length:route.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route[i].x,p.z-route[i].z),0)};
}

export function createRoomGuide({world,onUpdate,onFinish,onCancel}){
  let route=null,destination=null,index=1,running=false,elapsed=0,travelled=0,blocked=0,lastUpdate=-1;
  const look=world.camera.clone(false);
  function cancel(reason='user'){if(!running)return;running=false;onCancel(reason);}
  return{
    start(plan,place){route=plan;destination=place;index=1;elapsed=travelled=blocked=0;lastUpdate=-1;running=true;if(world.activities.seated)world.activities.stand();},
    cancel,
    tick(delta){if(!running)return;elapsed+=delta;if(elapsed>90){cancel('blocked');return;}
      const camera=world.camera,gate=world.layout.YARD.gate,entry=world.layout.ENTRY;
      if(Math.hypot(camera.position.x-gate.center,camera.position.z-gate.fixed)<3)world.openGate();
      if(Math.hypot(camera.position.x-entry.x,camera.position.z-entry.z)<3)world.openDoor();
      if(index>=route.points.length){look.position.copy(camera.position);look.lookAt(...destination.look);camera.quaternion.slerp(look.quaternion,1-Math.exp(-5*delta));if(camera.quaternion.angleTo(look.quaternion)<.025){running=false;onFinish(destination);}return;}
      const goal=route.points[index],dx=goal.x-camera.position.x,dz=goal.z-camera.position.z,distance=Math.hypot(dx,dz);
      if(distance<.012){index++;return;}
      look.position.copy(camera.position);look.lookAt(camera.position.x+dx/distance*2,camera.position.y-.1,camera.position.z+dz/distance*2);camera.quaternion.slerp(look.quaternion,1-Math.exp(-6*delta));
      if(camera.quaternion.angleTo(look.quaternion)<.5){const speed=Math.min(1.8,Math.max(.5,distance*3)),step=Math.min(distance,speed*delta),x=camera.position.x,z=camera.position.z;world.move(dx/distance*step,dz/distance*step);const moved=Math.hypot(camera.position.x-x,camera.position.z-z);travelled+=moved;blocked=moved<step*.15?blocked+delta:0;if(blocked>2){cancel('blocked');return;}}
      if(elapsed-lastUpdate>.12){lastUpdate=elapsed;onUpdate({title:'去'+destination.title,description:'沿着熟悉的路走过去，随时可以自己接着走。',progress:Math.min(1,travelled/Math.max(route.length,.01))});}
    },
    get running(){return running;},
    get state(){return{running,index,elapsed,travelled,destination:destination?.id,points:route?.points??[]};}
  };
}
