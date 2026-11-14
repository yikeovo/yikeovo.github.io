// Retry a transient request once, retaining the exact resource for phone diagnostics.
export async function loadAsset(url,operation){
  for(let attempt=0;attempt<2;attempt++){
    window.HOME_STARTUP?.resource(url);
    try{return await operation();}
    catch(cause){
      if(attempt===0){await new Promise(resolve=>setTimeout(resolve,400));continue;}
      const error=new Error('无法加载资源：'+url);
      error.cause=cause;error.resource=url;error.code='ASSET_LOAD';
      throw error;
    }
  }
}

export function readAsset(url,type){
  return loadAsset(url,async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
    try{
      const response=await fetch(url,{signal:controller.signal});
      if(!response.ok)throw new Error('HTTP '+response.status+' '+url);
      return await response[type]();
    }finally{clearTimeout(timer);}
  });
}
