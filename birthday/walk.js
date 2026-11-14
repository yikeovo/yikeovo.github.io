import { createHomeWorld } from './world.js?v=22';
import {createMouseLook} from './mouse-look.js?v=22';
import {installTouchButtons} from './touch-buttons.js?v=22';
import {HOME_ACTIVITIES} from './activities.js?v=22';
import {createHomeGuide} from './home-guide.js?v=22';
import {createRoomGuide} from './walk-route.js?v=22';
import {createBirthdayRitual} from './birthday-ritual.js?v=22';
import {createArrivalGuide} from './arrival-guide.js?v=22';
import {createKeepsake} from './keepsake.js?v=22';
import {installIcons} from './icons.js?v=22';
import {createRadioPlayer} from './radio-player.js?v=22';
installTouchButtons();
installIcons();

const $ = (id) => document.getElementById(id);
// 横屏体验：触屏设备竖屏时提示旋转手机；点“开始”时尽力锁定横屏（安卓 Chrome 需先全屏；iOS 不支持锁定，仅作提示）
async function tryLandscapeLock(){
  if(!matchMedia('(pointer:coarse)').matches)return;
  try{
    if(document.fullscreenEnabled&&!document.fullscreenElement){await document.documentElement.requestFullscreen().catch(()=>{});}
    if(screen.orientation&&screen.orientation.lock){await screen.orientation.lock('landscape').catch(()=>{});}
  }catch(e){}
}
(function setupRotatePrompt(){
  const prompt=$('rotate-prompt');if(!prompt||!matchMedia('(pointer:coarse)').matches)return;
  const isPortrait=()=>matchMedia('(orientation:portrait)').matches;
  const dismissed=()=>{try{return sessionStorage.getItem('laojia-birthday:rotate-dismissed')==='1';}catch(e){return false;}};
  const sync=()=>{prompt.hidden=!(isPortrait()&&!dismissed());};
  sync();
  addEventListener('orientationchange',()=>setTimeout(sync,300));
  addEventListener('resize',sync);
  $('rotate-dismiss').addEventListener('click',()=>{try{sessionStorage.setItem('laojia-birthday:rotate-dismissed','1');}catch(e){}prompt.hidden=true;});
})();

