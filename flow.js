/* ============================================================
   FLOW
   ============================================================ */
function loadChart(){
  const src=CHART.tiers[difficulty]||[];
  notes = src.map(n=>({t:n.t, lane:n.lane, hold:n.hold||0, hit:false, missed:false, headHit:false, holdActive:false}));
  totalNotes=notes.length;
}
function resetRun(){
  score=0;combo=0;maxCombo=0;mult=1;health=0.5;od=0;odActive=false;odTime=0;
  judge={perfect:0,great:0,good:0,miss:0}; hitNotes=0;accWeighted=0;
  particles=[];pops=[];laneFlash=[0,0,0,0];keyHeld=[false,false,false,false];
  updateHUD();
  document.getElementById('odBtn').style.display='none';
  document.getElementById('odBtn').classList.remove('on');
}
function show(id){ document.getElementById(id).classList.remove('hidden'); }
function hide(id){ document.getElementById(id).classList.add('hidden'); }

let audioPrimed=false;
let startPending=false;
async function primeAudio(){
  ensureCtx();
  await resumeCtx();
  unlockCtx();
  if(usingFallback) return false;
  try{
    await decodeTrack();
    await resumeCtx();
    return true;
  }catch(e){
    console.error('Primary audio unavailable; using fallback',e);
    startFallback();
    return false;
  }
}
async function startGame(){
  if(startPending) return;
  startPending=true;
  const playBtn=document.getElementById('playBtn');
  if(playBtn){ playBtn.disabled=true; playBtn.textContent='Preparing…'; }
  try{
    await primeAudio();
    loadChart(); resetRun();
    songT=0; syncDone=false;
    hide('menu'); hide('results'); hide('pauseMenu');
    state='countdown';
    const cd=document.getElementById('countdown');
    cd.style.display='flex';
    let n=3; cd.textContent=n; sfxBeep(false);
    const iv=setInterval(()=>{
      n--;
      if(n>0){ cd.textContent=n; sfxBeep(false); }
      else if(n===0){ cd.textContent='GO'; sfxBeep(true); }
      else { clearInterval(iv); cd.style.display='none'; beginPlay(); }
    },700);
  } finally {
    startPending=false;
    if(playBtn){ playBtn.disabled=false; playBtn.textContent='Play'; }
  }
}
function beginPlay(){
  songT=0; stopAudio();
  resumeCtx();
  if(abuf) startAudioAt(0);
  else if(usingFallback) fbPlayAt(0);
  lastT=performance.now();
  state='play';
}
function pauseGame(){
  if(state!=='play') return;
  state='pause';
  stopAudio();
  if(usingFallback){ try{audioEl.pause();}catch(_){} }
  show('pauseMenu');
}
async function resumeGame(){
  if(state!=='pause') return;
  hide('pauseMenu');
  state='countdown';
  const cd=document.getElementById('countdown'); cd.style.display='flex';
  let n=3; cd.textContent=n;
  const iv=setInterval(()=>{ n--;
    if(n>0){ cd.textContent=n; }
    else{ clearInterval(iv); cd.style.display='none';
      resumeCtx();
      if(abuf) startAudioAt(songT); else if(usingFallback) fbPlayAt(songT);
      lastT=performance.now(); state='play';
    }
  },500);
}
function endGame(failed){
  state='results'; stopAudio(); if(usingFallback){try{audioEl.pause();}catch(e){}}
  const total=totalNotes||1;
  const acc = Math.round((accWeighted/Math.max(1,(hitNotes+judge.miss)))*100);
  document.getElementById('resScore').textContent=score.toLocaleString();
  document.getElementById('resStreak').textContent=maxCombo;
  document.getElementById('resAcc').textContent=acc+'%';
  document.getElementById('resHit').textContent=`${hitNotes}/${total}`;
  document.getElementById('jP').textContent=judge.perfect;
  document.getElementById('jG').textContent=judge.great;
  document.getElementById('jO').textContent=judge.good;
  document.getElementById('jM').textContent=judge.miss;
  let starN = failed?0 : acc>=97?5:acc>=90?4:acc>=78?3:acc>=60?2:acc>=40?1:0;
  const els=document.querySelectorAll('#stars span');
  els.forEach((s,i)=>{ setTimeout(()=>s.classList.toggle('lit',i<starN), 180*i+200); });
  document.getElementById('resVerdict').textContent = failed?'Song Failed':(acc>=97?'Flawless':acc>=90?'Excellent':acc>=78?'Cleared':'Cleared');
  show('results');
}

document.getElementById('playBtn').onclick=()=>{ startGame().catch(e=>{ console.error(e); setAudioStatus('Audio error · tap Play to retry','error'); }); };
document.getElementById('pauseBtn').onclick=()=>{ state==='play'?pauseGame():null; };
document.getElementById('resumeBtn').onclick=resumeGame;
document.getElementById('restartBtn').onclick=()=>{ hide('pauseMenu'); startGame().catch(console.error); };
document.getElementById('quitBtn').onclick=()=>{ state='menu'; stopAudio(); if(usingFallback){try{audioEl.pause();}catch(e){}} hide('pauseMenu'); show('menu'); };
document.getElementById('againBtn').onclick=()=>{ startGame().catch(console.error); };
document.getElementById('menuBtn').onclick=()=>{ state='menu'; hide('results'); show('menu'); };

(function(){
  const touch='ontouchstart' in window;
  const el=document.getElementById('ctrlHint');
  if(touch){ el.innerHTML='Tap the glowing frets at the bottom in time with the notes.<br>Hold for long notes · fill the <b>Angel</b> meter for double points.'; }
  else { el.innerHTML=`Keys <span class="keycap">D</span><span class="keycap">F</span><span class="keycap">J</span><span class="keycap">K</span> for the four lanes · <span class="keycap">Space</span> Angel Power · <span class="keycap">Esc</span> pause`; }
})();

resize();
initStars();
buildDiffUI();
requestAnimationFrame(loop);
