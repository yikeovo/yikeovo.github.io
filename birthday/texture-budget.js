// Limit GPU allocations on touch devices; the source artwork stays intact.
// Family photographs are never passed to this helper.
export async function limitTextureImages(textures,maxSize){
  const groups=new Map();
  for(const texture of new Set(textures)){
    const source=texture?.image;
    if(!source?.width||Math.max(source.width,source.height)<=maxSize)continue;
    if(!groups.has(source))groups.set(source,[]);
    groups.get(source).push(texture);
  }
  // Decode one source at a time, then release its original bitmap. Eight models
  // decoding/resizing together caused an avoidable peak on mobile browsers.
  for(const [source,items]of groups){
    const scale=maxSize/Math.max(source.width,source.height),width=Math.max(1,Math.round(source.width*scale)),height=Math.max(1,Math.round(source.height*scale)),variants=new Map();
    const sourceIsBitmap=typeof ImageBitmap!=='undefined'&&source instanceof ImageBitmap;
    for(const texture of items){
      // Bitmap pixels already carry their orientation; WebGL ignores flipY for
      // them. Preserve that orientation when the replacement is a canvas too.
      if(sourceIsBitmap)texture.flipY=false;
      const orientation=texture.flipY?'flipY':'none';
      if(!variants.has(orientation)){
        let image;
        if(typeof createImageBitmap==='function')try{image=await createImageBitmap(source,{resizeWidth:width,resizeHeight:height,resizeQuality:'high',imageOrientation:orientation,colorSpaceConversion:'none',premultiplyAlpha:'none'});}catch{/* Some browsers expose the API but reject its resize options. */}
        if(image&&(image.width!==width||image.height!==height)){image.close();image=null;}
        if(!image){
          // Canvas stays unflipped: WebGL applies texture.flipY on canvas upload.
          image=document.createElement('canvas');image.width=width;image.height=height;
          const context=image.getContext('2d');
          if(!context)throw new Error('无法准备房间贴图');
          context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(source,0,0,width,height);
        }
        variants.set(orientation,image);
      }
      texture.image=variants.get(orientation);texture.needsUpdate=true;
    }
    if(typeof source.close==='function')source.close();
    await new Promise(resolve=>setTimeout(resolve,0));
  }
}
