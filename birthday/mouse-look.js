export function createMouseLook(canvas,{enabled,camera,activate,onState,onMove}){
  const desktop=matchMedia('(pointer:fine)').matches;
  let state='released',hover=false,lastX=null,lastY=null,requested=false;
  const setState=value=>{state=value;document.body.classList.toggle('mouse-locked',value==='locked');document.body.classList.toggle('mouse-released',desktop&&value==='released');onState?.(value);};
  function rotate(dx,dy){
    if(!enabled())return;
    camera().rotation.y-=Math.max(-400,Math.min(400,dx))*.0024;
    camera().rotation.x=Math.max(-1.15,Math.min(1.02,camera().rotation.x-dy*.0024));
    onMove?.();
  }
  function fallback(){requested=false;hover=true;setState('hover');}
  function request(){
    if(!desktop||!enabled())return;
    lastX=lastY=null;
    if(hover||!canvas.requestPointerLock){fallback();return;}
    if(requested||document.pointerLockElement===canvas)return;
    requested=true;
    try{const result=canvas.requestPointerLock();result?.catch(fallback);}catch{fallback();}
  }
  function release(){lastX=lastY=null;if(document.pointerLockElement===canvas)document.exitPointerLock();}
  document.addEventListener('pointerlockchange',()=>{requested=false;lastX=lastY=null;setState(document.pointerLockElement===canvas?'locked':hover?'hover':'released');});
  document.addEventListener('pointerlockerror',fallback);
  document.addEventListener('mousemove',event=>{
    if(!desktop||!enabled())return;
    if(document.pointerLockElement===canvas){rotate(event.movementX,event.movementY);return;}
    if(hover&&event.target===canvas){if(lastX!==null)rotate(event.clientX-lastX,event.clientY-lastY);lastX=event.clientX;lastY=event.clientY;}
  });
  canvas.addEventListener('mouseleave',()=>{lastX=lastY=null;});
  canvas.addEventListener('pointerdown',event=>{
    if(!desktop||event.pointerType!=='mouse'||!enabled())return;
    if(event.button!==0)return;
    if(document.pointerLockElement===canvas)activate();
    else if(hover)activate(event.clientX,event.clientY);
    else request();
  });
  if(desktop)document.body.classList.add('desktop-mouse-look');
  return{desktop,request,release,get state(){return state;}};
}
