/* ============================================================
   RENDER
   ============================================================ */
function render(dt){
  ctx.clearRect(0,0,W,H);
  const bp=60/(CHART.bpm||120);
  const t=audioTime();
  const bob = (state==='play') ? Math.sin((t/bp)*Math.PI*2)*1.5 : 0;
  const sx=(Math.random()*2-1)*shakeAmt*7, sy=(Math.random()*2-1)*shakeAmt*7;
  ctx.save();
  ctx.translate(sx, sy+bob);

  drawBackground(dt);
  if(state==='menu'){ drawHighway(0.45); drawSideRails(0.4); drawFrets(0.7); ctx.restore(); return; }
  drawHighway(1);
  drawSideRails(1);
  drawNoteShadows();
  drawNotes();
  drawFrets(1);
  drawParticles(dt);
  drawPops(dt);
  ctx.restore();
  drawProgress();
}

let stars=[];
function initStars(){ stars=[]; const starCount=PERF_MOBILE?48:90; for(let i=0;i<starCount;i++) stars.push({x:Math.random(),y:Math.random(),z:Math.random()*.8+.2,ph:Math.random()*6}); }
function drawBackground(dt){
  const energy = Math.min(1, combo/40);
  const g=ctx.createRadialGradient(W/2,H*0.10,10,W/2,H*0.10,H*0.95);
  const a1 = odActive?0.40:0.10+energy*0.16;
  g.addColorStop(0,`rgba(124,92,255,${a1})`);
  g.addColorStop(0.45,`rgba(49,224,208,${a1*0.35})`);
  g.addColorStop(1,'rgba(5,6,15,0)');
  ctx.fillStyle=g; ctx.fillRect(-20,-20,W+40,H+40);
  const hg=ctx.createLinearGradient(0,G.horizonY-40,0,G.horizonY+70);
  hg.addColorStop(0,'rgba(124,92,255,0)');
  hg.addColorStop(0.5,`rgba(140,150,255,${0.10+energy*0.12})`);
  hg.addColorStop(1,'rgba(124,92,255,0)');
  ctx.fillStyle=hg; ctx.fillRect(0,G.horizonY-40,W,110);
  const time=performance.now()/1000;
  for(const s of stars){
    const tw=0.5+0.5*Math.sin(time*1.5+s.ph);
    ctx.globalAlpha=0.22+tw*0.5*s.z;
    ctx.fillStyle='#cdd6ff';
    ctx.fillRect(s.x*W, s.y*H*0.55, s.z*1.8, s.z*1.8);
  }
  ctx.globalAlpha=1;
}

function edgeX(side){ return side<0 ? (G.nearLaneX[0]-G.laneW/2) : (G.nearLaneX[3]+G.laneW/2); }

function drawHighway(alpha){
  ctx.save(); ctx.globalAlpha=alpha;
  const ty=G.horizonY;
  const nearL=G.nearLaneX[0]-G.laneW/2, nearR=G.nearLaneX[3]+G.laneW/2;
  const farL=G.cx+(nearL-G.cx)*SCALE_TOP, farR=G.cx+(nearR-G.cx)*SCALE_TOP;

  const grd=ctx.createLinearGradient(0,ty,0,H);
  grd.addColorStop(0,'rgba(24,28,70,0.02)');
  grd.addColorStop(0.55,'rgba(28,34,84,0.45)');
  grd.addColorStop(0.80,'rgba(34,40,96,0.62)');
  grd.addColorStop(1,'rgba(18,22,58,0.75)');
  ctx.beginPath();
  ctx.moveTo(farL,ty); ctx.lineTo(farR,ty); ctx.lineTo(nearR,H); ctx.lineTo(nearL,H);
  ctx.closePath(); ctx.fillStyle=grd; ctx.fill();

  const sheen=ctx.createLinearGradient(0,ty,0,H);
  sheen.addColorStop(0,'rgba(160,180,255,0)');
  sheen.addColorStop(1,'rgba(160,180,255,0.06)');
  ctx.fillStyle=sheen; ctx.fill();

  for(let i=0;i<LANES;i++){
    const nxL=G.nearLaneX[i]-G.laneW/2, nxR=G.nearLaneX[i]+G.laneW/2;
    const fxL=G.cx+(nxL-G.cx)*SCALE_TOP, fxR=G.cx+(nxR-G.cx)*SCALE_TOP;
    const glow=Math.max(laneFlash[i]*0.55, beamGlow[i]*0.7);
    if(glow>0.01){
      const lg=ctx.createLinearGradient(0,ty,0,G.strikeY);
      lg.addColorStop(0,'rgba(0,0,0,0)');
      lg.addColorStop(1, hexA(LANE_COL[i], 0.28*glow));
      ctx.beginPath(); ctx.moveTo(fxL,ty);ctx.lineTo(fxR,ty);ctx.lineTo(nxR,H);ctx.lineTo(nxL,H);ctx.closePath();
      ctx.fillStyle=lg; ctx.fill();
    }
  }

  for(let i=0;i<=LANES;i++){
    const nx = nearL + i*G.laneW;
    const fx = G.cx + (nx-G.cx)*SCALE_TOP;
    const gl=ctx.createLinearGradient(0,ty,0,H);
    gl.addColorStop(0,'rgba(150,160,220,0.02)');
    gl.addColorStop(0.6,'rgba(150,160,220,0.14)');
    gl.addColorStop(1,'rgba(170,185,255,0.28)');
    ctx.strokeStyle=gl; ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.moveTo(fx,ty); ctx.lineTo(nx,H); ctx.stroke();
  }

  const t=audioTime();
  const spacing=0.5;
  const phase=(t% spacing)/spacing;
  for(let k=0;k<14;k++){
    let frac=((k+ (1-phase))*spacing)/APPROACH;
    if(frac<=0||frac>1.02) continue;
    const y=projY(frac), s=scaleAt(frac);
    const lx=G.cx+(nearL-G.cx)*s, rx=G.cx+(nearR-G.cx)*s;
    const fog=Math.pow(1-frac,1.2);
    ctx.strokeStyle=`rgba(150,165,230,${0.05+0.16*fog})`;
    ctx.lineWidth=Math.max(0.5,1.6*s);
    ctx.beginPath();ctx.moveTo(lx,y);ctx.lineTo(rx,y);ctx.stroke();
  }
  ctx.restore();
}

