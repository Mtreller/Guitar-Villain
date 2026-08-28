/* ============================================================
   CHART / DIFFICULTY UI
   ============================================================ */
const DIFF_ORDER = ['easy','medium','hard','expert'];
const DIFF_DOTS = {easy:1,medium:2,hard:3,expert:4};
function buildDiffUI(){
  const list = document.getElementById('diffList');
  list.innerHTML='';
  DIFF_ORDER.forEach(d=>{
    const arr = CHART.tiers[d]||[];
    const el = document.createElement('div');
    el.className='diff'+(d===difficulty?' sel':'');
    el.dataset.d=d;
    const ns = (arr.length/(songDur||1)).toFixed(1);
    el.innerHTML = `<div class="name">${d[0].toUpperCase()+d.slice(1)}</div>
      <div class="meta">${arr.length} notes · ${ns}/s</div>
      <div class="dots">${[0,1,2,3].map(i=>`<i class="${i<DIFF_DOTS[d]?'on':''}"></i>`).join('')}</div>`;
    el.onclick=()=>{difficulty=d; buildDiffUI();};
    list.appendChild(el);
  });
}

/* ============================================================
   INPUT
   ============================================================ */
function laneFromX(x){
  const left = G.cx - G.nearHalf, right = G.cx + G.nearHalf;
  if(x<left-30 || x>right+30) { }
  let best=-1, bd=1e9;
  for(let i=0;i<LANES;i++){ const d=Math.abs(x-G.nearLaneX[i]); if(d<bd){bd=d;best=i;} }
  return best;
}
function pressLane(lane){
  if(state!=='play') return;
  keyHeld[lane]=true;
  laneFlash[lane]=1;
  tryHit(lane);
}
function releaseLane(lane){ keyHeld[lane]=false; }

window.addEventListener('keydown', e=>{
  const k=e.key.toLowerCase();
  if(k===' '){ if(state==='play'){ e.preventDefault(); activateOD(); } return; }
  if(k==='escape'){ if(state==='play') pauseGame(); else if(state==='pause') resumeGame(); return; }
  const l = LANE_KEYS.indexOf(k);
  if(l>=0 && !e.repeat){ e.preventDefault(); pressLane(l); }
});
window.addEventListener('keyup', e=>{
  const l = LANE_KEYS.indexOf(e.key.toLowerCase());
  if(l>=0) releaseLane(l);
});

const activeTouch = {};
function ptInFretZone(y){ return y > G.strikeY - G.fretR*1.6; }
cv.addEventListener('touchstart', e=>{
  for(const t of e.changedTouches){
    const r=cv.getBoundingClientRect();
    const x=t.clientX-r.left, y=t.clientY-r.top;
    const lane=laneFromX(x);
    activeTouch[t.identifier]=lane;
    pressLane(lane);
  }
  if(state==='play') e.preventDefault();
},{passive:false});
cv.addEventListener('touchend', e=>{
  for(const t of e.changedTouches){
    const lane=activeTouch[t.identifier];
    if(lane!=null){ releaseLane(lane); delete activeTouch[t.identifier]; }
  }
},{passive:false});
cv.addEventListener('touchcancel', e=>{
  for(const t of e.changedTouches){ const lane=activeTouch[t.identifier];
    if(lane!=null){ releaseLane(lane); delete activeTouch[t.identifier]; } }
});
cv.addEventListener('mousedown', e=>{
  const r=cv.getBoundingClientRect(); const x=e.clientX-r.left;
  const lane=laneFromX(x); cv._mouseLane=lane; pressLane(lane);
});
window.addEventListener('mouseup', ()=>{ if(cv._mouseLane!=null){ releaseLane(cv._mouseLane); cv._mouseLane=null; } });

/* ============================================================
   HIT LOGIC
   ============================================================ */
function audioTime(){ return songT - OFFSET; }

