
/* surface any runtime error on-screen (helps diagnose sandbox issues) */
window.addEventListener('error', function(e){
  try{ var d=document.getElementById('errbar'); if(d){ d.style.display='block';
    d.textContent='⚠ '+(e.message||e.error||'error')+(e.lineno?(' @'+e.lineno):''); } }catch(_){}
});
/* ============================================================
   DATA (injected)
   ============================================================ */
const AUDIO_B64 = (window.AUDIO_CHUNKS || []).join("");


/* ============================================================
   SETUP
   ============================================================ */
const LANES = 4;
const LANE_COL = ['--l0','--l1','--l2','--l3'].map(v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim());
const LANE_KEYS = ['d','f','j','k'];
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
/* ---------- Web Audio subsystem (bypasses <audio> autoplay/CSP limits) ---------- */
const audioEl = document.getElementById('audio'); // fallback only
let actx=null, gainNode=null, abuf=null, srcNode=null;
let audioStartCtxTime=0, audioActive=false, decoding=false, decodeError=false, audioBytes=null;
let usingFallback=false;

function ensureCtx(){
  if(actx || decodeError) return;
  try{
    const AC = window.AudioContext||window.webkitAudioContext;
    if(!AC){ startFallback(); return; }
    actx = new AC();
    gainNode = actx.createGain(); gainNode.gain.value=0.9; gainNode.connect(actx.destination);
    sfxGain = actx.createGain(); sfxGain.gain.value=0.5; sfxGain.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, Math.floor(actx.sampleRate*0.4), actx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1;
  }catch(e){ console.error('ctx fail',e); startFallback(); }
}

let sfxGain=null, noiseBuf=null;
const LANE_FREQ=[261.63, 329.63, 392.00, 523.25];
function tone(freq, dur, type, vol, glideTo){
  if(!actx||!sfxGain) return;
  const t=actx.currentTime;
  const o=actx.createOscillator(); o.type=type||'triangle';
  o.frequency.setValueAtTime(freq,t);
  if(glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,glideTo), t+dur);
  const g=actx.createGain();
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.006); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t+dur+0.02);
}
function noiseBurst(dur,vol,lp){ if(!actx||!sfxGain||!noiseBuf)return; const t=actx.currentTime,s=actx.createBufferSource();s.buffer=noiseBuf;const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=lp||2000;const g=actx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f);f.connect(g);g.connect(sfxGain);s.start(t);s.stop(t+dur+0.02); }
function sfxHit(grade,lane){const base=LANE_FREQ[lane],vol=grade==='perfect'?0.15:grade==='great'?0.12:0.09;tone(base,0.15,'triangle',vol);if(grade==='perfect')tone(base*2,0.18,'sine',0.07);noiseBurst(0.025,0.045,3500);}
function sfxMiss(){tone(130,0.2,'sawtooth',0.10,72);noiseBurst(0.09,0.05,700);} function sfxHoldTick(lane){tone(LANE_FREQ[lane]*1.5,0.05,'sine',0.03);} function sfxOD(){tone(280,0.55,'sawtooth',0.13,1100);tone(420,0.55,'sine',0.07,1650);} function sfxCombo(level){const f=level>=100?1046:level>=50?880:660;tone(f,0.1,'sine',0.09);tone(f*1.5,0.14,'sine',0.05);} function sfxBeep(hi){tone(hi?880:440,0.12,'sine',0.11);}
function decodeIfNeeded(){
  if(!AUDIO_B64){ decodeError=true; return; }
  if(abuf||decoding||decodeError||!actx) return;
  decoding=true;
  try{ if(!audioBytes){const bin=atob(AUDIO_B64),len=bin.length;audioBytes=new Uint8Array(len);for(let i=0;i<len;i++)audioBytes[i]=bin.charCodeAt(i);} const copy=audioBytes.slice().buffer; const onOK=b=>{abuf=b;decoding=false;if(state==='play'&&!audioActive)startAudioAt(songT);}; const onErr=e=>{decoding=false;decodeError=true;console.error('decode fail',e);startFallback();}; const ret=actx.decodeAudioData(copy,onOK,onErr);if(ret&&ret.then)ret.then(onOK).catch(onErr); }catch(e){decoding=false;decodeError=true;startFallback();}
}
function startAudioAt(offset){if(!actx||!abuf)return false;try{if(srcNode){try{srcNode.onended=null;srcNode.stop();}catch(e){}try{srcNode.disconnect();}catch(e){}srcNode=null;}srcNode=actx.createBufferSource();srcNode.buffer=abuf;srcNode.connect(gainNode);audioStartCtxTime=actx.currentTime-offset;srcNode.start(0,Math.max(0,offset));audioActive=true;return true;}catch(e){console.error('start fail',e);return false;}}
function stopAudio(){audioActive=false;if(srcNode){try{srcNode.onended=null;srcNode.stop();}catch(e){}try{srcNode.disconnect();}catch(e){}srcNode=null;}}
function ctxPos(){return actx?(actx.currentTime-audioStartCtxTime):0;} function resumeCtx(){if(actx&&actx.state==='suspended')actx.resume().catch(()=>{});}
function startFallback(){if(usingFallback||!audioEl||!AUDIO_B64)return;usingFallback=true;try{if(!audioBytes){const bin=atob(AUDIO_B64),len=bin.length;audioBytes=new Uint8Array(len);for(let i=0;i<len;i++)audioBytes[i]=bin.charCodeAt(i);}audioEl.src=URL.createObjectURL(new Blob([audioBytes],{type:'audio/mpeg'}));audioEl.load();}catch(e){console.error('fallback fail',e);}}
function fbPlayAt(off){if(!usingFallback)return;try{audioEl.currentTime=off;const p=audioEl.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
let W=0,H=0,DPR=1;
function resize(){const r=cv.getBoundingClientRect();DPR=Math.min(window.devicePixelRatio||1,2.5);W=r.width;H=r.height;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);computeGeometry();}
window.addEventListener('resize',resize);
let G={};
function computeGeometry(){const cx=W/2,strikeY=H*0.80,horizonY=H*0.10,nearHalf=Math.min(W*0.46,250),laneW=(nearHalf*2)/LANES,nearLaneX=[];for(let i=0;i<LANES;i++)nearLaneX.push(cx-nearHalf+laneW*(i+0.5));G={cx,strikeY,horizonY,nearHalf,laneW,nearLaneX,fretY:H*0.80,fretR:Math.max(24,laneW*0.34)};}
const PERSP=3.2;function scaleAt(frac){return 1/(1+Math.max(0,frac)*PERSP);} const SCALE_TOP=scaleAt(1);function projY(frac){const s=scaleAt(frac);return G.strikeY-(G.strikeY-G.horizonY)*((1-s)/(1-SCALE_TOP));}function projX(lane,frac){const s=scaleAt(frac);return G.cx+(G.nearLaneX[lane]-G.cx)*s;}