function drawSideRails(alpha){
  const ty=G.horizonY;
  const nearL=G.nearLaneX[0]-G.laneW/2, nearR=G.nearLaneX[3]+G.laneW/2;
  const farL=G.cx+(nearL-G.cx)*SCALE_TOP, farR=G.cx+(nearR-G.cx)*SCALE_TOP;
  const energy=Math.min(1,combo/40);
  const c1=odActive?getVar('--aur1'):'#5b6cff';
  const c2=odActive?getVar('--aur2'):'#31e0d0';
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.lineCap='round';
  [[farL,nearL,c1],[farR,nearR,c2]].forEach(([fx,nx,c])=>{
    ctx.shadowColor=c; ctx.shadowBlur=18+14*energy;
    ctx.strokeStyle=hexA(c,0.85); ctx.lineWidth=3.2;
    ctx.beginPath(); ctx.moveTo(fx,ty); ctx.lineTo(nx,H); ctx.stroke();
    ctx.shadowBlur=0; ctx.strokeStyle='rgba(230,240,255,0.9)'; ctx.lineWidth=1.1;
    ctx.beginPath(); ctx.moveTo(fx,ty); ctx.lineTo(nx,H); ctx.stroke();
  });
  ctx.restore();
}

function drawNoteShadows(){
  const t=audioTime();
  ctx.save();
  for(const n of notes){
    if(n.hit||n.missed) continue;
    const frac=(n.t - t)/APPROACH;
    if((frac<-0.12||frac>1.02) && !n.holdActive) continue;
    const s=scaleAt(Math.max(0,frac));
    const x=projX(n.lane,Math.max(0,frac));
    const y=projY(Math.max(-0.12,frac))+G.fretR*0.5*s;
    const r=G.fretR*0.9*s;
    ctx.globalAlpha=0.28*Math.min(1,(1-frac)+0.3);
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(x,y,r,r*0.32,0,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawNotes(){
  const t=audioTime();
  const vis=[];
  for(const n of notes){
    if(n.hit||n.missed) continue;
    const frac=(n.t - t)/APPROACH;
    if((frac<-0.12 || frac>1.05) && !n.holdActive) continue;
    vis.push({n,frac});
  }
  vis.sort((a,b)=>b.frac-a.frac);
  for(const {n,frac} of vis){
    if(n.hold>0){
      const endFrac=(n.t+n.hold - t)/APPROACH;
      drawTail(n.lane, Math.max(-0.05,frac), Math.min(1.05,endFrac), n);
    }
    drawGem(n.lane, frac, n);
  }
}

function drawTail(lane, headFrac, tailFrac, n){
  const col=LANE_COL[lane];
  const steps=14;
  ctx.save();
  const active=n.holdActive;
  for(let i=0;i<steps;i++){
    const f0=headFrac+(tailFrac-headFrac)*(i/steps);
    const f1=headFrac+(tailFrac-headFrac)*((i+1)/steps);
    if(f1<-0.05) continue;
    const y0=projY(Math.max(-0.05,f0)), y1=projY(Math.max(-0.05,f1));
    const s=scaleAt(Math.max(0,(f0+f1)/2));
    const x=projX(lane,(f0+f1)/2);
    const w=G.laneW*0.30*s;
    const gx=ctx.createLinearGradient(x-w,0,x+w,0);
    gx.addColorStop(0, shadeA(col,-50,active?0.9:0.55));
    gx.addColorStop(0.5, hexA(col, active?0.95:0.6));
    gx.addColorStop(1, shadeA(col,-60,active?0.85:0.5));
    ctx.fillStyle=gx;
    ctx.fillRect(x-w/2, Math.min(y0,y1), w, Math.abs(y1-y0)+1.5);
    const flow=((i/steps)+ (active?-flowPhase:0));
    const fa=0.35+0.35*Math.sin(flow*Math.PI*2*3);
    if(active){ ctx.fillStyle=hexA('#ffffff', Math.max(0,fa)*0.5);
      ctx.fillRect(x-w*0.18, Math.min(y0,y1), w*0.36, Math.abs(y1-y0)+1.5); }
  }
  const ey=projY(Math.max(-0.05,tailFrac)), es=scaleAt(Math.max(0,tailFrac));
  const ex=projX(lane,tailFrac);
  ctx.shadowColor=col; ctx.shadowBlur=12*es;
  ctx.fillStyle=hexA(col,0.8);
  ctx.beginPath(); ctx.ellipse(ex,ey,G.laneW*0.18*es,G.laneW*0.10*es,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawGem(lane, frac, n){
  const cf=Math.max(-0.12,frac);
  const y=projY(cf);
  const x=projX(lane,Math.max(0,frac));
  const s=scaleAt(Math.max(0,frac));
  const r=G.fretR*0.82*s;
  const rt=r*0.72;
  const thick=r*0.42;
  const col=LANE_COL[lane];
  const fog=Math.min(1, (1-frac)*1.4+0.25);
  ctx.save();
  ctx.globalAlpha=fog;
  ctx.shadowColor=col; ctx.shadowBlur=24*s;
  ctx.beginPath(); ctx.ellipse(x,y+thick,r,rt,0,0,Math.PI*2);
  ctx.fillStyle=shadeA(col,-75,0.95); ctx.fill();
  ctx.shadowBlur=0;
  ctx.beginPath();
  ctx.moveTo(x-r,y); ctx.lineTo(x-r,y+thick);
  ctx.lineTo(x+r,y+thick); ctx.lineTo(x+r,y);
  ctx.closePath();
  const sideg=ctx.createLinearGradient(x-r,0,x+r,0);
  sideg.addColorStop(0,shadeA(col,-40,0.95));
  sideg.addColorStop(0.5,shadeA(col,-65,0.95));
  sideg.addColorStop(1,shadeA(col,-40,0.95));
  ctx.fillStyle=sideg; ctx.fill();
  const grd=ctx.createRadialGradient(x-r*0.3,y-rt*0.5,r*0.1,x,y,r);
  grd.addColorStop(0,'#ffffff');
  grd.addColorStop(0.30,shade(col,60));
  grd.addColorStop(0.75,col);
  grd.addColorStop(1,shade(col,-30));
  ctx.beginPath(); ctx.ellipse(x,y,r,rt,0,0,Math.PI*2); ctx.fillStyle=grd; ctx.fill();
  ctx.lineWidth=Math.max(1,1.8*s); ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x-r*0.28,y-rt*0.35,r*0.34,rt*0.28,-0.5,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,.55)'; ctx.fill();
  ctx.restore();
}

function drawFrets(alpha){
  const t=audioTime();
  const bp=60/(CHART.bpm||120);
  const pulse = state==='play' ? (0.5+0.5*Math.pow(1-((t%bp)/bp),3)) : 0.5;
  ctx.save(); ctx.globalAlpha=alpha;
  const lx=G.nearLaneX[0]-G.laneW/2, rx=G.nearLaneX[3]+G.laneW/2;
  const gl=ctx.createLinearGradient(lx,0,rx,0);
  gl.addColorStop(0,'rgba(124,92,255,0.0)');
  gl.addColorStop(0.5,`rgba(190,205,255,${0.55+0.4*hitLineFlash})`);
  gl.addColorStop(1,'rgba(49,224,208,0.0)');
  ctx.shadowColor='rgba(150,170,255,0.8)'; ctx.shadowBlur=10+18*hitLineFlash;
  ctx.strokeStyle=gl; ctx.lineWidth=3+3*hitLineFlash;
  ctx.beginPath(); ctx.moveTo(lx,G.strikeY); ctx.lineTo(rx,G.strikeY); ctx.stroke();
  ctx.shadowBlur=0;

  for(let i=0;i<LANES;i++){
    const x=G.nearLaneX[i], y=G.strikeY, r=G.fretR;
    const col=LANE_COL[i];
    const held=keyHeld[i];
    const hg=hitGlow[i];
    const active = held || laneFlash[i]>0.1 || hg>0.05;
    if(hg>0.02){
      const bloom=ctx.createRadialGradient(x,y,r*0.3,x,y,r*(2.2+hg));
      bloom.addColorStop(0,hexA(col,0.55*Math.min(1,hg)));
      bloom.addColorStop(1,hexA(col,0));
      ctx.fillStyle=bloom;
      ctx.beginPath(); ctx.arc(x,y,r*(2.2+hg),0,Math.PI*2); ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(x,y+r*0.22,r*1.02,r*0.5,0,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fill();
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    ctx.lineWidth=3; ctx.strokeStyle=hexA(col, active?1:0.8);
    ctx.shadowColor=col; ctx.shadowBlur=active?(24+20*hg):10*pulse; ctx.stroke();
    ctx.shadowBlur=0;
    const dome=ctx.createRadialGradient(x-r*0.3,y-r*0.35,r*0.1,x,y,r*0.9);
    const baseA=active?0.6:0.14+0.12*pulse;
    dome.addColorStop(0,shadeA(col,80,baseA+0.2));
    dome.addColorStop(1,hexA(col,baseA*0.5));
    ctx.beginPath(); ctx.arc(x,y,r*0.84,0,Math.PI*2); ctx.fillStyle=dome; ctx.fill();
    const popAmt=Math.max(laneFlash[i],hg*0.8);
    if(popAmt>0.02){
      ctx.beginPath(); ctx.arc(x,y,r*(1+popAmt*0.6),0,Math.PI*2);
      ctx.strokeStyle=hexA('#ffffff', popAmt*0.7); ctx.lineWidth=2; ctx.stroke();
    }
    if(!('ontouchstart' in window)){
      ctx.fillStyle=active?'rgba(255,255,255,.95)':'rgba(255,255,255,.6)';
      ctx.font='700 13px "Chakra Petch"'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(LANE_KEYS[i].toUpperCase(), x, y);
    }
  }
  ctx.restore();
}

function drawParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.16; p.vx*=0.99; p.life-=dt*1.5;
    if(p.life<=0){ particles.splice(i,1); continue; }
    ctx.globalAlpha=Math.max(0,p.life);
    ctx.shadowColor=p.col; ctx.shadowBlur=8;
    ctx.fillStyle=p.spark?'#ffffff':p.col;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r*Math.max(0.2,p.life),0,Math.PI*2); ctx.fill();
  }
  ctx.shadowBlur=0; ctx.globalAlpha=1;
}
function drawPops(dt){
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(let i=pops.length-1;i>=0;i--){
    const p=pops[i]; p.life-=dt*1.5; p.y-=dt*46;
    if(p.life<=0){ pops.splice(i,1); continue; }
    const sc=1+(1-p.life)*0.15;
    ctx.globalAlpha=Math.min(1,p.life*1.5);
    ctx.font=`700 ${Math.round(19*sc)}px "Chakra Petch"`; ctx.fillStyle=p.col;
    ctx.shadowColor=p.col; ctx.shadowBlur=14;
    ctx.fillText(p.txt,p.x,p.y);
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;
}
function drawProgress(){
  const t=Math.max(0,audioTime());
  const f=Math.min(1,t/songDur);
  const y=6, w=W*0.5, x=(W-w)/2;
  ctx.fillStyle='rgba(255,255,255,.08)'; roundRect(x,y,w,4,2); ctx.fill();
  ctx.fillStyle='rgba(180,200,255,.75)'; roundRect(x,y,w*f,4,2); ctx.fill();
}

function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath(); }
function hexA(hex,a){ const c=hex.replace('#',''); const n=parseInt(c.length===3?c.split('').map(x=>x+x).join(''):c,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
function _clip(v){ return Math.max(0,Math.min(255,v|0)); }
function shadeRGB(hex,amt){ const c=hex.replace('#',''); const n=parseInt(c,16);
  return [_clip(((n>>16)&255)+amt), _clip(((n>>8)&255)+amt), _clip((n&255)+amt)]; }
function shade(hex,amt){ const [r,g,b]=shadeRGB(hex,amt); return `rgb(${r},${g},${b})`; }
function shadeA(hex,amt,a){ const [r,g,b]=shadeRGB(hex,amt); return `rgba(${r},${g},${b},${a})`; }