function tryHit(lane){
  const t = audioTime();
  let best=-1, bestErr=WIN_MISS+0.001;
  for(let i=0;i<notes.length;i++){
    const n=notes[i];
    if(n.lane!==lane || n.hit || n.missed || n.headHit) continue;
    const err=Math.abs(n.t - t);
    if(err<bestErr){ bestErr=err; best=i; }
  }
  if(best<0) return;
  const n=notes[best];
  const err=bestErr;
  let grade;
  if(err<=WIN_PERFECT) grade='perfect';
  else if(err<=WIN_GREAT) grade='great';
  else grade='good';
  registerHit(n, grade, lane);
  if(n.hold>0){ n.headHit=true; n.holdStart=t; n.holdActive=true; }
  else n.hit=true;
}

function registerHit(n, grade, lane){
  const base = grade==='perfect'?100:grade==='great'?75:50;
  score += Math.round(base * mult);
  combo++; if(combo>maxCombo) maxCombo=combo;
  mult = odActive ? Math.min(8, 2*(1+Math.min(3,Math.floor(combo/10)))) : (1+Math.min(3,Math.floor(combo/10)));
  judge[grade]++;
  hitNotes++;
  accWeighted += grade==='perfect'?1:grade==='great'?0.75:0.5;
  health = Math.min(1, health + (grade==='perfect'?0.03:grade==='great'?0.024:0.016));
  if(!odActive) od = Math.min(1, od + (grade==='perfect'?0.028:0.018));
  spawnPop(lane, grade);
  spawnBurst(lane, grade);
  hitLineFlash=1; laneFlash[lane]=1;
  hitGlow[lane]=grade==='perfect'?1.3:grade==='great'?1.05:0.85;
  beamGlow[lane]=1;
  sfxHit(grade, lane);
  punchMultiplier();
  if(combo>=10 && combo!==lastComboMilestone && combo%10===0){
    if(combo===10||combo===25||combo===50||combo===100||combo%50===0){ sfxCombo(combo); }
    lastComboMilestone=combo;
  }
  updateHUD();
}

function missNote(n){
  n.missed=true;
  combo=0; mult=1; lastComboMilestone=0;
  judge.miss++;
  health = Math.max(0, health - 0.055);
  spawnPop(n.lane,'miss');
  sfxMiss();
  shakeAmt=Math.min(1, shakeAmt+0.7); shakeT=0.28;
  updateHUD();
  if(health<=0 && state==='play'){ endGame(true); }
}

/* ============================================================
   EFFECTS
   ============================================================ */
