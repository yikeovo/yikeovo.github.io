// This classic script runs before the module graph, so loading errors are visible
// even when a browser cannot import the 3D entry point. Nothing is sent anywhere.
(function(){
  var state={version:'0.26',phase:'准备三维场景',resource:'',ready:false,error:null};
  function report(){return JSON.stringify({version:state.version,phase:state.phase,resource:state.error?.resource||state.resource,error:state.error?.message,cause:state.error?.cause?.message,code:state.error?.code,url:location.origin+location.pathname,browser:navigator.userAgent,viewport:[innerWidth,innerHeight],online:navigator.onLine,graphics:state.graphics},null,2);}
  function fail(error){
    if(state.error)return;
    state.error=error instanceof Error?error:new Error(String(error));
    var panel=document.getElementById('unavailable');if(!panel)return;
    panel.hidden=false;document.getElementById('welcome').hidden=true;
    var message=document.getElementById('unavailable-message');
    message.textContent=navigator.onLine===false?'网络已断开，连接后再试一次。':error.code==='WEBGL_CONTEXT_LOST'?'手机的三维画面被浏览器暂停了。先关闭其他页面，再试一次。':error.code==='WEBGL_UNAVAILABLE'?'这个浏览器没有开启所需的三维显示功能。请使用更新后的系统浏览器打开。':error.resource?'有一份房间素材没能加载完成。点“再试一次”重新加载；仍然失败时，可以复制下方信息给我。':'三维场景在“'+state.phase+'”时遇到了问题。可以再试一次，或复制下方信息给我。';
    var details=document.createElement('details');details.className='startup-details';
    var summary=document.createElement('summary');summary.textContent='查看加载信息';details.appendChild(summary);
    var field=document.createElement('textarea');field.readOnly=true;field.setAttribute('aria-label','加载诊断信息');field.value=report();details.appendChild(field);
    var button=document.createElement('button');button.type='button';button.className='subtle-button startup-copy';button.textContent='复制加载信息';
    button.addEventListener('click',async function(){field.value=report();try{await navigator.clipboard.writeText(field.value);button.textContent='已复制';}catch(_){details.open=true;field.focus();field.select();button.textContent='长按文本可复制';}});
    panel.appendChild(button);panel.appendChild(details);
    document.body.classList.add('startup-failed');
  }
  window.HOME_STARTUP={state:state,report:report,fail:fail,resource:function(url){state.resource=url;},stage:function(text){state.phase=text;var note=document.getElementById('loading-note');if(note&&!state.ready)note.textContent=text+'……';},ready:function(){if(state.error)throw state.error;state.ready=true;}};
  addEventListener('error',function(event){
    if(state.ready)return;
    var target=event.target;
    if(target&&target.tagName==='SCRIPT'){var error=new Error('入口脚本未能加载');error.resource=target.src;fail(error);}
    else if(event.error)fail(event.error);
  },true);
})();
