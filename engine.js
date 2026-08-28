/* surface any runtime error on-screen (helps diagnose sandbox issues) */
window.addEventListener('error', function(e){
  try{ var d=document.getElementById('errbar'); if(d){ d.style.display='block';
    d.textContent='⚠ '+(e.message||e.error||'error')+(e.lineno?(' @'+e.lineno):''); } }catch(_){}
});
/* ============================================================
   DATA (injected)
   ============================================================ */
const TRACK_URL = 'assets/Angels - Mary by the cross.mp3';


/* ============================================================
   SETUP
   ============================================================ */
const LANES = 4;
const LANE_COL = ['--l0','--l1','--l2','--l3'].map(v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim());
const LANE_KEYS = ['d','f','j','k'];
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
/* ---------- Unified Web Audio subsystem ---------- */
const audioEl = document.getElementById('audio'); // fallback only
const PERF_MOBILE = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
let actx=null, gainNode=null, abuf=null, srcNode=null;
let audioStartCtxTime=0, audioActive=false, usingFallback=false;
let sfxGain=null, noiseBuf=null;
let trackBytesPromise=null, decodePromise=null;

function setAudioStatus(text, kind){
  const el=document.getElementById('audioStatus');
  if(!el) return;
  el.textContent=text;
  el.dataset.kind=kind||'';
}

function preloadTrack(){
  if(trackBytesPromise) return trackBytesPromise;
  setAudioStatus('Loading song…','loading');
  trackBytesPromise = fetch(TRACK_URL, {cache:'force-cache'})
    .then(r=>{ if(!r.ok) throw new Error('Song request failed ('+r.status+')'); return r.arrayBuffer(); })
    .then(bytes=>{ setAudioStatus('Song downloaded · ready to play','ready'); return bytes; })
    .catch(err=>{ setAudioStatus('Could not load song','error'); throw err; });
  return trackBytesPromise;
}

function ensureCtx(){
  if(actx) return actx;
  const AC = window.AudioContext||window.webkitAudioContext;
  if(!AC){ startFallback(); return null; }
  try{
    try{ actx = new AC({latencyHint:'interactive'}); }catch(_){ actx = new AC(); }
    gainNode = actx.createGain(); gainNode.gain.value=0.9; gainNode.connect(actx.destination);
    sfxGain = actx.createGain(); sfxGain.gain.value=PERF_MOBILE?0.32:0.45; sfxGain.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, Math.floor(actx.sampleRate*0.20), actx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1;
    return actx;
  }catch(e){ console.error('AudioContext init failed',e); startFallback(); return null; }
}

async function resumeCtx(){
  if(!actx) return;
  if(actx.state==='suspended'){
    try{ await actx.resume(); }catch(e){ console.warn('AudioContext resume failed',e); }
  }
}

function unlockCtx(){
  if(!actx) return;
  try{
    const b=actx.createBuffer(1,1,actx.sampleRate);
    const s=actx.createBufferSource(); s.buffer=b; s.connect(actx.destination); s.start(0);
  }catch(_){ }
}

function decodeBufferCompat(bytes){
  return new Promise((resolve,reject)=>{
    let settled=false;
    const ok=b=>{ if(!settled){ settled=true; resolve(b); } };
    const bad=e=>{ if(!settled){ settled=true; reject(e); } };
    try{
      const ret=actx.decodeAudioData(bytes.slice(0),ok,bad);
      if(ret&&ret.then) ret.then(ok,bad);
    }catch(e){ bad(e); }
  });
}

async function decodeTrack(){
  if(abuf) return abuf;
  if(decodePromise) return decodePromise;
  if(!ensureCtx()) throw new Error('Web Audio unavailable');
  decodePromise=(async()=>{
    setAudioStatus('Preparing audio…','loading');
    const bytes=await preloadTrack();
    const decoded=await decodeBufferCompat(bytes);
    abuf=decoded;
    songDur=decoded.duration||CHART.duration||songDur;
    setAudioStatus('Audio ready','ready');
    return decoded;
  })().catch(err=>{ decodePromise=null; console.error('Audio decode failed',err); throw err; });
  return decodePromise;
}

/* ---------- Synthesized sound effects ---------- */
const LANE_FREQ=[261.63,329.63,392.00,523.25];
function tone(freq,dur,type,vol,glideTo){
  if(!actx||!sfxGain) return;
  const t=actx.currentTime;
  const o=actx.createOscillator(); o.type=type||'triangle';
  o.frequency.setValueAtTime(freq,t);
  if(glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,glideTo),t+dur);
  const g=actx.createGain();
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.006); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t+dur+0.02);
}
function noiseBurst(dur,vol,lp){
  if(!actx||!sfxGain||!noiseBuf||PERF_MOBILE) return;
  const t=actx.currentTime,s=actx.createBufferSource(); s.buffer=noiseBuf;
  const f=actx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=lp||2000;
  const g=actx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t); s.stop(t+dur+0.02);
}
function sfxHit(grade,lane){
  const base=LANE_FREQ[lane],vol=grade==='perfect'?0.11:grade==='great'?0.09:0.07;
  tone(base,PERF_MOBILE?0.10:0.15,'triangle',vol);
  if(!PERF_MOBILE&&grade==='perfect') tone(base*2,0.18,'sine',0.055);
  noiseBurst(0.025,0.035,3500);
}
function sfxMiss(){ tone(130,0.16,'sawtooth',PERF_MOBILE?0.055:0.08,72); noiseBurst(0.07,0.04,700); }
function sfxHoldTick(lane){ tone(LANE_FREQ[lane]*1.5,0.04,'sine',PERF_MOBILE?0.018:0.026); }
function sfxOD(){ tone(280,0.45,'sawtooth',0.09,1100); if(!PERF_MOBILE) tone(420,0.45,'sine',0.05,1650); }
function sfxCombo(level){ const f=level>=100?1046:level>=50?880:660; tone(f,0.09,'sine',0.06); if(!PERF_MOBILE) tone(f*1.5,0.12,'sine',0.035); }
function sfxBeep(hi){ tone(hi?880:440,0.10,'sine',0.08); }

