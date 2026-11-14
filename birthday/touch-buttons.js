// Some mobile engines suppress compatibility clicks after a multi-touch look
// gesture. Activate a short button tap on pointerup and consume its later
// compatibility click, so controls remain responsive and never fire twice.
export function installTouchButtons(){
  const touches=new Map(),suppressed=new WeakMap();let lastTap=null;
  document.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch')return;
    const button=event.target.closest?.('button');
    if(button&&!button.disabled)touches.set(event.pointerId,{button,x:event.clientX,y:event.clientY,moved:false});
  },true);
  document.addEventListener('pointermove',event=>{
    const touch=touches.get(event.pointerId);
    if(touch&&Math.hypot(event.clientX-touch.x,event.clientY-touch.y)>12)touch.moved=true;
  },true);
  document.addEventListener('pointercancel',event=>touches.delete(event.pointerId),true);
  document.addEventListener('pointerup',event=>{
    const touch=touches.get(event.pointerId);touches.delete(event.pointerId);
    if(!touch||touch.moved||touch.button.disabled||event.target.closest?.('button')!==touch.button)return;
    suppressed.set(touch.button,performance.now()+650);
    lastTap={x:event.clientX,y:event.clientY,until:performance.now()+650};
    event.preventDefault();touch.button.click();
  },{capture:true,passive:false});
  document.addEventListener('click',event=>{
    if(!event.isTrusted)return;
    const touchClick=!('pointerType' in event)||event.pointerType==='touch'||event.sourceCapabilities?.firesTouchEvents;
    if(touchClick&&lastTap&&lastTap.until>performance.now()&&Math.hypot(event.clientX-lastTap.x,event.clientY-lastTap.y)<30){event.preventDefault();event.stopImmediatePropagation();return;}
    const button=event.target.closest?.('button');
    if(button&&(suppressed.get(button)||0)>performance.now()){event.preventDefault();event.stopImmediatePropagation();}
  },true);
}
