(function(){
  const err=document.getElementById('errbar');
  const menu=document.getElementById('menu');
  const play=document.getElementById('playBtn');
  const audio=document.getElementById('audio');
  const BUILTIN_TRACK='assets/Angels - Mary by the cross.mp3';

  function fail(e){
    console.error(e);
    if(err){err.style.display='block';err.textContent='⚠ '+(e&&e.message?e.message:String(e));}
  }

  if(!menu||!play||!audio)return;

  const box=document.createElement('div');
  box.style.cssText='margin-top:14px;display:flex;flex-direction:column;align-items:center;gap:7px';
  box.innerHTML='<span id="audioStatus" style="font-size:11px;color:var(--muted)">Loading built-in track…</span><label id="audioFallback" class="btn ghost" style="display:none;padding:10px 16px;font-size:12px;cursor:pointer">Choose MP3 instead<input id="songFile" type="file" accept="audio/mpeg,audio/mp3" hidden></label>';
  menu.insertBefore(box,document.getElementById('ctrlHint'));

  const input=document.getElementById('songFile');
  const status=document.getElementById('audioStatus');
  const fallback=document.getElementById('audioFallback');

  function useAudioSource(src,label,isObjectUrl){
    try{
      if(audio.dataset.objectUrl){
        URL.revokeObjectURL(audio.dataset.objectUrl);
        delete audio.dataset.objectUrl;
      }
      audio.preload='metadata';
      audio.src=src;
      if(isObjectUrl)audio.dataset.objectUrl=src;
      audio.load();
      usingFallback=true;
      window.__userSongLoaded=!!isObjectUrl;
      status.textContent=label;
      status.style.color='var(--aur2)';
    }catch(e){fail(e);}
  }

  audio.addEventListener('loadedmetadata',function(){
    if(!window.__userSongLoaded){
      status.textContent='Track ready · '+Math.round(audio.duration||314)+'s';
      status.style.color='var(--aur2)';
      fallback.style.display='none';
    }
  });
  audio.addEventListener('error',function(){
    if(window.__userSongLoaded)return;
    status.textContent='Built-in track is not in the repo yet.';
    status.style.color='var(--danger)';
    fallback.style.display='inline-block';
  });
  useAudioSource(BUILTIN_TRACK,'Loading built-in track…',false);

  input.addEventListener('change',function(){
    const file=input.files&&input.files[0];
    if(!file)return;
    const url=URL.createObjectURL(file);
    useAudioSource(url,'Loaded: '+file.name,true);
    fallback.style.display='none';
  });

  play.onclick=function(){
    try{
      usingFallback=true;
      if(typeof startGame!=='function')throw new Error('Game runtime did not load. Refresh the page and try again.');
      startGame();
    }catch(e){fail(e);}
  };
})();