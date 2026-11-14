import {ENTRY,YARD,TOILETS,STAIRS,RAMP,ROOM_AREAS,PORTALS,WINDOWS,FURNITURE as F,MAP_BOUNDS} from './layout.js?v=22';
import {HOME_ACTIVITIES} from './activities.js?v=22';
import {findWalkingRoute} from './walk-route.js?v=22';

const places=[
 {id:'hall',title:'大堂',subtitle:'给爸爸的生日桌',description:'蛋糕和信都在这里。走到桌边，再一起点亮烛光。',point:{x:0,z:5.7},look:[F.birthday.x,1.05,F.birthday.z],birthday:true},
 {id:'living',title:'客厅',subtitle:'坐坐沙发，喝杯热茶',description:'三面花布沙发围着茶几。茶壶、遥控器和窗边的花，都能走近看看。',point:{x:-6.55,z:3.4},look:[-5.3,.7,3.85]},
 {id:'bedroom',title:'西北卧室',subtitle:'书桌上的旧时光',description:'旧相框、绿色台灯和能拉开的抽屉，都在电脑桌旁。',point:{x:-6.7,z:-4.25},look:[-7.8,1,-5.1]},
 {id:'mine',title:'北侧卧室',subtitle:'床和衣柜，还在原处',description:'慢慢看看这个房间，留一点时间给熟悉的角落。',point:{x:1.6,z:-4.6},look:[-.5,.7,-2.42]},
 {id:'kitchen',title:'厨房',subtitle:'下一顿，一起吃什么',description:'走到案板旁，写一道想和爸爸一起吃的家常菜。',point:{x:6.25,z:-2.4},look:[7.8,1,-3.5]},
 {id:'other',title:'东南房间',subtitle:'翻翻家里的旧相册',description:'电脑桌已经移到南墙偏西的位置。桌上的相册，可以一张张翻开。',point:{x:5.45,z:5.25},look:[4.4,1,6.65]},
 {id:'black-room',title:'黑屋',subtitle:'楼梯下面的小房间',description:'从西北卧室衣柜南侧的小门进去，仍旧是地面这一层。',point:{x:-9.05,z:-1.05},look:[-9.05,1.2,-3.2]},
 {id:'outside',title:'院子',subtitle:'推开家门前的那段路',description:'院门在南墙东端，门外是下坡。大堂正门在北边，两间厕所在西南角。',point:{x:-.25,z:9.4},look:[ENTRY.x,1.5,ENTRY.z]},
 {id:'stairs',title:'楼梯口',subtitle:'从这里，自己走上屋顶',description:'西侧的长楼梯通向平屋顶。先陪你到楼梯口，再沿台阶慢慢上去。',point:{x:-9.1,z:9.6},look:[-9.1,2.5,-3]}
];
const activityPlaces={
 tea:{room:'living',point:{x:-6.55,z:3.4},look:[-5.3,.7,3.85]},
 sit:{room:'living',point:{x:-6.75,z:3.85},look:[-7.8,.8,3.9]},
 tv:{room:'living',point:{x:-4.4,z:3.2},look:[-5.45,.58,4.38]},
 water:{room:'living',point:{x:-4.65,z:5.75},look:[-3.75,.7,6.15]},
 drawer:{room:'bedroom',point:{x:-6.7,z:-4.25},look:[-7.78,.57,-4.58]},
 lamp:{room:'bedroom',point:{x:-6.7,z:-4.25},look:[-7.79,1.12,-4.55]}
};
const ns='http://www.w3.org/2000/svg';
function svgNode(tag,attributes={},text){const node=document.createElementNS(ns,tag);for(const [name,value] of Object.entries(attributes))node.setAttribute(name,String(value));if(text!==undefined)node.textContent=text;return node;}
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}

