const paths={home:'<path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/>',spark:'<path d="m12 2 2.9 7.1L22 12l-7.1 2.9L12 22l-2.9-7.1L2 12l7.1-2.9Z"/><path d="m19 2 .8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8Z"/>',photos:'<rect x="5" y="5" width="16" height="16" rx="2"/><path d="M17 2H4a2 2 0 0 0-2 2v13m3-2 5-5 4 4 3-3 4 4"/><circle cx="16" cy="9" r="1"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 1.9-2.5 2.1-2.5 4.2m0 3.5h.01"/>',music:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',map:'<path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2Zm6-2v15m6-12v15"/>',back:'<path d="M9 6 3 12l6 6m-6-6h12a6 6 0 0 1 6 6v2"/>'};
export function icon(name){return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';}
export function installIcons(){
  for(const[id,name]of[['quality-toggle','spark'],['album-open','photos'],['help-open','help'],['sound-toggle','music']]){const node=document.querySelector('#'+id+'>span');if(node)node.innerHTML=icon(name);}
  const house=document.querySelector('.house-symbol');if(house)house.innerHTML=icon('home');
  for(const button of document.querySelectorAll('.dialog-close'))button.innerHTML=icon('close');
  for(const[id,name,label]of[['map-toggle','map','看看方向'],['reset-position','back','回到院门']]){const node=document.getElementById(id);node.innerHTML=icon(name)+'<span>'+label+'</span>';}
}
