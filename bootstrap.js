(function(){
  const err=document.getElementById('errbar');
  const menu=document.getElementById('menu');
  const play=document.getElementById('playBtn');
  const audio=document.getElementById('audio');
  function fail(e){
    console.error(e);
    if(err){err.style.display='block';err.textContent='⚠ '+(e&&e.message?e.message:String(e));}
  }
  if(menu&&play&&audio){
    const box=document.createElement('div');
    box.style.cssText='margin-top:14px;display:flex;flex-direction:column;align-items:center;gap:7px';
    box.innerHTML='<label class="btn ghost" style="padding:10px 16px;font-size:12px;cursor:pointer">Load original MP3<input id="songFile" type="file" accept="audio/mpeg,audio/mp3" hidden></label><span id="audioStatus" style="font-size:11px;color:var(--muted)">Game works without music; load the MP3 for the full track.</span>';
    menu.insertBefore(box,document.getElementById('ctrlHint'));
    const input=document.getElementById('songFile');
    const status=document.getElementById('audioStatus');
    input.addEventListener('change',function(){
      const file=input.files&&input.files[0];
      if(!file)return;
      try{
        if(audio.dataset.objectUrl)URL.revokeObjectURL(audio.dataset.objectUrl);
        const url=URL.createObjectURL(file);
        audio.dataset.objectUrl=url;
        audio.src=url;
        audio.load();
        window.__userSongLoaded=true;
        status.textContent='Loaded: '+file.name;
        status.style.color='var(--aur2)';
      }catch(e){fail(e);}
    });
    play.onclick=function(){
      try{
        if(window.__userSongLoaded){
          usingFallback=true;
          decodeError=true;
        }
        if(typeof startGame!=='function')throw new Error('Game runtime did not load. Refresh the page and try again.');
        startGame();
      }catch(e){fail(e);}
    };
  }
})();