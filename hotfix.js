(function(){
  const audio=document.getElementById('audio');
  const play=document.getElementById('playBtn');
  if(!audio||!play)return;

  audio.setAttribute('playsinline','');

  // Native-audio playback should not be restarted on every fret press.
  pressLane=function(lane){
    if(state!=='play')return;
    if(!audioActive){
      resumeCtx();
      if(abuf){
        startAudioAt(songT);
      }else if(usingFallback && audio.paused){
        fbPlayAt(songT);
      }
    }
    keyHeld[lane]=true;
    laneFlash[lane]=1;
    tryHit(lane);
  };

  // Make the fallback player robust and visible if autoplay is blocked.
  fbPlayAt=function(off){
    if(!usingFallback||!audio)return;
    try{
      if(Number.isFinite(off) && Math.abs((audio.currentTime||0)-off)>0.08) audio.currentTime=Math.max(0,off);
      audio.muted=false;
      const p=audio.play();
      if(p&&p.catch){
        p.catch(function(e){
          console.warn('audio play blocked',e);
          const status=document.getElementById('audioStatus');
          if(status){status.textContent='Tap Play again to start audio';status.style.color='var(--danger)';}
        });
      }
    }catch(e){console.error('fallback play failed',e);}
  };

  // Bless the media element during the actual user gesture so iOS/Safari
  // permits playback after the countdown timer completes.
  const previousPlay=play.onclick;
  play.onclick=function(e){
    try{
      if(usingFallback && audio.src && audio.paused){
        const oldMuted=audio.muted;
        audio.muted=true;
        audio.currentTime=0;
        const p=audio.play();
        if(p&&p.then){
          p.then(function(){
            if(state==='countdown'||state==='menu'){
              audio.pause();
              audio.currentTime=0;
            }
            audio.muted=oldMuted;
          }).catch(function(){audio.muted=oldMuted;});
        }else{
          audio.pause();
          audio.currentTime=0;
          audio.muted=oldMuted;
        }
      }
    }catch(_){ }
    return previousPlay ? previousPlay.call(this,e) : startGame();
  };

  // Avoid a forced synchronous layout on every successful hit on slower phones.
  punchMultiplier=function(){
    if(!_multEl)_multEl=document.getElementById('multiplier');
    if(!_multEl)return;
    if(_multEl.animate){
      _multEl.animate(
        [{transform:'scale(1.22)'},{transform:'scale(.97)'},{transform:'scale(1)'}],
        {duration:220,easing:'ease-out'}
      );
    }
  };
})();