function spawnBurst(lane, grade){
  const x=G.nearLaneX[lane], y=G.strikeY;
  const col=LANE_COL[lane];
  const n = PERF_MOBILE ? (grade==='perfect'?10:grade==='great'?7:5) : (grade==='perfect'?24:grade==='great'?15:9);
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, sp=Math.random()*(grade==='perfect'?5.5:3.4)+1.2;
    const spark = grade!=='good' && Math.random()<0.4;
    particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1.8,life:1,col,
      r:(spark?1.4:2.2)+Math.random()*2, spark});
  }
  if(grade==='perfect'){
    const sparkCount=PERF_MOBILE?2:6;
    for(let i=0;i<sparkCount;i++){
      particles.push({x:x+(Math.random()*2-1)*G.fretR*0.5,y,vx:(Math.random()*2-1)*1.2,
        vy:-(4+Math.random()*3),life:1,col,r:1.6,spark:true});
    }
  }
}
function spawnPop(lane, grade){
  const txt = grade==='perfect'?'PERFECT':grade==='great'?'GREAT':grade==='good'?'GOOD':'MISS';
  const col = grade==='perfect'?getVar('--aur2'):grade==='great'?getVar('--l3'):grade==='good'?getVar('--l2'):getVar('--danger');
  pops.push({x:G.nearLaneX[lane], y:G.strikeY-40, txt, col, life:1});
}
function getVar(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
let _multEl=null;
function punchMultiplier(){
  if(!_multEl) _multEl=document.getElementById('multiplier');
  if(!_multEl) return;
  if(_multEl.animate){
    _multEl.animate([{transform:'scale(1.18)'},{transform:'scale(.98)'},{transform:'scale(1)'}],{duration:180,easing:'ease-out'});
  }
}

/* ============================================================
   OVERDRIVE
   ============================================================ */
function activateOD(){
  if(odActive || od<0.5) return;
  odActive=true; odTime=8.0;
  sfxOD();
  document.getElementById('odBtn').classList.add('on');
}
function updateOD(dt){
  const btn=document.getElementById('odBtn');
  if(odActive){
    odTime-=dt; od=Math.max(0, odTime/8.0);
    if(odTime<=0){ odActive=false; od=0; btn.classList.remove('on'); btn.style.display='none'; mult=1+Math.min(3,Math.floor(combo/10)); }
  }
  btn.style.display = (od>=0.5||odActive)?'block':'none';
  document.getElementById('odFill').style.transform=`scaleX(${od})`;
}
document.getElementById('odBtn').onclick=activateOD;

/* ============================================================
   HUD
   ============================================================ */
function updateHUD(){
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('multiplier').textContent = '×'+mult;
  document.getElementById('comboNum').innerHTML = `<b>${combo}</b> streak`;
  const cw=document.getElementById('comboWrap');
  cw.classList.toggle('show', combo>=2);
  document.getElementById('healthFill').style.transform=`scaleX(${health})`;
  const total = hitNotes+judge.miss;
  const acc = total? Math.round((accWeighted/total)*100):100;
  document.getElementById('accVal').textContent = acc+'%';
}

/* ============================================================
   GAME LOOP
   ============================================================ */
let lastT=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-lastT)/1000); lastT=now;
  try{
    if(state==='play') update(dt);
    render(dt);
  }catch(err){ console.error('loop error',err); }
  requestAnimationFrame(loop);
}

function advanceClock(dt){
  if(audioActive && actx){ songT = ctxPos(); }
  else if(usingFallback && !audioEl.paused && audioEl.currentTime>0){ songT = audioEl.currentTime; }
  else { songT += dt; }
}

function update(dt){
  advanceClock(dt);
  const t=audioTime();
  if(t>songDur+0.4){ endGame(false); return; }
  for(const n of notes){
    if(n.hit||n.missed) continue;
    if(!n.headHit && t - n.t > WIN_MISS){ missNote(n); }
    if(n.headHit && n.holdActive){
      const endT=n.t+n.hold;
      const held = keyHeld[n.lane];
      if(t>=endT){ n.holdActive=false; n.hit=true; score+=Math.round(30*mult); health=Math.min(1,health+0.02); updateHUD(); }
      else if(!held){ n.holdActive=false; n.hit=true; }
      else {
        n._acc=(n._acc||0)+dt;
        beamGlow[n.lane]=Math.max(beamGlow[n.lane],0.8);
        hitGlow[n.lane]=Math.max(hitGlow[n.lane],0.5);
        if(n._acc>(PERF_MOBILE?0.24:0.12)){ n._acc=0; score+=Math.round(6*mult); sfxHoldTick(n.lane); updateHUD(); }
      }
    }
  }
  updateOD(dt);
  const bp = 60/(CHART.bpm||120);
  beatPulse = 1 - ((t%bp)/bp);
  hitLineFlash=Math.max(0,hitLineFlash-dt*3.2);
  for(let i=0;i<4;i++){
    laneFlash[i]=Math.max(0,laneFlash[i]-dt*4);
    hitGlow[i]=Math.max(0,hitGlow[i]-dt*3.0);
    if(!keyHeld[i]) beamGlow[i]=Math.max(0,beamGlow[i]-dt*3.5);
  }
  if(shakeT>0){ shakeT-=dt; } else { shakeAmt=Math.max(0,shakeAmt-dt*3); }
  flowPhase=(flowPhase+dt*1.6)%1;
}
