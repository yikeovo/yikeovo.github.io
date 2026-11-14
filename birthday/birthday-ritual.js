export function createBirthdayRitual({getWorld,content,onOpen,onPhoto,onClose}){
  const $=id=>document.getElementById(id),dialog=$('birthday-dialog');let phase='unlit',out=new Set(),busy=false;const timers=new Set();
  $('birthday-date-value').textContent=content.date.split('.').join(' · ');
  $('wish-dedication').textContent='FOR DAD · '+content.date;
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);};
  const cancel=()=>{for(const id of timers)clearTimeout(id);timers.clear();busy=false;};
  const acts={ember:['01 / 一盏光，赴一场约','这一次，换我们为你点亮星光。','把心愿留给烛光，把惊喜留给你。'],memories:['02 / 时光的回廊','那些一起走过的日子，都在发光。','一张合照，一段平常却珍贵的时光。'],words:['03 / 万千星光，只为你','今天，所有的祝福都奔向你。','愿以后的每一年，我们都在你身边。'],fireworks:['04 / 为你盛放','爸，生日快乐。','灯火长明，平安常伴，岁岁有家。']};
  function pauseUI(value){$('wish-pause').setAttribute('aria-pressed',String(value));$('wish-pause').textContent=value?'▶ 继续':'Ⅱ 暂停';$('wish-pause').setAttribute('aria-label',value?'继续生日演出':'暂停生日演出');$('wish-show').dataset.paused=String(value);$('wish-charge').disabled=value;if(value){getWorld()?.cancelBirthdayCharge();chargePointer=null;chargeKey=false;}}
  function perform(){phase='show';busy=false;chargePointer=null;pauseUI(false);update();getWorld().startBirthdayShow({onStage(stage){const[a,b,c]=acts[stage];$('wish-act').textContent=a;$('wish-line').textContent=b;$('wish-caption').textContent=c;$('wish-show').dataset.act=stage;$('wish-photos').hidden=stage!=='memories';$('wish-charge').hidden=stage!=='fireworks';$('wish-interaction-note').textContent=stage==='memories'?'点照片细看原图，点星空送一束祝福。':stage==='fireworks'?'点按星空，或按住下方按钮，让祝福再盛放。':'轻点星空，为爸爸再点亮一束光。';const heading=document.querySelector('.wish-show-heading');if(!matchMedia('(prefers-reduced-motion: reduce)').matches){heading.getAnimations().forEach(a=>{if(!('transitionProperty' in a))a.cancel();});heading.animate([{opacity:0},{opacity:1}],{duration:650,easing:'ease-out'});}},onProgress(p){$('wish-progress').style.transform='scaleX('+Math.min(1,p)+')';},onCharge(value){$('wish-charge').style.setProperty('--charge',value);$('wish-charge').classList.toggle('charging',value>.02);},onComplete(){phase='complete';pauseUI(false);update();}});}
  function update(){
    dialog.dataset.phase=phase;
    $('wish-show').hidden=phase!=='show';
    $('birthday-heading').textContent=phase==='complete'?content.greeting:phase==='wish'?'爸，许个愿吧。':'为你点一盏烛光。';
    $('birthday-instruction').textContent=phase==='complete'?'愿你吃得香，睡得好，常常笑。':phase==='wish'?'不用说出来，留在心里就好。':'在熟悉的屋子里，陪你再过一个生日。';
    $('birthday-action').textContent=phase==='unlit'?'点亮蜡烛':'吹灭蜡烛';$('birthday-action').hidden=phase==='complete'||phase==='show';$('birthday-action').disabled=busy;
    $('birthday-reveal').hidden=phase!=='complete';$('birthday-letter-preview').hidden=phase==='complete';
    $('candle-count').textContent=phase==='unlit'?'点亮烛光，再许一个愿。':phase==='complete'?'心愿已经留在烛光里。':out.size?'还有 '+(3-out.size)+' 支烛光':'三支烛光，三个小小的心愿。';
    [...$('cake-candles').children].forEach((button,i)=>{button.disabled=phase==='unlit'||out.has(i)||busy;button.classList.toggle('out',out.has(i));button.setAttribute('aria-label',out.has(i)?'第 '+(i+1)+' 支蜡烛已点熄':'点熄第 '+(i+1)+' 支蜡烛');});
    $('birthday-steps').querySelectorAll('span').forEach((step,i)=>step.classList.toggle('current',i===(phase==='unlit'?0:phase==='wish'?1:2)));
  }
  function reset(){cancel();phase='unlit';out.clear();getWorld()?.relightBirthday();$('cake-candles').replaceChildren();for(let i=0;i<3;i++){const button=document.createElement('button');button.type='button';button.className='candle';button.innerHTML='<span class="candle-drawing" aria-hidden="true"></span><span class="candle-number">0'+(i+1)+'</span>';button.addEventListener('click',()=>extinguish(i));$('cake-candles').append(button);}update();}
  function light(){if(phase!=='unlit')return;getWorld().lightBirthday();phase='wish';update();}
  function extinguish(index){if(phase!=='wish'||out.has(index))return;out.add(index);getWorld().extinguish(index);if(out.size===3){getWorld().finishBirthday();perform();}update();}
  function blow(){if(phase!=='wish'||busy)return;busy=true;update();[0,1,2].filter(i=>!out.has(i)).forEach((i,n)=>later(()=>extinguish(i),n*240));}
  function close(){cancel();if(phase==='show')phase='complete';getWorld()?.endBirthday();document.body.classList.remove('celebrating');dialog.close();update();}
  $('birthday-action').addEventListener('click',()=>phase==='unlit'?light():blow());
  $('birthday-close').addEventListener('click',close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('close',()=>{if(dialog.open)return;cancel();if(phase==='show')phase='complete';getWorld()?.endBirthday();document.body.classList.remove('celebrating');update();onClose?.();});
  $('wish-skip').addEventListener('click',()=>getWorld().skipBirthdayShow());
  $('wish-replay').addEventListener('click',()=>{if(phase==='complete')perform();});
  $('wish-pause').addEventListener('click',()=>pauseUI(getWorld().toggleBirthdayShowPause()));
  $('wish-sound').addEventListener('click',()=>{const on=getWorld().setBirthdayShowSound($('wish-sound').getAttribute('aria-pressed')!=='true');$('wish-sound').setAttribute('aria-pressed',String(on));$('wish-sound').setAttribute('aria-label',on?'关闭生日礼乐':'开启生日礼乐');$('wish-sound').textContent=on?'♫ 已开':'♫ 礼乐';});
  $('wish-photos').addEventListener('click',()=>{if(phase==='show')onPhoto(getWorld().birthdayShowState.visiblePhotos[0]??0);});
  let chargePointer=null,chargeKey=false;const chargeButton=$('wish-charge');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){chargeButton.querySelector('span').textContent='点亮一束祝福';chargeButton.setAttribute('aria-label','点亮一束祝福');}
  chargeButton.addEventListener('pointerdown',e=>{if(chargePointer!==null)return;chargePointer=e.pointerId;chargeButton.setPointerCapture(e.pointerId);getWorld().beginBirthdayCharge();});
  chargeButton.addEventListener('pointerup',e=>{if(e.pointerId!==chargePointer)return;getWorld().releaseBirthdayCharge();chargePointer=null;});
  chargeButton.addEventListener('pointercancel',()=>{chargePointer=null;getWorld().cancelBirthdayCharge();});
  chargeButton.addEventListener('keydown',e=>{if(!['Space','Enter'].includes(e.code)||e.repeat)return;e.preventDefault();chargeKey=true;getWorld().beginBirthdayCharge();});
  chargeButton.addEventListener('keyup',e=>{if(!chargeKey||!['Space','Enter'].includes(e.code))return;e.preventDefault();chargeKey=false;getWorld().releaseBirthdayCharge();});
  chargeButton.addEventListener('click',e=>{if(e.detail===0&&chargePointer===null&&!chargeKey)getWorld().saluteBirthday();});
  // The shared touch-button helper emits click() before pointerup bubbles;
  // keep the actual touch coordinates for this spatial interaction surface.
  let fieldTouch=null;const field=$('wish-field');field.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')fieldTouch={x:e.clientX,y:e.clientY};});
  field.addEventListener('pointerup',()=>fieldTouch=null);field.addEventListener('pointercancel',()=>fieldTouch=null);
  field.addEventListener('click',e=>{if(phase!=='show')return;const x=fieldTouch?.x??(e.detail===0?innerWidth/2:e.clientX),y=fieldTouch?.y??(e.detail===0?innerHeight*.55:e.clientY);fieldTouch=null;const result=getWorld().tapBirthdayShow(x,y);if(result?.kind==='photo')onPhoto(result.index);});
  let lastHover=0;$('wish-field').addEventListener('pointermove',e=>{const now=performance.now();if(now-lastHover<80||e.pointerType==='touch')return;lastHover=now;$('wish-field').classList.toggle('over-photo',getWorld().birthdayShowPhotoAt(e.clientX,e.clientY)!==null);});
  let pointer=null,lastX=0,lastY=0,distance=0;const area=$('cake-orbit');
  area.addEventListener('pointerdown',e=>{if(pointer!==null||phase==='show')return;pointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;distance=0;area.setPointerCapture(pointer);area.classList.add('dragging');});
  area.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;distance+=Math.hypot(dx,dy);getWorld().orbitBirthday(dx,dy);lastX=e.clientX;lastY=e.clientY;});
  area.addEventListener('pointerup',e=>{if(e.pointerId!==pointer)return;if(distance<6){const hit=getWorld().pick(e.clientX,e.clientY);if(hit?.kind==='candle'){if(phase==='unlit')light();else extinguish(hit.index);}else if(hit?.kind==='birthday'&&phase==='unlit')light();}pointer=null;area.classList.remove('dragging');});
  area.addEventListener('pointercancel',()=>{pointer=null;area.classList.remove('dragging');});
  reset();return{open(){if(dialog.open)return;onOpen();getWorld().beginBirthday();document.body.classList.add('celebrating');dialog.showModal();update();},close,reset,touchCandle(index){if(phase==='unlit')light();else extinguish(index);},get state(){return{phase,extinguished:out.size,busy};}};
}