// 点进页面第一次触摸就尽力切横屏，不必等到点“开始”（点“竖屏继续”时不锁，尊重这次选择）
const armLandscapeLock=event=>{if(event.target.closest&&event.target.closest('#rotate-dismiss'))return;removeEventListener('pointerdown',armLandscapeLock);tryLandscapeLock();};
addEventListener('pointerdown',armLandscapeLock);
function setText(id,value){const node=$(id);if(node.textContent!==value)node.textContent=value;}
const content = window.BIRTHDAY_CONTENT;
const storyDialog = $('story-dialog');
const birthdayDialog = $('birthday-dialog');
const keepsakeDialog=$('keepsake-dialog');let arrival=null;
let roomGuide=null,homeGuide=null,introTimer=0,wasMoving=false;
const keys = new Set();
const joy = { x: 0, y: 0, pointer: null };
const look = { pointer: null, x: 0, y: 0, startX: 0, startY: 0, distance: 0 };
let world, active = false, target = null, lastTime = performance.now(), elapsed = 0, frame = 0;
let toastTimer, currentPhoto = 0, music, musicOn = false;
const seenPhotos=new Set();
let lastHud=0,lastActivityRevision=-1;
let lastLookTime=0,lastFpsTime=0,lastFpsCount=0,lastRenderedAt=0,fpsFrames=0,fpsMotionMs=0;
try{const saved=JSON.parse(localStorage.getItem('laojia-birthday:photos'))||[];if(Array.isArray(saved))saved.forEach(index=>{if(Number.isInteger(index)&&index>=0&&index<content.photos.length)seenPhotos.add(index);});}catch{}
function updateJourney(){
  const done=world?.activities.completed.length||0;
  $('journey-count').textContent='旧照片 '+seenPhotos.size+' / '+content.photos.length+' · 家里小事 '+done+' / '+HOME_ACTIVITIES.length;
  $('journey-note').textContent=done===HOME_ACTIVITIES.length?'平常的小事，也成了今天的礼物。去大堂许个愿吧。':'倒杯茶，坐一坐。点这里看更多小事。';
}
updateJourney();
function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function notify(message,container) {
  const toast = $('toast');
  (container||document.activeElement?.closest('dialog[open]')||document.querySelector('dialog[open]')||document.body).append(toast);
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}
function paused() { return !active || !!document.querySelector('dialog[open]') || document.hidden; }
function clearMovement() {
  keys.clear(); joy.x = joy.y = 0; joy.pointer = null; look.pointer = null;
  $('joystick-thumb').style.transform = '';
}
function markExplored(){if(!introTimer)introTimer=setTimeout(()=>document.body.classList.add('has-explored'),4500);}
function showDialog(dialog) {
  arrival?.cancel();
  roomGuide?.cancel();
  mouseLook.release();
  clearMovement();
  if(birthdayDialog.open)world.setBirthdayPaused(true);
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
function story(title, kicker) {
  const body = $('story-body');
  body.replaceChildren(el('p', 'paper-kicker', kicker));
  const heading = el('h2', '', title); heading.id = 'story-heading'; body.append(heading);
  return body;
}
function openPhoto(index,keepBirthday=false) {
  if(birthdayDialog.open&&!keepBirthday)birthdayRitual.close();
  currentPhoto = (index + content.photos.length) % content.photos.length;
  seenPhotos.add(currentPhoto);updateJourney();
  try{localStorage.setItem('laojia-birthday:photos',JSON.stringify([...seenPhotos]));}catch{}
  const photo = content.photos[currentPhoto];
  const body = story(photo.caption, '旧照片 / ' + photo.location);
  const figure = el('figure', 'photo-view');
  const image = el('img'); image.src = photo.src; image.alt = photo.caption;
  figure.append(image, el('figcaption', '', photo.caption));
  const arrows = el('div', 'photo-arrows');
  const prev = el('button', '', '← 上一张'), next = el('button', '', '下一张 →');
  prev.type = next.type = 'button';
  prev.addEventListener('click', () => openPhoto(currentPhoto - 1,keepBirthday));
  next.addEventListener('click', () => openPhoto(currentPhoto + 1,keepBirthday));
  arrows.append(prev, el('span', '', (currentPhoto + 1) + ' / ' + content.photos.length), next);
  body.append(figure, arrows);
  if(keepBirthday){const back=el('button','paper-link','收好照片，回到这场生日星光 ↗');back.type='button';back.addEventListener('click',()=>storyDialog.close());body.append(back);}
  showDialog(storyDialog);
}
function openLetter() {
  const body = story('爸，有些话想对你说。', '大堂桌上的一封信');
  const envelope=el('button','letter-envelope');envelope.type='button';envelope.setAttribute('aria-label','拆开写给爸爸的信');envelope.append(el('span','envelope-address','爸爸 · 亲启'),el('span','envelope-seal','家'));
  const hint=el('span','envelope-open','点一下，拆开这封信。');body.append(envelope,hint);
  envelope.addEventListener('click',()=>{const letter=el('article','letter-sheet personal-letter');content.letter.forEach(line=>letter.append(el('p','',line)));const signature=content.letterSignature??content.signature;if(signature)letter.append(el('p','letter-signature',signature+' · '+content.date));const close=el('button','paper-link',birthdayDialog.open?'收好信，回到生日桌 ↗':'收好信，回到屋子里 ↗');close.type='button';close.addEventListener('click',()=>storyDialog.close());letter.append(close);envelope.replaceWith(letter);hint.remove();storyDialog.scrollTop=0;});
  showDialog(storyDialog);
}
function openHelp() {
  const body = story('慢慢走，像回自己家一样。', '在老家走一走');
  const list = el('ul', 'help-list');
  const instructions = [
    ['电脑怎么走', '进入后移动鼠标直接转头，用 WASD 或方向键走动。按 Esc 释放鼠标，点击画面继续漫游。'],
    ['手机怎么走', '用左下角的摇杆走动，在画面右侧滑动来转头。'],
    ['看看屋子里的东西', '走近物件，对准后按 E 或点击。茶壶能倒茶、沙发能坐下、遥控器能开电视、盆栽能浇水，书桌的抽屉和台灯也可以操作。'],
    ['如果迷了方向', '点“看看方向”或按 M，点选房间后可以陪你走过去。“家里小事”也能直接带你到物件旁。途中可以随时接手。']
  ];
  instructions.forEach(([heading, text]) => { const item = el('li'); item.append(el('strong', '', heading), document.createTextNode(text)); list.append(item); });
  body.append(list, el('p', 'story-description', '房间位置依照手绘记忆重建。家具、外墙和屋顶是依据有限线索补建的，之后还可以一起调整。'));
  if(world.stats.software){const graphics=el('section','graphics-help');graphics.append(el('strong','','当前正在用软件渲染'),el('p','','电脑上请在浏览器设置中打开“可用时使用图形加速”，然后重启浏览器。这能让三维画面使用显卡，兼顾清晰度和流畅度。'));const address=el('code','',/Edg\//.test(navigator.userAgent)?'edge://settings/system':'chrome://settings/system');graphics.append(address,el('p','','将上面的地址复制到浏览器地址栏。软件兼容模式下，停下后画面会恢复更高的清晰度。'));body.append(graphics);}
  const copy=el('button','paper-link','复制运行信息');copy.type='button';
  copy.addEventListener('click',async()=>{const report=JSON.stringify({version:'0.22',viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,...world.stats},null,2);try{await navigator.clipboard.writeText(report);copy.textContent='已复制，可发给我排查卡顿';}catch{const field=el('textarea','runtime-report');field.value=report;field.readOnly=true;body.append(field);field.select();copy.textContent='请复制下面的运行信息';}});body.append(copy);
  const guide=el('button','paper-link','回到院门，陪我去生日桌 ↗');guide.type='button';guide.addEventListener('click',()=>{storyDialog.close();startGuidedWalk(true);});body.append(guide);
  showDialog(storyDialog);
}
function openActivities(){homeGuide?.open('activities');}

function openKitchen() {
  const body = story('下一次，一起吃什么？', '厨房 / 留给下一顿家常饭');
  body.append(el('p', 'story-description', '想一道菜，记下来。下次一起吃饭的时候，就从这道菜开始。'));
  const form = el('form', 'dish-form');
  const label = el('label', '', '一道想吃的菜'); label.htmlFor = 'dish-input';
  const input = el('input'); input.id = 'dish-input'; input.required = true; input.maxLength = 60; input.placeholder = '比如，一道你喜欢的家常菜';
  try { input.value = JSON.parse(localStorage.getItem('laojia-birthday:v1:dish')) || ''; } catch {}
  const submit = el('button', 'paper-button', '记下来'); submit.type = 'submit';
  const status = el('p', 'story-description', '这句话只留在当前浏览器。'); status.setAttribute('role', 'status');
  form.append(label, input, submit, status);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim(); if (!value) return;
    try { localStorage.setItem('laojia-birthday:v1:dish', JSON.stringify(value)); status.textContent = '记好了：' + value + '。这句话会留在当前浏览器。'; }
    catch { status.textContent = '当前浏览器无法保存，可以把这句话复制留好。'; }
  });
  body.append(form); showDialog(storyDialog);
}
function openMemory(){
  const body=story('老家，还有什么是你记得的？','书桌上的回忆本');
  body.append(el('p','story-description','一扇窗、一件家具，或者一件以前的小事，都可以写在这里。'));
  const form=el('form','dish-form'),input=el('textarea'),label=el('label','','把记得的事留下来');
  input.id='memory-input';input.rows=4;input.maxLength=800;input.required=true;label.htmlFor=input.id;
  try{input.value=JSON.parse(localStorage.getItem('laojia-birthday:v1:memory'))||'';}catch{}
  const button=el('button','paper-button','留在回忆本里');button.type='submit';
  const status=el('p','story-description','只保存在当前浏览器。');status.setAttribute('role','status');
  form.append(label,input,button,status);form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(!value)return;try{localStorage.setItem('laojia-birthday:v1:memory',JSON.stringify(value));status.textContent='记下来了。下次再打开，这句话还在。';}catch{status.textContent='浏览器暂时不能保存，请把这段话复制留好。';}});
  body.append(form);showDialog(storyDialog);
}
function openBirthday() {
  birthdayRitual.open();
}
function activate(data) {
  if(arrival?.running||roomGuide?.running)return;
  if(!data||!active||document.hidden)return;
  if(data.kind==='candle'&&!storyDialog.open){openBirthday();birthdayRitual.touchCandle(data.index);return;}
  if(paused())return;
  if (data.kind === 'door') world.toggleDoor();
  else if(data.kind==='gate')world.toggleGate();
  else if(data.kind==='activity')world.performActivity(data.action);
  else if (data.kind === 'photo') openPhoto(data.index);
  else if (data.kind === 'letter') openLetter();
  else if (data.kind === 'birthday') openBirthday();
  else if (data.kind === 'kitchen') openKitchen();
  else if(data.kind==='album')openPhoto(0);
  else if(data.kind==='memory')openMemory();
  else if(data.kind==='music')$('sound-toggle').click();
}
function resetCandles() {
  birthdayRitual.reset();
}
const birthdayRitual=createBirthdayRitual({getWorld:()=>world,content,onPhoto:index=>openPhoto(index,true),onOpen(){mouseLook.release();clearMovement();if(musicOn)music?.suspend();},onClose(){if(musicOn&&!document.hidden)music?.resume();}});
const keepsake=createKeepsake({getWorld:()=>world,content,notify,onOpen(){clearMovement();mouseLook.release();world.setBirthdayPaused(true);},onClose(){clearMovement();if(birthdayDialog.open){world.setBirthdayPaused(false);$('customize-card').focus({preventScroll:true});}else $('world').focus({preventScroll:true});}});
$('customize-card').addEventListener('click',()=>keepsake.open());
$('story-close').addEventListener('click', () => storyDialog.close());
$('album-open').addEventListener('click', () => openPhoto(0));
$('help-open').addEventListener('click', openHelp);
$('activities-open').addEventListener('click',openActivities);
$('stand-up').addEventListener('click',()=>{clearMovement();world.activities.stand();world.requestRender();});
$('birthday-letter').addEventListener('click', openLetter);
$('birthday-letter-preview').addEventListener('click', openLetter);
$('relight').addEventListener('click', resetCandles);
$('interact').addEventListener('click', () => activate(world.pick() || target));
$('quality-toggle').addEventListener('click',()=>{
  const quality=world.quality==='smooth'?'detail':'smooth';world.setQuality(quality);
  $('quality-label').textContent=quality==='smooth'?'流畅':world.stats.software?'兼容':'清晰';
  $('quality-toggle').setAttribute('aria-label',quality==='smooth'?'切换为自适应画质':'切换为流畅画质');
});
[storyDialog, birthdayDialog].forEach((dialog) => {
  dialog.addEventListener('close', () => {if(dialog.open)return;clearMovement();if(dialog===storyDialog&&birthdayDialog.open){world.setBirthdayPaused(false);const control=world.birthdayShowState.running?$('wish-pause'):$('birthday-letter');control.focus({preventScroll:true});}else $('world').focus({ preventScroll: true }); });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
});
$('reset-position').addEventListener('click', () => {
  arrival?.cancel();roomGuide?.cancel();clearMovement();world.resetPosition();
});
$('map-toggle').addEventListener('click', () => {
  homeGuide?.open();
});

