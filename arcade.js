/* ============================================================
   ARCADE REWARD LAYER
   High-score chase, multiplier ladder, milestone rewards,
   lightweight mobile feedback, and constant-speed presentation.
   Loaded after flow.js so it can enhance the stable core runtime.
   ============================================================ */
(function(){
  const stage=document.getElementById('stage');
  const scoreEl=document.getElementById('score');
  const scoreDeltaEl=document.getElementById('scoreDelta');
  const bestScoreEl=document.getElementById('bestScore');
  const multEl=document.getElementById('multiplier');
  const comboValueEl=document.getElementById('comboValue');
  const comboWrap=document.getElementById('comboWrap');
  const comboStatusEl=document.getElementById('comboStatus');
  const multProgressEl=document.getElementById('multProgress');
  const multHintEl=document.getElementById('multHint');
  const healthFillEl=document.getElementById('healthFill');
  const accValEl=document.getElementById('accVal');
  const odBtn=document.getElementById('odBtn');
  const rewardBanner=document.getElementById('rewardBanner');
  const rewardTitle=document.getElementById('rewardTitle');
  const rewardSub=document.getElementById('rewardSub');
  const resBonus=document.getElementById('resBonus');
  const resPeakMult=document.getElementById('resPeakMult');
  const resPerfectChain=document.getElementById('resPerfectChain');
  const resDifficulty=document.getElementById('resDifficulty');
  const resultRank=document.getElementById('resultRank');
  const resultBest=document.getElementById('resultBest');

  const MULT_BONUS={2:250,3:500,4:1000};
  const STREAK_BONUS={25:500,50:1250,100:3000,200:6500,300:10000};
  const hudCache=Object.create(null);
  let arcadeBonus=0;
  let peakMult=1;
  let perfectChain=0;
  let bestPerfectChain=0;
  let rewardTimer=0;
  let angelReadyAnnounced=false;
  let runBestAtStart=0;
  let newBestAnnounced=false;

  function baseMultiplier(c){ return 1+Math.min(3,Math.floor(Math.max(0,c)/10)); }
  function expectedMultiplier(){ const b=baseMultiplier(combo); return odActive?Math.min(8,b*2):b; }
  function bestKey(d){ return 'guitarVillain.bestScore.'+d; }
  function streakKey(d){ return 'guitarVillain.bestStreak.'+d; }
  function readNum(key){ try{ return Number(localStorage.getItem(key))||0; }catch(_){ return 0; } }
  function writeNum(key,val){ try{ localStorage.setItem(key,String(Math.max(0,Math.round(val)))); }catch(_){} }
  function formatScore(v){ return Math.max(0,Math.round(v)).toLocaleString(); }

  function setText(el,key,val){
    if(!el) return;
    const s=String(val);
    if(hudCache[key]!==s){ hudCache[key]=s; el.textContent=s; }
  }
  function setTransform(el,key,val){
    if(!el) return;
    if(hudCache[key]!==val){ hudCache[key]=val; el.style.transform=val; }
  }

  function showScoreGain(amount,grade){
    if(!scoreDeltaEl||amount<=0) return;
    scoreDeltaEl.textContent='+'+formatScore(amount);
    scoreDeltaEl.dataset.grade=grade||'';
    if(scoreDeltaEl.animate){
      scoreDeltaEl.animate([
        {opacity:0,transform:'translateY(5px) scale(.94)'},
        {opacity:1,transform:'translateY(0) scale(1.06)',offset:.25},
        {opacity:1,transform:'translateY(-2px) scale(1)',offset:.62},
        {opacity:0,transform:'translateY(-10px) scale(.98)'}
      ],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)'});
    }
    if(scoreEl&&scoreEl.animate){
      scoreEl.animate([{transform:'scale(1)'},{transform:'scale(1.045)'},{transform:'scale(1)'}],{duration:150,easing:'ease-out'});
    }
  }

  function haptic(pattern){
    try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(_){}
  }

  function showReward(title,sub,kind){
    if(!rewardBanner) return;
    rewardTitle.textContent=title;
    rewardSub.textContent=sub||'';
    rewardBanner.dataset.kind=kind||'reward';
    rewardBanner.classList.remove('show');
    void rewardBanner.offsetWidth;
    rewardBanner.classList.add('show');
    clearTimeout(rewardTimer);
    rewardTimer=setTimeout(()=>rewardBanner.classList.remove('show'),1050);
  }

  function statusForCombo(){
    if(odActive) return 'ANGEL POWER';
    if(combo>=100) return 'LEGENDARY';
    if(combo>=50) return 'ON FIRE';
    if(combo>=25) return 'HOT STREAK';
    if(perfectChain>=8) return 'PERFECT FLOW';
    if(combo>=10) return 'MOMENTUM';
    return 'BUILD STREAK';
  }

  function syncStageState(){
    if(!stage) return;
    stage.classList.toggle('combo-hot',combo>=10&&!odActive);
    stage.classList.toggle('combo-fire',combo>=30&&!odActive);
    stage.classList.toggle('angel-active',odActive);
  }

  function updateArcadeHUD(){
    const expected=expectedMultiplier();
    if(mult!==expected) mult=expected;
    peakMult=Math.max(peakMult,mult);

    setText(scoreEl,'score',formatScore(score));
    setText(multEl,'mult','×'+mult);
    setText(comboValueEl,'combo',combo);
    if(comboWrap) comboWrap.classList.toggle('show',combo>=2||odActive);
    setText(comboStatusEl,'status',statusForCombo());

    const base=baseMultiplier(combo);
    if(base<4){
      const within=combo%10;
      const remaining=10-within;
      setTransform(multProgressEl,'multProgress','scaleX('+(within/10)+')');
      setText(multHintEl,'multHint',remaining+' hit'+(remaining===1?'':'s')+' to ×'+(base+1));
    }else{
      setTransform(multProgressEl,'multProgress','scaleX(1)');
      setText(multHintEl,'multHint',odActive?'MAX POWER ×8':'MAX BASE ×4');
    }

    setTransform(healthFillEl,'health','scaleX('+Math.max(0,Math.min(1,health)).toFixed(3)+')');
    const total=hitNotes+judge.miss;
    const acc=total?Math.round((accWeighted/total)*100):100;
    setText(accValEl,'acc',acc+'%');

    if(bestScoreEl){
      if(runBestAtStart>0 && score>runBestAtStart){
        setText(bestScoreEl,'bestScore','NEW BEST');
        bestScoreEl.classList.add('beaten');
        if(!newBestAnnounced && combo>0){
          newBestAnnounced=true;
          showReward('NEW HIGH SCORE',formatScore(score)+' and climbing','best');
          haptic([12,35,18]);
        }
      }else{
        bestScoreEl.classList.remove('beaten');
        setText(bestScoreEl,'bestScore',runBestAtStart?'BEST '+formatScore(runBestAtStart):'SET A HIGH SCORE');
      }
    }

    if(odBtn){
      const baseNow=baseMultiplier(combo);
      const ready=od>=0.5&&!odActive;
      odBtn.classList.toggle('ready',ready);
      odBtn.classList.toggle('on',odActive);
      if(odActive) setText(odBtn,'odLabel','ANGEL ×'+Math.min(8,baseNow*2));
      else if(ready) setText(odBtn,'odLabel','ACTIVATE ×'+Math.min(8,baseNow*2));
      else setText(odBtn,'odLabel','ANGEL POWER');
    }
    syncStageState();
  }

  /* Replace the original HUD writer with a cached version. This avoids
     repeated innerHTML/layout work during rapid hits and sustain ticks. */
  updateHUD=updateArcadeHUD;

  const coreRegisterHit=registerHit;
  registerHit=function(n,grade,lane){
    const beforeScore=score;
    const beforeBase=baseMultiplier(combo);
    coreRegisterHit(n,grade,lane);

    if(grade==='perfect') perfectChain++;
    else perfectChain=0;
    bestPerfectChain=Math.max(bestPerfectChain,perfectChain);

    const afterBase=baseMultiplier(combo);
    let extra=0;
    let reward=null;
    if(afterBase>beforeBase){
      extra=MULT_BONUS[afterBase]||0;
      reward={title:'×'+afterBase+' MULTIPLIER',sub:'Streak bonus +'+formatScore(extra),kind:'mult'};
      haptic([10,24,12]);
    }else if(STREAK_BONUS[combo]){
      extra=STREAK_BONUS[combo];
      reward={title:combo+' NOTE STREAK',sub:'Milestone +'+formatScore(extra),kind:'streak'};
      haptic([12,30,12]);
    }else if(perfectChain===10||perfectChain===25||perfectChain===50){
      reward={title:'PERFECT FLOW ×'+perfectChain,sub:'Keep the precision chain alive',kind:'perfect'};
    }

    if(extra){ score+=extra; arcadeBonus+=extra; }
    peakMult=Math.max(peakMult,expectedMultiplier());
    const gained=score-beforeScore;
    showScoreGain(gained,grade);
    if(reward) showReward(reward.title,reward.sub,reward.kind);
    updateArcadeHUD();
  };

  const coreMissNote=missNote;
  missNote=function(n){
    const lostCombo=combo;
    coreMissNote(n);
    perfectChain=0;
    if(lostCombo>=10){
      showReward('STREAK BROKEN',lostCombo+' streak · rebuild the multiplier','miss');
      haptic(20);
    }
    updateArcadeHUD();
  };

  const coreActivateOD=activateOD;
  activateOD=function(){
    const wasActive=odActive;
    coreActivateOD();
    if(!wasActive&&odActive){
      mult=Math.min(8,baseMultiplier(combo)*2);
      peakMult=Math.max(peakMult,mult);
      showReward('ANGEL POWER','×'+mult+' scoring · make every hit count','power');
      haptic([18,28,18,28,28]);
      updateArcadeHUD();
    }
  };
  if(odBtn) odBtn.onclick=activateOD;

  const coreUpdateOD=updateOD;
  updateOD=function(dt){
    const wasActive=odActive;
    const wasReady=od>=0.5&&!odActive;
    coreUpdateOD(dt);
    const ready=od>=0.5&&!odActive;
    if(ready&&!wasReady&&!angelReadyAnnounced){
      angelReadyAnnounced=true;
      showReward('ANGEL READY','Activate now, or build ×4 first for ×8','power-ready');
      haptic([10,20,10]);
    }
    if(od<0.5&&!odActive) angelReadyAnnounced=false;
    if(wasActive&&!odActive){
      showReward('POWER ENDED','Keep the streak alive to recharge','power-end');
      updateArcadeHUD();
    }else if(ready!==wasReady){
      updateArcadeHUD();
    }
  };

  const coreResetRun=resetRun;
  resetRun=function(){
    arcadeBonus=0;
    peakMult=1;
    perfectChain=0;
    bestPerfectChain=0;
    angelReadyAnnounced=false;
    newBestAnnounced=false;
    runBestAtStart=readNum(bestKey(difficulty));
    for(const k of Object.keys(hudCache)) delete hudCache[k];
    if(rewardBanner) rewardBanner.classList.remove('show');
    coreResetRun();
    updateArcadeHUD();
  };

  function rankFor(acc,failed){
    if(failed) return 'F';
    if(acc>=98) return 'S';
    if(acc>=93) return 'A';
    if(acc>=85) return 'B';
    if(acc>=72) return 'C';
    return 'D';
  }

  const coreEndGame=endGame;
  endGame=function(failed){
    coreEndGame(failed);
    const total=hitNotes+judge.miss;
    const acc=total?Math.round((accWeighted/total)*100):100;
    const oldBest=readNum(bestKey(difficulty));
    const oldStreak=readNum(streakKey(difficulty));
    const isNewBest=score>oldBest;
    if(isNewBest) writeNum(bestKey(difficulty),score);
    if(maxCombo>oldStreak) writeNum(streakKey(difficulty),maxCombo);
    if(resBonus) resBonus.textContent=formatScore(arcadeBonus);
    if(resPeakMult) resPeakMult.textContent='×'+peakMult;
    if(resPerfectChain) resPerfectChain.textContent=bestPerfectChain;
    if(resDifficulty) resDifficulty.textContent=difficulty[0].toUpperCase()+difficulty.slice(1);
    if(resultRank){ resultRank.textContent=rankFor(acc,failed); resultRank.dataset.rank=rankFor(acc,failed); }
    if(resultBest){
      resultBest.textContent=isNewBest?'NEW HIGH SCORE':'BEST '+formatScore(Math.max(oldBest,score));
      resultBest.classList.toggle('new-best',isNewBest);
    }
  };

  const coreBuildDiffUI=buildDiffUI;
  buildDiffUI=function(){
    const list=document.getElementById('diffList');
    if(!list){ coreBuildDiffUI(); return; }
    list.innerHTML='';
    DIFF_ORDER.forEach(d=>{
      const arr=CHART.tiers[d]||[];
      const el=document.createElement('div');
      el.className='diff'+(d===difficulty?' sel':'');
      el.dataset.d=d;
      const ns=(arr.length/(songDur||1)).toFixed(1);
      const best=readNum(bestKey(d));
      el.innerHTML=`<div class="name">${d[0].toUpperCase()+d.slice(1)}</div>
        <div class="meta">${arr.length} notes · ${ns}/s</div>
        <div class="diff-best">${best?'Best '+formatScore(best):'No score yet'}</div>
        <div class="dots">${[0,1,2,3].map(i=>`<i class="${i<DIFF_DOTS[d]?'on':''}"></i>`).join('')}</div>`;
      el.onclick=()=>{ difficulty=d; buildDiffUI(); };
      list.appendChild(el);
    });
  };

  /* Smooth camera presentation: note travel still uses the exact constant
     APPROACH time. We only reduce camera bob/shake and skip deck shadows on
     coarse-pointer devices so reaction timing stays visually stable. */
  render=function(dt){
    ctx.clearRect(0,0,W,H);
    const bp=60/(CHART.bpm||120);
    const t=audioTime();
    const bob=(state==='play')?Math.sin((t/bp)*Math.PI*2)*(PERF_MOBILE?0.18:0.55):0;
    const shakeScale=PERF_MOBILE?2.2:4.2;
    const sx=(Math.random()*2-1)*shakeAmt*shakeScale;
    const sy=(Math.random()*2-1)*shakeAmt*shakeScale;
    ctx.save();
    ctx.translate(sx,sy+bob);
    drawBackground(dt);
    if(state==='menu'){
      drawHighway(0.45); drawSideRails(0.4); drawFrets(0.7); ctx.restore(); return;
    }
    drawHighway(1);
    drawSideRails(1);
    if(!PERF_MOBILE) drawNoteShadows();
    drawNotes();
    drawFrets(1);
    drawParticles(dt);
    drawPops(dt);
    ctx.restore();
    drawProgress();
  };

  /* Small mobile latency concession: same note speed and chart timing, but a
     slightly friendlier input window on coarse-pointer devices. */
  if(PERF_MOBILE){
    tryHit=function(lane){
      const t=audioTime();
      const scale=1.10;
      let best=-1,bestErr=WIN_MISS*scale+0.001;
      for(let i=0;i<notes.length;i++){
        const n=notes[i];
        if(n.lane!==lane||n.hit||n.missed||n.headHit) continue;
        const err=Math.abs(n.t-t);
        if(err<bestErr){ bestErr=err; best=i; }
      }
      if(best<0) return;
      const n=notes[best];
      let grade;
      if(bestErr<=WIN_PERFECT*scale) grade='perfect';
      else if(bestErr<=WIN_GREAT*scale) grade='great';
      else grade='good';
      registerHit(n,grade,lane);
      if(n.hold>0){ n.headHit=true; n.holdStart=t; n.holdActive=true; }
      else n.hit=true;
    };
  }

  buildDiffUI();
  runBestAtStart=readNum(bestKey(difficulty));
  updateArcadeHUD();
})();