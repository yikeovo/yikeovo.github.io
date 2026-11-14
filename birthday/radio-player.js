// One shared radio: user-initiated playback, pause/resume, and birthday focus.
export function createRadioPlayer(track,{onChange,onError}={}){
  const audio=document.createElement('audio');audio.id='home-radio-audio';audio.preload='none';audio.loop=true;audio.volume=.38;audio.hidden=true;audio.src=track.src;document.body.append(audio);
  let enabled=false,suspended=false,pending=false;
  const emit=()=>onChange?.({enabled,playing:!audio.paused,title:track.title,artist:track.artist});
  async function play(){
    pending=true;
    try{await audio.play();emit();}
    catch(error){if(!suspended){enabled=false;emit();throw error;}}
    finally{pending=false;}
  }
  for(const event of ['play','pause','ended'])audio.addEventListener(event,emit);
  audio.addEventListener('error',()=>{if(pending)return;const wanted=enabled;enabled=false;audio.pause();emit();if(wanted)onError?.();});
  return{
    async start(){enabled=true;suspended=false;await play();},
    async stop(){enabled=false;suspended=false;audio.pause();emit();},
    suspend(){suspended=true;audio.pause();emit();},
    resume(){if(!enabled)return;suspended=false;play().catch(()=>onError?.());}
  };
}