const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
addEventListener('keydown', (event) => {
  if(arrival?.running&&(event.code==='Escape'||movementKeys.has(event.code))){event.preventDefault();arrival.cancel();return;}
  if(roomGuide?.running&&(event.code==='Escape'||movementKeys.has(event.code))){event.preventDefault();roomGuide.cancel();return;}
  if(event.code==='Escape'&&document.pointerLockElement===$('world')){event.preventDefault();mouseLook.release();return;}
  if(birthdayDialog.open&&!storyDialog.open&&!keepsakeDialog.open){if(event.code==='Escape'){event.preventDefault();birthdayRitual.close();}if(event.code==='KeyE'&&!event.repeat)activate(world.pick());return;}
  if (paused()) return;
  if(event.code==='KeyM'&&!event.repeat){event.preventDefault();homeGuide.open();return;}
  if(event.code==='Space'&&world.activities.seated){event.preventDefault();world.activities.stand();world.requestRender();return;}
  if (movementKeys.has(event.code)) { if(mouseLook.desktop&&mouseLook.state==='released')return;event.preventDefault(); keys.add(event.code);markExplored(); }
  if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); activate(world.pick()); }
});
addEventListener('keyup', (event) => keys.delete(event.code));
addEventListener('blur', clearMovement);
document.addEventListener('visibilitychange', () => { clearMovement(); if (music && musicOn) { if (document.hidden||birthdayDialog.open) music.suspend(); else music.resume(); } });
const canvas = $('world');
const mouseLook=createMouseLook(canvas,{enabled:()=>active&&!arrival?.running&&!roomGuide?.running&&!paused(),camera:()=>world.camera,activate:(x,y)=>activate(x===undefined?world.pick():world.pick(x,y)),onMove:()=>{lastLookTime=performance.now();markExplored();},onState:()=>clearMovement()});
$('resume-look').addEventListener('click',()=>mouseLook.request());
function canLook(){return active&&!arrival?.running&&!roomGuide?.running&&!paused();}
canvas.addEventListener('pointerdown', (event) => {
  if(roomGuide?.running){roomGuide.cancel();if(event.pointerType==='mouse')mouseLook.request();}
  if(event.pointerType==='mouse'&&mouseLook.desktop)return;
  if (!canLook() || look.pointer !== null) return;
  look.pointer = event.pointerId; look.x = look.startX = event.clientX; look.y = look.startY = event.clientY; look.distance = 0;
  canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true });
});
canvas.addEventListener('pointermove', (event) => {
  if(event.pointerType==='mouse'&&mouseLook.desktop)return;
  if (!canLook() || event.pointerId !== look.pointer) return;
  const dx = event.clientX - look.x, dy = event.clientY - look.y;
  const sensitivity = event.pointerType === 'touch' ? .004 : .0034;
  world.camera.rotation.y -= dx * sensitivity;
  world.camera.rotation.x = Math.max(-1.2, Math.min(1.05, world.camera.rotation.x - dy * sensitivity));
  lastLookTime=performance.now();
  markExplored();
  look.distance += Math.hypot(dx, dy); look.x = event.clientX; look.y = event.clientY;
});
canvas.addEventListener('pointerup', (event) => {
  if(event.pointerType==='mouse'&&mouseLook.desktop)return;
  if (event.pointerId !== look.pointer) return;
  if (look.distance < 7 && canLook()) activate(world.pick(event.clientX, event.clientY));
  look.pointer = null;
});
canvas.addEventListener('pointercancel', () => { look.pointer = null; });
const joystick = $('joystick');
function updateJoystick(event) {
  const bounds = joystick.querySelector('.joystick-ring').getBoundingClientRect();
  let x = event.clientX - bounds.left - bounds.width / 2, y = event.clientY - bounds.top - bounds.height / 2;
  const distance = Math.hypot(x, y), maximum = 31;
  if (distance > maximum) { x *= maximum / distance; y *= maximum / distance; }
  joy.x = x / maximum; joy.y = -y / maximum;
  $('joystick-thumb').style.transform = 'translate(' + x + 'px,' + y + 'px)';
}
joystick.addEventListener('pointerdown', (event) => {
  if(roomGuide?.running)roomGuide.cancel();
  if (paused() || joy.pointer !== null) return;
  event.preventDefault(); joy.pointer = event.pointerId; joystick.setPointerCapture(event.pointerId); updateJoystick(event);markExplored();
});
joystick.addEventListener('pointermove', (event) => { if (event.pointerId === joy.pointer) updateJoystick(event); });
function releaseJoystick(event) { if (event.pointerId === joy.pointer) { joy.pointer = null; joy.x = joy.y = 0; $('joystick-thumb').style.transform = ''; } }
joystick.addEventListener('pointerup', releaseJoystick);
joystick.addEventListener('pointercancel', releaseJoystick);


