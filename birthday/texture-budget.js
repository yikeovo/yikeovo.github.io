// Limit GPU allocations on touch devices; the source artwork stays intact.
// Family photographs are never passed to this helper.
export async function limitTextureImages(textures,maxSize){
  if(typeof createImageBitmap!=='function')return;
  const cache=new Map();
  await Promise.all([...new Set(textures)].filter(Boolean).map(async texture=>{
    const source=texture.image;if(!source||!source.width||Math.max(source.width,source.height)<=maxSize)return;
    const key=source;
    let variants=cache.get(key);if(!variants){variants=new Map();cache.set(key,variants);}
    const orientation=texture.flipY?'flipY':'none';
    if(!variants.has(orientation)){const scale=maxSize/Math.max(source.width,source.height);variants.set(orientation,createImageBitmap(source,{resizeWidth:Math.round(source.width*scale),resizeHeight:Math.round(source.height*scale),resizeQuality:'high',imageOrientation:orientation,colorSpaceConversion:'none',premultiplyAlpha:'none'}));}
    texture.image=await variants.get(orientation);texture.needsUpdate=true;
  }));
}