function startAudioAt(offset){
  if(!actx||!abuf) return false;
  try{
    stopAudio();
    srcNode=actx.createBufferSource(); srcNode.buffer=abuf; srcNode.connect(gainNode);
    const off=Math.max(0,Math.min(offset||0,Math.max(0,abuf.duration-0.01)));
    audioStartCtxTime=actx.currentTime-off;
    srcNode.onended=()=>{ if(state==='play'&&songT>=songDur-0.2) audioActive=false; };
    srcNode.start(0,off); audioActive=true; return true;
  }catch(e){ console.error('Music start failed',e); return false; }
}
function stopAudio(){
  audioActive=false;
  if(srcNode){ try{srcNode.onended=null;srcNode.stop();}catch(_){} try{srcNode.disconnect();}catch(_){} srcNode=null; }
}
function ctxPos(){ return actx ? (actx.currentTime-audioStartCtxTime) : songT; }

/* Native media is retained only as a compatibility fallback. */
function startFallback(){
  if(usingFallback||!audioEl) return;
  usingFallback=true; audioEl.src=TRACK_URL; audioEl.preload='auto'; audioEl.setAttribute('playsinline',''); audioEl.load();
  setAudioStatus('Compatibility audio mode','loading');
}
function fbPlayAt(off){
  if(!usingFallback||!audioEl) return;
  try{ if(Math.abs((audioEl.currentTime||0)-(off||0))>0.08) audioEl.currentTime=Math.max(0,off||0); const p=audioEl.play(); if(p&&p.catch)p.catch(e=>console.warn('Fallback play blocked',e)); }catch(e){ console.error('Fallback play failed',e); }
}

// Begin downloading immediately while the menu is visible; decoding waits for a Play gesture.
preloadTrack().catch(()=>{ startFallback(); });
let W=0,H=0,DPR=1;
function resize(){
  const r = cv.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio||1, PERF_MOBILE ? 1.5 : 2.0);
  W = r.width; H = r.height;
  cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  computeGeometry();
}
window.addEventListener('resize', resize);

/* Highway geometry (perspective) */
let G = {};
function computeGeometry(){
  const cx = W/2;
  const strikeY = H*0.80;
  const horizonY = H*0.10;
  const nearHalf = Math.min(W*0.46, 250);      // half-width of highway at strike
  const laneW = (nearHalf*2)/LANES;
  const nearLaneX = [];
  for(let i=0;i<LANES;i++) nearLaneX.push(cx - nearHalf + laneW*(i+0.5));
  G = {cx, strikeY, horizonY, nearHalf, laneW, nearLaneX,
       fretY: H*0.80, fretR: Math.max(24, laneW*0.34)};
}

// perspective scale for a note fraction (0 = at strike, 1 = spawn/top)
const PERSP = 3.2;
function scaleAt(frac){ return 1/(1+Math.max(0,frac)*PERSP); }
const SCALE_TOP = scaleAt(1);
function projY(frac){
  const s = scaleAt(frac);
  return G.strikeY - (G.strikeY-G.horizonY)*((1-s)/(1-SCALE_TOP));
}
function projX(lane, frac){
  const s = scaleAt(frac);
  return G.cx + (G.nearLaneX[lane]-G.cx)*s;
}

/* ============================================================
   STATE
   ============================================================ */
const APPROACH = 1.55;         // seconds a note is visible before strike
const WIN_PERFECT=0.045, WIN_GREAT=0.09, WIN_GOOD=0.145, WIN_MISS=0.145;
const OFFSET = 0.00;           // audio latency calibration

// ---- Master song clock (independent of audio so the game never freezes) ----
let songT = 0;                 // authoritative song time (seconds)
let clockRunning = false;      // advancing while playing
let syncDone = false;          // have we locked the manual clock to audio yet

let state = 'menu';            // menu | countdown | play | pause | results
let difficulty = 'medium';
let notes = [];                // active chart {t,lane,hold, hit, missed, headHit, holdDone}
let idxNext = 0;               // next note to consider spawning (for perf we just iterate visible)
let startAudioBase = 0;
let score=0, combo=0, maxCombo=0, mult=1, health=0.5;
let od=0, odActive=false, odTime=0;
let judge={perfect:0,great:0,good:0,miss:0};
let totalNotes=0, hitNotes=0, accWeighted=0;
let particles=[], pops=[], laneFlash=[0,0,0,0], keyHeld=[false,false,false,false];
let hitLineFlash=0, beatPulse=0;
let hitGlow=[0,0,0,0];      // intense bloom at fret on hit
let beamGlow=[0,0,0,0];     // lane light beam intensity
let shakeAmt=0, shakeT=0;   // screen shake on miss
let flowPhase=0;            // animates hold-note flow
let lastComboMilestone=0;
let songDur = CHART.duration || 300;