export function createHomeGuide({getWorld,onOpen,onGo}){
 const dialog=document.getElementById('explore-dialog');let tab='rooms',selected=places[0],plan=null,lastFocus=null;
 dialog.innerHTML=`<button id="explore-close" class="guide-close" aria-label="回到屋子里">×</button><header class="guide-heading"><p>回 家 <span>/</span> 老家的方向</p><h2 id="explore-heading">想去哪儿坐坐？</h2><div>点选熟悉的房间，陪你沿着家里的路走过去。</div></header><div class="guide-layout"><figure class="guide-plan"><div class="guide-plan-top"><span>北 ↑</span><span><i></i> 你的位置</span></div><svg id="explore-plan" viewBox="-11.2 -8.4 21.5 26.2" role="group" aria-label="老家平面导览，可以点选房间"></svg><figcaption id="explore-location"></figcaption><div class="guide-legend"><span><i class="legend-wall"></i>墙</span><span><i class="legend-door"></i>门</span><span><i class="legend-route"></i>走过去的路</span></div></figure><section class="guide-options"><div class="guide-tabs" role="tablist" aria-label="选择房间或家里的小事"><button id="guide-rooms-tab" role="tab" aria-selected="true" aria-controls="guide-options-list">逛逛房间</button><button id="guide-activities-tab" role="tab" aria-selected="false" aria-controls="guide-options-list">家里的小事 <span id="guide-done"></span></button></div><div id="guide-options-list" class="guide-options-list" role="tabpanel"></div><div class="guide-selection"><p id="guide-subtitle"></p><h3 id="guide-title"></h3><div id="guide-description"></div><p id="guide-route-status" role="status" aria-live="polite"></p><button id="explore-go" class="guide-go">陪我走过去 <span>↗</span></button><small>途中可点“自己走走”接手，随时停下来。</small></div></section></div><footer class="guide-footer"><div class="guide-mobile-action"><span id="guide-mobile-status"></span><button id="explore-go-mobile" class="guide-go">陪我走过去 <span>↗</span></button></div><span>按记忆重建 · 北上南下</span><button id="explore-return">回屋子，自己走走 →</button></footer>`;
 const $=id=>document.getElementById(id),svg=$('explore-plan'),list=$('guide-options-list');
 function close(){dialog.close();}
 function addRect(parent,x,z,w,d,attributes={}){const n=svgNode('rect',{x,y:z,width:w,height:d,...attributes});parent.append(n);return n;}
 function addLine(parent,x1,z1,x2,z2,attributes={}){parent.append(svgNode('path',{d:`M${x1} ${z1}L${x2} ${z2}`,...attributes}));}
 function text(parent,value,x,z,attributes={}){parent.append(svgNode('text',{x,y:z,'text-anchor':'middle','dominant-baseline':'central',...attributes},value));}
 function draw(){
  const world=getWorld(),active=world.location().id,selectedRoom=selected.room||selected.id;svg.replaceChildren();
  const shapes=svgNode('g',{'class':'plan-surfaces'});svg.append(shapes);
  function area(id,name,bounds){const [l,r,n,s]=bounds,g=svgNode('g',{'data-place':id,role:'button',tabindex:0,'aria-label':'选择'+name,'aria-pressed':String(id===selectedRoom),'class':'plan-room'+(id===selectedRoom?' selected':'')+(id===active?' current':'')});
   addRect(g,l,n,r-l,s-n,{rx:.035});if(id==='black-room'){text(g,'黑',-9.1,-3.2);text(g,'屋',-9.1,-2.6);}else text(g,name,(l+r)/2,(n+s)/2);shapes.append(g);
  }
  area('outside','院子',[YARD.left,YARD.right,YARD.rear,YARD.front]);
  for(const room of ROOM_AREAS)area(room.id,room.name,room.bounds);
  const detail=svgNode('g',{'class':'plan-details','pointer-events':'none'});svg.append(detail);
  for(const [i,t]of TOILETS.entries()){addRect(detail,t.left,t.rear,t.right-t.left,t.front-t.rear,{class:'plan-toilet'});text(detail,i?'新厕':'原厕',(t.left+t.right)/2,(t.rear+t.front)/2,{class:'plan-small-label'});}
  addRect(detail,STAIRS.left,STAIRS.rear,STAIRS.right-STAIRS.left,STAIRS.front-STAIRS.rear,{class:'plan-stairs'});
  for(let i=1;i<STAIRS.steps;i++)addLine(detail,STAIRS.left,STAIRS.rear+i*(STAIRS.front-STAIRS.rear)/STAIRS.steps,STAIRS.right,STAIRS.rear+i*(STAIRS.front-STAIRS.rear)/STAIRS.steps,{class:'plan-tread'});
  text(detail,'楼梯',-10.45,3.7,{class:'plan-small-label',transform:'rotate(-90 -10.45 3.7)'});
  addRect(detail,RAMP.left,RAMP.rear,RAMP.right-RAMP.left,RAMP.front-RAMP.rear,{class:'plan-ramp'});text(detail,'下坡 ↓',6.9,14.5,{class:'plan-small-label'});
  function furniture(p,w,d,kind=''){const g=svgNode('g',{transform:`translate(${p.x} ${p.z}) rotate(${-(p.angle||0)*180/Math.PI})`,class:'plan-furniture'});addRect(g,-w/2,-d/2,w,d,{rx:.06});if(kind==='bed')addLine(g,-w/2+.08,-d/2+.08,w/2-.08,-d/2+.08,{class:'plan-headboard'});detail.append(g);}
  for(const p of [...F.livingSofas,...F.hallSofas])furniture(p,p.size[0],p.size[2]);for(const p of[F.northwestBed,F.northBed,F.southeastBed])furniture(p,1.65,2.15,'bed');
  for(const p of[F.northwestDesk,F.southeastDesk])furniture(p,1.9,.75);furniture(F.northwestWardrobe,1.5,.55);furniture(F.northWardrobe,1.6,.55);furniture(F.livingTea,1.15,1.65);furniture(F.birthday,1.3,.9);furniture(F.kitchenCounter,4.85,.8);for(const p of[F.livingTV,F.hallTV])furniture(p,p.size[0],p.size[2]);
  const openings=svgNode('g',{'class':'plan-openings','pointer-events':'none'});svg.append(openings);
  for(const p of [...PORTALS,YARD.gate,...TOILETS.map(t=>({axis:'x',fixed:t.rear,center:(t.left+t.right)/2,width:.8}))]){const from=p.center-p.width/2,to=p.center+p.width/2;addLine(openings,p.axis==='x'?from:p.fixed,p.axis==='x'?p.fixed:from,p.axis==='x'?to:p.fixed,p.axis==='x'?p.fixed:to,{class:'plan-door'});}
  for(const p of WINDOWS)addLine(openings,p.center-p.width/2,p.fixed,p.center+p.width/2,p.fixed,{class:'plan-window'});
  // Put labels above the furniture while preserving each room's tap target.
  for(const g of shapes.children)for(const label of g.querySelectorAll('text')){const clone=label.cloneNode(true);clone.setAttribute('class',label.getAttribute('class')||'plan-label');clone.setAttribute('pointer-events','none');svg.append(clone);label.setAttribute('opacity','0');}
  if(plan){svg.append(svgNode('path',{d:plan.points.map((p,i)=>(i?'L':'M')+p.x+' '+p.z).join(' '),class:'plan-route','pointer-events':'none'}));svg.append(svgNode('circle',{cx:selected.point.x,cy:selected.point.z,r:.22,class:'plan-destination','pointer-events':'none'}));}
  const marker=svgNode('g',{transform:`translate(${world.camera.position.x} ${world.camera.position.z}) rotate(${-world.camera.rotation.y*180/Math.PI})`,'pointer-events':'none',class:'plan-position'});marker.append(svgNode('circle',{r:.52}),svgNode('path',{d:'M0 -.44L-.29 .32L0 .17L.29 .32Z'}));svg.append(marker);
  $('explore-location').textContent='现在在这里 · '+world.location().name;
 }
 function choose(place){
  selected=place;const world=getWorld(),position=world.activities.standingPosition,start={x:position.x,z:position.z};
  const t=performance.now();plan=world.elevation>.3?null:findWalkingRoute(start,place.point,(x,z)=>world.isGroundWalkable(x,z,{ignoreDoors:true,margin:Math.hypot(x-start.x,z-start.z)<.18?0:.05}),MAP_BOUNDS);const ms=performance.now()-t;
  $('guide-title').textContent=place.title;$('guide-subtitle').textContent=place.subtitle||place.roomName;$('guide-description').textContent=place.description;
  const status=world.elevation>.3?'先沿楼梯回到院子，再陪你去别的房间。':plan?plan.length<.45?'已经在附近了，转过身就能看看。':'从这里过去约 '+Math.max(1,Math.round(plan.length/1.8+plan.points.length*.55))+' 秒':'这边暂时走不过去，先回到房间中间再试试。';
  $('guide-route-status').textContent=status;$('guide-mobile-status').textContent=place.title+' · '+status;
  for(const id of ['explore-go','explore-go-mobile']){const go=$(id);go.disabled=!plan;go.firstChild.textContent=place.birthday?'陪我去生日桌 ':plan?.length<.45?'转身看看这里 ':'陪我走过去 ';}
  for(const button of list.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.destination===place.id));draw();
  state={selected:place.id,tab,route:plan,destination:place,planningMs:ms};
 }
 function renderList(){
  list.replaceChildren();list.classList.toggle('activity-options',tab==='activities');
  $('guide-rooms-tab').setAttribute('aria-selected',String(tab==='rooms'));$('guide-activities-tab').setAttribute('aria-selected',String(tab==='activities'));list.setAttribute('aria-labelledby',tab==='rooms'?'guide-rooms-tab':'guide-activities-tab');
  const world=getWorld(),done=new Set(world.activities.completed);$('guide-done').textContent=done.size+' / '+HOME_ACTIVITIES.length;
  const options=tab==='rooms'?places:HOME_ACTIVITIES.map(a=>({id:'activity-'+a.id,action:a.id,title:a.title,roomName:a.room,description:a.hint,subtitle:a.room+' · '+(done.has(a.id)?'已经做过，还可以再来一次':'留一点时间，做件小事'),...activityPlaces[a.id]}));
  for(const [i,place]of options.entries()){const b=node('button','guide-place');b.type='button';b.dataset.destination=place.id;b.setAttribute('aria-pressed','false');b.append(node('span','guide-place-index',place.action?(done.has(place.action)?'✓':'○'):String(i+1).padStart(2,'0')),node('span','',place.title));b.addEventListener('click',()=>choose(place));list.append(b);}
  choose(options.find(p=>p.id===selected.id)||options[0]);
 }
 function selectMap(id){const place=places.find(p=>p.id===id);if(!place)return;tab='rooms';selected=place;renderList();}
 svg.addEventListener('click',event=>{const id=event.target.closest('[data-place]')?.dataset.place;if(id)selectMap(id);});
 svg.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const id=event.target.closest('[data-place]')?.dataset.place;if(id){event.preventDefault();selectMap(id);svg.querySelector('[data-place="'+id+'"]').focus();}});
 for(const [id,value]of[['guide-rooms-tab','rooms'],['guide-activities-tab','activities']])$(id).addEventListener('click',()=>{tab=value;renderList();});
 for(const id of ['guide-rooms-tab','guide-activities-tab'])$(id).addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const target=event.key==='Home'?'guide-rooms-tab':event.key==='End'?'guide-activities-tab':id==='guide-rooms-tab'?'guide-activities-tab':'guide-rooms-tab';$(target).click();$(target).focus();});
 $('explore-close').addEventListener('click',close);$('explore-return').addEventListener('click',close);
 for(const id of ['explore-go','explore-go-mobile'])$(id).addEventListener('click',()=>{if(!plan)return;const route=plan,place=selected;close();onGo(route,place);});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('explore-open');document.getElementById('map-toggle').setAttribute('aria-expanded','false');lastFocus?.focus({preventScroll:true});});
 let state={};
 return{open(section='rooms'){lastFocus=document.activeElement;onOpen();tab=section;renderList();dialog.showModal();dialog.scrollTop=0;document.body.classList.add('explore-open');document.getElementById('map-toggle').setAttribute('aria-expanded','true');},get state(){return state;}};
}