function animate(now) {
  requestAnimationFrame(animate);
  if (!world) return;
  const rawMs=now-lastTime,delta = Math.min(rawMs / 1000, .1);
  lastTime = now; elapsed += delta; frame++;
  if (!paused()) {
    if(arrival?.running||roomGuide?.running){(arrival?.running?arrival:roomGuide).tick(delta);world.observeFrame(rawMs,true);}else{
    let forward = joy.y + (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    let right = joy.x + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const length = Math.hypot(forward, right);
    world.observeFrame(rawMs,length>.01||now-lastLookTime<200||world.inMotion);
    if (length > 1) { forward /= length; right /= length; }
    const yaw = world.camera.rotation.y, speed = (keys.has('ShiftLeft') ? 3.1 : 2.1) * delta;
    world.move((-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed, (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed);
    if (now-lastHud>120) {
      lastHud=now;
      const location = world.location();
      setText('location-name',location.name);setText('location-note',world.activities.seated?'坐着歇一会儿。按空格或点“起身”继续走走。':location.note);
      target = world.pick();
      $('interact').hidden = !target;
      $('crosshair').classList.toggle('active', !!target);
      if (target) { $('interact-title').textContent = target.title; $('interact-description').textContent = (target.kind==='door'&&world.doorOpen)||(target.kind==='gate'&&world.gateOpen)?'点一下，轻轻关上门':target.description; }
    }
    }
  }
  const viewChanged=world.inMotion;
  if (!document.hidden) world.tick(delta, elapsed);
  if(world.activities.revision!==lastActivityRevision){lastActivityRevision=world.activities.revision;updateJourney();$('stand-up').hidden=!world.activities.seated;}
  for(const message of world.activities.takeNotices())notify(message);
  const rendered=world.stats.renderCount,moving=!paused()&&(keys.size>0||Math.abs(joy.x)+Math.abs(joy.y)>.01||now-lastLookTime<200||arrival?.running||roomGuide?.running||viewChanged);
  if(moving&&!wasMoving){fpsFrames=fpsMotionMs=0;lastRenderedAt=lastFpsTime=now;}wasMoving=moving;
  if(rendered!==lastFpsCount){
    const gap=now-lastRenderedAt;if(!paused()&&lastRenderedAt&&gap>0&&gap<10000&&(moving||gap<250)){fpsFrames++;fpsMotionMs+=gap;}
    lastRenderedAt=now;lastFpsCount=rendered;
  }
  if(!moving&&now-lastRenderedAt>500){setText('fps-label','静止');fpsFrames=0;fpsMotionMs=0;}
  else if(now-lastFpsTime>700&&fpsMotionMs){setText('fps-label',Math.round(fpsFrames*1000/fpsMotionMs)+' FPS');fpsFrames=0;fpsMotionMs=0;lastFpsTime=now;}
}
function startGuidedWalk(reset=false){if(!arrival)return;roomGuide?.cancel();clearMovement();mouseLook.release();if(reset)world.resetPosition();$('arrival-guide').hidden=false;document.body.classList.add('guided-arrival');arrival.start();}
$('arrival-cancel').addEventListener('click',()=>{arrival?.cancel();roomGuide?.cancel();mouseLook.request();});
$('sound-toggle').addEventListener('click', async () => {
  const button = $('sound-toggle'); button.disabled = true;
  try { if (!music) music = createRadioPlayer(content.radioTrack,{onChange(state){musicOn=state.enabled;button.setAttribute('aria-pressed',String(state.enabled));button.setAttribute('aria-label',(state.enabled?'暂停':'播放')+'《'+state.title+'》');button.title=state.title+' · '+state.artist;$('sound-label').textContent=state.playing?state.title+' · 播放':state.enabled?'音乐 · 暂停':'音乐';},onError(){notify('收音机暂时没能播放，点音乐按钮可以再试一次。');}}); if (musicOn) await music.stop(); else await music.start(); }
  catch { notify('收音机暂时没能播放，点音乐按钮可以再试一次。'); }
  finally { button.disabled = false; }
});

async function init() {
  try {
    world = await createHomeWorld(canvas, content.photos, (progress) => { $('loading-fill').style.width = Math.round(progress * 90) + '%'; });
    $('quality-label').textContent=world.stats.software?'兼容':'清晰';
    $('sound-toggle').setAttribute('aria-label','播放《'+content.radioTrack.title+'》');$('sound-toggle').title=content.radioTrack.title+' · '+content.radioTrack.artist;
    world.tick(.016, 0);
    const hideGuide=()=>{$('arrival-guide').hidden=true;document.body.classList.remove('guided-arrival');};
    arrival=createArrivalGuide({world,onUpdate(data){setText('arrival-title',data.title);setText('arrival-description',data.description);$('arrival-progress').style.transform='scaleX('+data.progress+')';},onFinish(){hideGuide();openBirthday();},onCancel(reason){hideGuide();clearMovement();canvas.focus({preventScroll:true});if(reason==='blocked')notify('先停下来歇一歇，可以点画面自己走走。');}});
    roomGuide=createRoomGuide({world,onUpdate(data){setText('arrival-title',data.title);setText('arrival-description',data.description);$('arrival-progress').style.transform='scaleX('+data.progress+')';},onFinish(place){hideGuide();clearMovement();if(place.birthday)openBirthday();else{canvas.focus({preventScroll:true});notify('到了，'+(place.action?place.title+'，就在眼前。':'在'+place.title+'慢慢看看。'));}},onCancel(reason){hideGuide();clearMovement();canvas.focus({preventScroll:true});if(reason==='blocked')notify('先停在这里，点画面可以自己接着走。');}});
    homeGuide=createHomeGuide({getWorld:()=>world,onOpen(){arrival?.cancel();roomGuide?.cancel();clearMovement();mouseLook.release();},onGo(plan,place){clearMovement();mouseLook.release();$('arrival-guide').hidden=false;setText('arrival-title','去'+place.title);setText('arrival-description','陪你沿着家里的路走过去。');$('arrival-progress').style.transform='scaleX(0)';document.body.classList.add('guided-arrival');roomGuide.start(plan,place);}});
    $('loading-fill').style.width = '100%'; $('begin-label').textContent = '推开院门，回家'; $('begin').disabled = false;
    $('loading-note').textContent = '电脑：鼠标转头，WASD 走动。手机：左手摇杆，右手滑动。';
    $('begin-guided').disabled=false;if(matchMedia('(prefers-reduced-motion: reduce)').matches)$('guided-label').textContent='直接去生日桌';
    window.__HOME__ = { world, get active() { return active; }, get frame() { return frame; }, get paused() { return paused(); },get guide(){return arrival.state;},get navigation(){return roomGuide.state;},get exploration(){return homeGuide.state;} };
    const enterHome=guided=>{
      tryLandscapeLock();
      active = true; world.openGate(); $('welcome').hidden = true; $('dedication').hidden = true; $('hud').hidden = false; $('top-actions').hidden = false; canvas.focus({ preventScroll: true });
      if(guided)startGuidedWalk();else mouseLook.request();
    };
    $('begin').addEventListener('click',()=>enterHome(false));$('begin-guided').addEventListener('click',()=>enterHome(true));
    $('landscape-btn').addEventListener('click',async()=>{await tryLandscapeLock();if(!document.fullscreenElement&&matchMedia('(orientation:portrait)').matches)notify('当前浏览器不支持自动横屏，手动把手机横过来试试。');});
    lastTime = performance.now(); requestAnimationFrame(animate);
    addEventListener('resize', () => world.resize());
  } catch (error) {
    console.error('Home initialization failed', error);
    $('unavailable').hidden = false; $('welcome').hidden = true;
    $('unavailable-message').textContent = '当前浏览器暂时没能加载三维场景。可以换系统浏览器打开，或稍后刷新再试。';
  }
}
init();
