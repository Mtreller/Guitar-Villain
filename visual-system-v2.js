/* Guitar Villain — canonical visual system v2
   Fire/ember presentation pass. Timing, scoring and audio stay in the stable runtime. */
(function(){
  const baseParticles = drawParticles;
  const baseRegisterHit = registerHit;
  const impacts=[];
  const embers=[];
  const crowd=[
    [0.08,.36,.7],[.15,.31,.4],[.22,.39,.8],[.29,.34,.5],
    [.70,.33,.6],[.77,.39,.8],[.85,.31,.45],[.92,.37,.7],
    [.11,.46,.35],[.20,.43,.55],[.81,.44,.45],[.90,.47,.35]
  ];
  let smoothShakeX=0,smoothShakeY=0;
  let smoothSongTime=null,lastWall=0,lastState='';
  let emberBudget=0;

  function heatLevel(){
    if(odActive) return 1;
    if(combo>=50) return 1;
    if(combo>=30) return .82;
    if(combo>=20) return .58;
    if(combo>=10) return .32;
    return 0;
  }
  function roundedRectPath(x,y,w,h,r){
    r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  }
  function spotlight(x,topY,targetX,targetY,col,alpha){
    const g=ctx.createLinearGradient(x,topY,targetX,targetY);
    g.addColorStop(0,hexA(col,alpha));g.addColorStop(.62,hexA(col,alpha*.30));g.addColorStop(1,hexA(col,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-12,topY);ctx.lineTo(x+12,topY);
    ctx.lineTo(targetX+W*.13,targetY);ctx.lineTo(targetX-W*.13,targetY);ctx.closePath();ctx.fill();
  }
  function speakerStack(x,y,w,h,flip){
    ctx.save();ctx.translate(x,y);ctx.rotate(flip?-.025:.025);
    const body=ctx.createLinearGradient(0,0,w,h);body.addColorStop(0,'rgba(42,25,23,.96)');body.addColorStop(.5,'rgba(15,13,16,.98)');body.addColorStop(1,'rgba(58,29,20,.91)');
    roundedRectPath(0,0,w,h,8);ctx.fillStyle=body;ctx.fill();ctx.strokeStyle='rgba(255,188,105,.14)';ctx.lineWidth=1;ctx.stroke();
    for(const cy of [h*.31,h*.72]){
      const rg=ctx.createRadialGradient(w*.5,cy,2,w*.5,cy,w*.28);rg.addColorStop(0,'rgba(105,58,34,.44)');rg.addColorStop(.32,'rgba(27,22,22,.98)');rg.addColorStop(.8,'rgba(7,7,9,.99)');rg.addColorStop(1,'rgba(122,54,24,.24)');
      ctx.fillStyle=rg;ctx.beginPath();ctx.arc(w*.5,cy,w*.28,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,226,184,.06)';ctx.stroke();
      ctx.fillStyle='rgba(220,91,34,.22)';ctx.beginPath();ctx.arc(w*.5,cy,w*.075,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function syncedVisualTime(){
    const raw=audioTime(),wall=performance.now()/1000;
    if(smoothSongTime===null||state!=='play'||lastState!=='play'||Math.abs(raw-smoothSongTime)>.18) smoothSongTime=raw;
    else{const dt=Math.min(.05,Math.max(0,wall-lastWall));smoothSongTime+=dt;smoothSongTime+=(raw-smoothSongTime)*Math.min(1,dt*8);}
    lastWall=wall;lastState=state;return smoothSongTime;
  }
  function gearPath(cx,cy,r,teeth){
    ctx.beginPath();for(let i=0;i<teeth*2;i++){const a=-Math.PI/2+i*Math.PI/teeth,rr=i%2===0?r:r*.84;const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.76;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();
  }
  function badgePath(x,y,r,ys=.78){
    ctx.beginPath();for(let i=0;i<12;i++){const a=-Math.PI/2+Math.PI*2*i/12,rr=i%2===0?r:r*.82;const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*ys;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();
  }
  function ribbonPoint(lane,f,widthScale=1){
    const cf=Math.max(-.05,Math.min(1.05,f)),s=scaleAt(Math.max(0,cf));return{x:projX(lane,cf),y:projY(cf),half:G.laneW*.15*s*widthScale};
  }
  function fillRibbon(lane,start,end,widthScale,fillStyle){
    const count=PERF_MOBILE?18:28,left=[],right=[];
    for(let i=0;i<=count;i++){const p=ribbonPoint(lane,start+(end-start)*(i/count),widthScale);left.push([p.x-p.half,p.y]);right.push([p.x+p.half,p.y]);}
    ctx.beginPath();ctx.moveTo(left[0][0],left[0][1]);for(let i=1;i<left.length;i++)ctx.lineTo(left[i][0],left[i][1]);for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i][0],right[i][1]);ctx.closePath();ctx.fillStyle=fillStyle;ctx.fill();
  }

  function spawnEmbers(dt,heat){
    if(state!=='play'||heat<.18)return;
    const rate=(PERF_MOBILE?5:10)+(PERF_MOBILE?9:18)*heat;
    emberBudget+=dt*rate;
    while(emberBudget>=1){
      emberBudget-=1;
      const fromStrike=Math.random()<.62;
      const side=Math.random()<.5?-1:1;
      embers.push({
        x:fromStrike?G.cx+(Math.random()-.5)*G.laneW*3.7:(side<0?G.nearLaneX[0]-G.laneW*.62:G.nearLaneX[3]+G.laneW*.62),
        y:fromStrike?G.strikeY+Math.random()*G.fretR*.8:G.strikeY-Math.random()*H*.22,
        vx:(Math.random()-.5)*(12+heat*20),vy:-(18+Math.random()*36+heat*26),
        life:0,max:.55+Math.random()*.7,size:.7+Math.random()*1.8,hot:Math.random()
      });
    }
    const cap=PERF_MOBILE?20:38;if(embers.length>cap)embers.splice(0,embers.length-cap);
  }
  function drawEmbers(dt,heat){
    spawnEmbers(dt,heat);if(!embers.length)return;
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let i=embers.length-1;i>=0;i--){
      const e=embers[i];e.life+=dt;if(e.life>=e.max){embers.splice(i,1);continue;}
      e.x+=e.vx*dt;e.y+=e.vy*dt;e.vx*=.992;e.vy-=2*dt;
      const q=e.life/e.max,a=(1-q)*(.35+.55*heat),r=e.size*(1-q*.35);
      ctx.fillStyle=e.hot>.72?`rgba(255,246,184,${a})`:e.hot>.3?`rgba(255,151,54,${a})`:`rgba(211,61,22,${a*.8})`;
      ctx.beginPath();ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function drawFlameEdges(heat){
    if(heat<.38)return;
    const t=performance.now()/1000,nearL=G.nearLaneX[0]-G.laneW/2,nearR=G.nearLaneX[3]+G.laneW/2;
    ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';
    const tongues=PERF_MOBILE?3:5;
    for(const side of [-1,1]){
      const x0=side<0?nearL-2:nearR+2;
      for(let i=0;i<tongues;i++){
        const p=(i+.35)/tongues,y0=G.strikeY-(H-G.strikeY)*p*.62;
        const wave=Math.sin(t*4.2+i*2.1+side)*G.laneW*.035;
        const len=(16+24*heat)*(1-.35*p)*(1+.18*Math.sin(t*6+i));
        const g=ctx.createLinearGradient(x0,y0,x0-side*len,y0-len);
        g.addColorStop(0,`rgba(255,86,22,${.10+.18*heat})`);g.addColorStop(.42,`rgba(255,166,57,${.08+.16*heat})`);g.addColorStop(1,'rgba(255,228,137,0)');
        ctx.strokeStyle=g;ctx.lineWidth=1.5+heat*2;ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(x0-side*(len*.35)+wave,y0-len*.35,x0-side*len*.35,y0-len);ctx.stroke();
      }
    }
    ctx.restore();
  }

  render=function(dt){
    const step=Math.min(.034,Math.max(0,dt||0)),shake=shakeAmt||0;
    if(shake>.01){const tx=(Math.random()*2-1)*shake*3.0,ty=(Math.random()*2-1)*shake*2.2,ease=Math.min(1,step*11);smoothShakeX+=(tx-smoothShakeX)*ease;smoothShakeY+=(ty-smoothShakeY)*ease;}
    else{const decay=Math.max(0,1-step*14);smoothShakeX*=decay;smoothShakeY*=decay;}
    ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(smoothShakeX,smoothShakeY);drawBackground(step);
    if(state==='menu'){drawHighway(.45);drawSideRails(.45);drawFrets(.82);ctx.restore();return;}
    drawHighway(1);drawFlameEdges(heatLevel());drawSideRails(1);if(!PERF_MOBILE)drawNoteShadows();drawNotes();drawFrets(1);drawParticles(step);drawPops(step);ctx.restore();drawProgress();
  };

  drawBackground=function(dt){
    const heat=heatLevel(),power=odActive?1:0;
    ctx.save();
    let g=ctx.createRadialGradient(W*.5,H*.10,8,W*.5,H*.24,H*.9);
    g.addColorStop(0,power?'rgba(255,228,144,.22)':`rgba(135,43,20,${.11+heat*.16})`);
    g.addColorStop(.42,`rgba(83,26,19,${.12+heat*.08})`);g.addColorStop(1,'rgba(6,6,10,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H*.78);
    g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'rgba(42,12,10,.58)');g.addColorStop(.15,'rgba(20,10,12,.18)');g.addColorStop(.5,'rgba(0,0,0,0)');g.addColorStop(.85,'rgba(20,10,12,.18)');g.addColorStop(1,'rgba(42,12,10,.58)');ctx.fillStyle=g;ctx.fillRect(0,H*.08,W,H*.72);
    ctx.globalCompositeOperation='screen';
    spotlight(W*.19,H*.02,W*.43,H*.49,'#ff7a2a',.07+heat*.08);
    spotlight(W*.81,H*.02,W*.57,H*.49,'#ffb14a',.06+heat*.07);
    if(combo>=20||odActive)spotlight(W*.50,0,W*.50,H*.44,odActive?'#fff0ad':'#ffcf62',.05+heat*.10+power*.06);
    ctx.globalCompositeOperation='source-over';
    const sw=Math.max(38,W*.105),sh=Math.max(92,H*.18);speakerStack(W*.012,H*.31,sw,sh,false);speakerStack(W-sw-W*.012,H*.31,sw,sh,true);
    const tm=performance.now()/1000,palette=['#ffb04a','#ff6a2a','#ffd67d'];
    for(let i=0;i<crowd.length;i++){
      const p=crowd[i],f=.55+.45*Math.sin(tm*(.7+p[2])+i*1.7);ctx.globalAlpha=.12+.18*f+heat*.08;ctx.fillStyle=palette[i%palette.length];ctx.beginPath();ctx.arc(p[0]*W,p[1]*H,1.2+p[2]*1.2,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    const ry=G.horizonY+10;g=ctx.createLinearGradient(0,ry,0,ry+30);g.addColorStop(0,`rgba(173,73,28,${.17+heat*.08})`);g.addColorStop(.38,'rgba(31,18,18,.82)');g.addColorStop(1,'rgba(5,5,8,0)');ctx.fillStyle=g;ctx.fillRect(W*.17,ry,W*.66,30);
    drawEmbers(dt,heat*.55);ctx.restore();
  };

  drawHighway=function(alpha){
    ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.lineJoin='round';
    const ty=G.horizonY,nearL=G.nearLaneX[0]-G.laneW/2,nearR=G.nearLaneX[3]+G.laneW/2,farL=G.cx+(nearL-G.cx)*SCALE_TOP,farR=G.cx+(nearR-G.cx)*SCALE_TOP,heat=heatLevel();
    ctx.beginPath();ctx.moveTo(farL-7,ty-2);ctx.lineTo(farR+7,ty-2);ctx.lineTo(nearR+18,H);ctx.lineTo(nearL-18,H);ctx.closePath();let g=ctx.createLinearGradient(0,ty,0,H);g.addColorStop(0,'rgba(0,0,0,.20)');g.addColorStop(1,'rgba(0,0,0,.76)');ctx.fillStyle=g;ctx.fill();
    ctx.beginPath();ctx.moveTo(farL,ty);ctx.lineTo(farR,ty);ctx.lineTo(nearR,H);ctx.lineTo(nearL,H);ctx.closePath();g=ctx.createLinearGradient(0,ty,0,H);g.addColorStop(0,'rgba(24,17,19,.66)');g.addColorStop(.46,'rgba(37,24,24,.90)');g.addColorStop(.8,'rgba(47,27,24,.97)');g.addColorStop(1,'rgba(28,18,19,.995)');ctx.fillStyle=g;ctx.fill();
    if(heat>.1){g=ctx.createLinearGradient(nearL,0,nearR,0);g.addColorStop(0,`rgba(255,92,25,${.018+heat*.025})`);g.addColorStop(.5,`rgba(255,203,112,${.02+heat*.03})`);g.addColorStop(1,`rgba(255,92,25,${.018+heat*.025})`);ctx.fillStyle=g;ctx.fill();}
    for(let i=0;i<LANES;i++){
      const nxL=G.nearLaneX[i]-G.laneW/2,nxR=G.nearLaneX[i]+G.laneW/2,fxL=G.cx+(nxL-G.cx)*SCALE_TOP,fxR=G.cx+(nxR-G.cx)*SCALE_TOP;
      const glow=Math.max((laneFlash[i]||0)*.55,(beamGlow[i]||0)*.68,keyHeld[i]?.58:0);
      if(glow>.01){const lg=ctx.createLinearGradient(0,ty,0,G.strikeY);lg.addColorStop(0,hexA(LANE_COL[i],0));lg.addColorStop(.72,hexA(LANE_COL[i],.04*glow));lg.addColorStop(1,hexA(LANE_COL[i],.20*glow));ctx.beginPath();ctx.moveTo(fxL,ty);ctx.lineTo(fxR,ty);ctx.lineTo(nxR,H);ctx.lineTo(nxL,H);ctx.closePath();ctx.fillStyle=lg;ctx.fill();}
    }
    for(let i=0;i<=LANES;i++){const nx=nearL+i*G.laneW,fx=G.cx+(nx-G.cx)*SCALE_TOP;g=ctx.createLinearGradient(0,ty,0,H);g.addColorStop(0,'rgba(222,184,148,.045)');g.addColorStop(.55,'rgba(206,164,126,.14)');g.addColorStop(1,'rgba(247,200,154,.28)');ctx.strokeStyle=g;ctx.lineWidth=PERF_MOBILE?1:1.25;ctx.beginPath();ctx.moveTo(fx,ty);ctx.lineTo(nx,H);ctx.stroke();}
    const visualT=syncedVisualTime(),rungCount=10,rungSpacing=APPROACH/rungCount,phase=((visualT%rungSpacing)+rungSpacing)%rungSpacing/rungSpacing;
    for(let k=0;k<rungCount;k++){const frac=((k+(1-phase))*rungSpacing)/APPROACH;if(frac<.018||frac>.985)continue;const y=projY(frac),s=scaleAt(frac),lx=G.cx+(nearL-G.cx)*s,rx=G.cx+(nearR-G.cx)*s,a=(.03+.12*Math.pow(1-frac,1.1))*Math.min(1,frac*7,(1-frac)*8);ctx.strokeStyle=`rgba(222,158,108,${a})`;ctx.lineWidth=Math.max(.7,2.0*s);ctx.beginPath();ctx.moveTo(lx,y);ctx.lineTo(rx,y);ctx.stroke();if(!PERF_MOBILE&&frac<.55){ctx.strokeStyle=`rgba(255,229,184,${a*.22})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(lx,y-1);ctx.lineTo(rx,y-1);ctx.stroke();}}
    ctx.restore();
  };

  drawSideRails=function(alpha){
    const ty=G.horizonY,nearL=G.nearLaneX[0]-G.laneW/2,nearR=G.nearLaneX[3]+G.laneW/2,farL=G.cx+(nearL-G.cx)*SCALE_TOP,farR=G.cx+(nearR-G.cx)*SCALE_TOP,heat=heatLevel();
    ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';
    for(const [fx,nx] of [[farL,nearL],[farR,nearR]]){
      ctx.shadowColor=odActive?'#fff0ae':'#ff7a28';ctx.shadowBlur=PERF_MOBILE?4:7+heat*13;ctx.strokeStyle=odActive?'rgba(255,239,174,.86)':`rgba(255,112,39,${.48+heat*.34})`;ctx.lineWidth=2.2+heat*1.2;ctx.beginPath();ctx.moveTo(fx,ty);ctx.lineTo(nx,H);ctx.stroke();
      ctx.shadowBlur=0;ctx.strokeStyle=`rgba(255,220,169,${.38+heat*.35})`;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(fx,ty);ctx.lineTo(nx,H);ctx.stroke();
    }
    ctx.restore();
  };

  drawTail=function(lane,headFrac,tailFrac,n){
    const start=Math.max(-.05,Math.min(headFrac,tailFrac)),end=Math.min(1.05,Math.max(headFrac,tailFrac));if(end-start<.002)return;
    const col=LANE_COL[lane],active=!!n.holdActive,p0=ribbonPoint(lane,start),p1=ribbonPoint(lane,end);ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    if(!PERF_MOBILE||active){const count=PERF_MOBILE?14:22;ctx.beginPath();for(let i=0;i<=count;i++){const p=ribbonPoint(lane,start+(end-start)*(i/count));if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=hexA(col,active?.34:.18);ctx.lineWidth=Math.max(3,G.laneW*.26*scaleAt(Math.max(0,start)));ctx.shadowColor=col;ctx.shadowBlur=PERF_MOBILE?5:10;ctx.stroke();ctx.shadowBlur=0;}
    let g=ctx.createLinearGradient(p0.x,p0.y,p1.x,p1.y);g.addColorStop(0,shadeA(col,-18,active?.96:.82));g.addColorStop(.55,hexA(col,active?.93:.74));g.addColorStop(1,shadeA(col,18,active?.88:.68));fillRibbon(lane,start,end,1,g);
    g=ctx.createLinearGradient(p0.x,p0.y,p1.x,p1.y);g.addColorStop(0,'rgba(255,255,255,.34)');g.addColorStop(.5,active?'rgba(255,255,255,.50)':'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(255,255,255,.10)');fillRibbon(lane,start,end,.34,g);
    const cap=ribbonPoint(lane,end),cs=scaleAt(Math.max(0,end));ctx.fillStyle=hexA(col,active?.95:.82);ctx.shadowColor=col;ctx.shadowBlur=PERF_MOBILE?4:8;ctx.beginPath();ctx.ellipse(cap.x,cap.y,Math.max(2,cap.half),Math.max(1.5,G.laneW*.085*cs),0,0,Math.PI*2);ctx.fill();ctx.restore();
  };

  drawGem=function(lane,frac,n){
    const cf=Math.max(-.12,frac),x=projX(lane,Math.max(0,frac)),y=projY(cf),s=scaleAt(Math.max(0,frac));const r=G.fretR*.86*s,col=LANE_COL[lane],fog=Math.min(1,(1-frac)*1.45+.26),thick=r*.26;
    ctx.save();ctx.globalAlpha=fog;ctx.lineJoin='round';ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y+thick+r*.34,r*.90,r*.22,0,0,Math.PI*2);ctx.fill();
    badgePath(x,y+thick,r,.76);ctx.fillStyle=shadeA(col,-68,.94);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.34)';ctx.lineWidth=Math.max(.8,1.4*s);ctx.stroke();
    const face=ctx.createRadialGradient(x-r*.28,y-r*.34,r*.05,x,y,r);face.addColorStop(0,'rgba(255,255,255,.98)');face.addColorStop(.18,shade(col,92));face.addColorStop(.48,shade(col,34));face.addColorStop(.8,col);face.addColorStop(1,shade(col,-30));ctx.shadowColor=col;ctx.shadowBlur=PERF_MOBILE?4:8*s;badgePath(x,y,r,.76);ctx.fillStyle=face;ctx.fill();ctx.shadowBlur=0;
    badgePath(x,y,r,.76);ctx.strokeStyle='rgba(255,233,196,.92)';ctx.lineWidth=Math.max(1.1,2*s);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.66)';ctx.beginPath();ctx.ellipse(x-r*.27,y-r*.25,r*.17,r*.09,-.45,0,Math.PI*2);ctx.fill();ctx.restore();
  };

  drawFrets=function(alpha){
    ctx.save();ctx.globalAlpha=alpha;const y=G.strikeY,r=G.fretR,left=G.nearLaneX[0]-r*1.48,right=G.nearLaneX[3]+r*1.48,panelY=y-r*.73,panelH=r*1.72,heat=heatLevel();
    let g=ctx.createLinearGradient(0,panelY,0,panelY+panelH);g.addColorStop(0,'rgba(121,64,39,.95)');g.addColorStop(.2,'rgba(71,37,30,.99)');g.addColorStop(.72,'rgba(31,22,24,.995)');g.addColorStop(1,'rgba(16,14,17,.995)');roundedRectPath(left,panelY,right-left,panelH,16);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=`rgba(255,177,105,${.18+heat*.10})`;ctx.lineWidth=1.4;ctx.stroke();
    g=ctx.createLinearGradient(left,0,right,0);g.addColorStop(0,'rgba(221,112,50,.26)');g.addColorStop(.5,`rgba(255,225,170,${.58+heat*.20})`);g.addColorStop(1,'rgba(221,112,50,.26)');ctx.shadowColor='#ff7b2e';ctx.shadowBlur=PERF_MOBILE?3:heat*9;ctx.strokeStyle=g;ctx.lineWidth=3.2+hitLineFlash*1.8;ctx.beginPath();ctx.moveTo(left+8,panelY+2);ctx.lineTo(right-8,panelY+2);ctx.stroke();ctx.shadowBlur=0;
    for(let i=0;i<LANES;i++){
      const x=G.nearLaneX[i],col=LANE_COL[i],response=Math.min(1,Math.max(keyHeld[i]?.88:0,(laneFlash[i]||0)*.96,(hitGlow[i]||0)*.84)),cy=y+response*.10*r;
      gearPath(x,cy,r*1.20,6);const shell=ctx.createRadialGradient(x-r*.30,cy-r*.28,r*.10,x,cy,r*1.25);shell.addColorStop(0,shadeA(col,52,.98));shell.addColorStop(.48,hexA(col,.92));shell.addColorStop(1,shadeA(col,-58,.96));ctx.shadowColor=col;ctx.shadowBlur=PERF_MOBILE?4+response*5:7+response*9;ctx.fillStyle=shell;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,243,221,.34)';ctx.lineWidth=1.25;ctx.stroke();
      const cap=ctx.createRadialGradient(x-r*.24,cy-r*.26,r*.05,x,cy,r*.72);cap.addColorStop(0,'rgba(255,255,255,.98)');cap.addColorStop(.22,shadeA(col,76,1));cap.addColorStop(.70,hexA(col,1));cap.addColorStop(1,shadeA(col,-30,1));ctx.beginPath();ctx.ellipse(x,cy-r*.02,r*.61,r*.49,0,0,Math.PI*2);ctx.fillStyle=cap;ctx.fill();ctx.strokeStyle='rgba(255,244,225,.70)';ctx.lineWidth=1.35;ctx.stroke();
    }
    ctx.restore();
  };

  registerHit=function(n,grade,lane){
    baseRegisterHit(n,grade,lane);const strength=grade==='perfect'?1:grade==='great'?.72:.48;impacts.push({lane,grade,col:LANE_COL[lane],life:0,max:grade==='perfect'?.44:.34,strength});const max=PERF_MOBILE?8:14;if(impacts.length>max)impacts.splice(0,impacts.length-max);
  };
  function drawImpactBursts(dt){
    if(!impacts.length)return;ctx.save();ctx.lineCap='round';ctx.globalCompositeOperation='screen';
    for(let i=impacts.length-1;i>=0;i--){
      const b=impacts[i];b.life+=Math.min(.034,dt||0);const q=Math.min(1,b.life/b.max);if(q>=1){impacts.splice(i,1);continue;}
      const x=G.nearLaneX[b.lane],y=G.strikeY,ease=1-Math.pow(1-q,3),alpha=(1-q)*b.strength,radius=G.fretR*(1+ease*.8);
      ctx.strokeStyle=hexA(b.col,.42*alpha);ctx.lineWidth=Math.max(1,2.6*(1-q));ctx.beginPath();ctx.ellipse(x,y,radius,radius*.68,0,0,Math.PI*2);ctx.stroke();
      const rays=PERF_MOBILE?5:8;for(let r=0;r<rays;r++){const a=Math.PI*2*r/rays+b.lane*.31,inner=G.fretR*(.86+ease*.20),outer=G.fretR*(1.18+ease*(b.grade==='perfect'?1.15:.72));ctx.strokeStyle=r%3===0?`rgba(255,247,196,${.62*alpha})`:r%2?`rgba(255,160,54,${.68*alpha})`:`rgba(224,66,22,${.56*alpha})`;ctx.lineWidth=Math.max(.8,2.4*(1-q));ctx.beginPath();ctx.moveTo(x+Math.cos(a)*inner,y+Math.sin(a)*inner*.72);ctx.lineTo(x+Math.cos(a)*outer,y+Math.sin(a)*outer*.72);ctx.stroke();}
      if(b.grade==='perfect'){ctx.fillStyle=`rgba(255,242,174,${.42*alpha})`;ctx.beginPath();ctx.arc(x,y,Math.max(2,G.fretR*.20*(1-q)),0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }
  drawParticles=function(dt){baseParticles(dt);drawImpactBursts(dt);};
})();
