/* Guitar Villain — canonical visual system
   Owns gameplay presentation only. Timing/scoring/audio remain in engine/gameplay/arcade. */
(function(){
  const baseBackground=drawBackground;
  const baseParticles=drawParticles;
  const baseRegisterHit=registerHit;
  const impacts=[];
  const crowd=[
    [0.08,0.36,0.7],[0.15,0.31,0.4],[0.22,0.39,0.8],[0.29,0.34,0.5],
    [0.70,0.33,0.6],[0.77,0.39,0.8],[0.85,0.31,0.45],[0.92,0.37,0.7],
    [0.11,0.46,0.35],[0.20,0.43,0.55],[0.81,0.44,0.45],[0.90,0.47,0.35]
  ];
  let smoothShakeX=0,smoothShakeY=0;
  let smoothSongTime=null,lastWall=0,lastState='';

  function roundedRectPath(x,y,w,h,r){
    r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  }
  function speakerStack(x,y,w,h,flip){
    ctx.save();ctx.translate(x,y);ctx.rotate(flip?-.025:.025);
    const body=ctx.createLinearGradient(0,0,w,h);body.addColorStop(0,'rgba(33,25,29,.92)');body.addColorStop(.5,'rgba(14,14,20,.95)');body.addColorStop(1,'rgba(44,26,22,.88)');
    roundedRectPath(0,0,w,h,8);ctx.fillStyle=body;ctx.fill();ctx.strokeStyle='rgba(255,214,150,.12)';ctx.lineWidth=1;ctx.stroke();
    for(const cy of [h*.31,h*.72]){const rg=ctx.createRadialGradient(w*.5,cy,2,w*.5,cy,w*.28);rg.addColorStop(0,'rgba(73,70,77,.7)');rg.addColorStop(.35,'rgba(24,24,31,.96)');rg.addColorStop(.78,'rgba(8,8,13,.98)');rg.addColorStop(1,'rgba(85,52,38,.25)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(w*.5,cy,w*.28,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1.2;ctx.stroke();ctx.fillStyle='rgba(205,133,72,.22)';ctx.beginPath();ctx.arc(w*.5,cy,w*.075,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  function spotlight(x,topY,targetX,targetY,col,alpha){
    const g=ctx.createLinearGradient(x,topY,targetX,targetY);g.addColorStop(0,hexA(col,alpha));g.addColorStop(.6,hexA(col,alpha*.36));g.addColorStop(1,hexA(col,0));ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-12,topY);ctx.lineTo(x+12,topY);ctx.lineTo(targetX+W*.13,targetY);ctx.lineTo(targetX-W*.13,targetY);ctx.closePath();ctx.fill();
  }
  function syncedVisualTime(){
    const raw=audioTime(),wall=performance.now()/1000;
    if(smoothSongTime===null||state!=='play'||lastState!=='play'||Math.abs(raw-smoothSongTime)>.18) smoothSongTime=raw;
    else{const dt=Math.min(.05,Math.max(0,wall-lastWall));smoothSongTime+=dt;const error=raw-smoothSongTime;smoothSongTime+=error*Math.min(1,dt*8);}
    lastWall=wall;lastState=state;return smoothSongTime;
  }
  function gearPath(cx,cy,r,teeth){ctx.beginPath();const n=teeth*2;for(let i=0;i<n;i++){const a=-Math.PI/2+i*Math.PI*2/n,rr=i%2===0?r:r*.84,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.76;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();}
  function badgePath(x,y,r,ys){const points=12,inner=.82;ys=ys||.78;ctx.beginPath();for(let i=0;i<points;i++){const a=-Math.PI/2+Math.PI*2*i/points,rr=i%2===0?r:r*inner,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*ys;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();}
  function ribbonPoint(lane,f,widthScale){const cf=Math.max(-.05,Math.min(1.05,f)),s=scaleAt(Math.max(0,cf));return{x:projX(lane,cf),y:projY(cf),half:G.laneW*.15*s*(widthScale||1)};}
  function fillRibbon(lane,start,end,widthScale,fillStyle){const count=PERF_MOBILE?20:30,left=[],right=[];for(let i=0;i<=count;i++){const q=i/count,p=ribbonPoint(lane,start+(end-start)*q,widthScale);left.push({x:p.x-p.half,y:p.y});right.push({x:p.x+p.half,y:p.y});}ctx.beginPath();ctx.moveTo(left[0].x,left[0].y);for(let i=1;i<left.length;i++)ctx.lineTo(left[i].x,left[i].y);for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i].x,right[i].y);ctx.closePath();ctx.fillStyle=fillStyle;ctx.fill();}

  render=function(dt){
    const step=Math.min(.034,Math.max(0,dt||0)),shake=shakeAmt||0;
    if(shake>.01){const tx=(Math.random()*2-1)*shake*3.2,ty=(Math.random()*2-1)*shake*2.4,e=Math.min(1,step*11);smoothShakeX+=(tx-smoothShakeX)*e;smoothShakeY+=(ty-smoothShakeY)*e;}else{const d=Math.max(0,1-step*14);smoothShakeX*=d;smoothShakeY*=d;}
    ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(smoothShakeX,smoothShakeY);drawBackground(step);
    if(state==='menu'){drawHighway(.45);drawSideRails(.4);drawFrets(.82);ctx.restore();return;}
    drawHighway(1);drawSideRails(1);if(!PERF_MOBILE)drawNoteShadows();drawNotes();drawFrets(1);drawParticles(step);drawPops(step);ctx.restore();drawProgress();
  };

  drawBackground=function(dt){
    baseBackground(dt);const energy=Math.min(1,combo/40),power=odActive?1:0;ctx.save();
    const wash=ctx.createLinearGradient(0,0,0,H*.72);wash.addColorStop(0,'rgba(52,20,35,.12)');wash.addColorStop(.48,`rgba(74,34,29,${.08+energy*.05})`);wash.addColorStop(1,'rgba(5,6,15,0)');ctx.fillStyle=wash;ctx.fillRect(0,0,W,H*.76);
    const side=ctx.createLinearGradient(0,0,W,0);side.addColorStop(0,'rgba(41,12,24,.55)');side.addColorStop(.13,'rgba(18,10,20,.16)');side.addColorStop(.5,'rgba(0,0,0,0)');side.addColorStop(.87,'rgba(18,10,20,.16)');side.addColorStop(1,'rgba(41,12,24,.55)');ctx.fillStyle=side;ctx.fillRect(0,H*.08,W,H*.72);
    ctx.globalCompositeOperation='screen';spotlight(W*.20,H*.02,W*.42,H*.48,'#ffb36b',.09+energy*.06);spotlight(W*.80,H*.02,W*.58,H*.48,'#86d7ff',.08+energy*.05+power*.08);if(combo>=20||odActive)spotlight(W*.50,0,W*.50,H*.44,odActive?'#b9fff3':'#ffd66b',.06+energy*.06+power*.08);ctx.globalCompositeOperation='source-over';
    const sw=Math.max(38,W*.105),sh=Math.max(92,H*.18);speakerStack(W*.012,H*.31,sw,sh,false);speakerStack(W-sw-W*.012,H*.31,sw,sh,true);
    const tm=performance.now()/1000;for(let i=0;i<crowd.length;i++){const p=crowd[i],f=.55+.45*Math.sin(tm*(.7+p[2])+i*1.7);ctx.globalAlpha=.16+.18*f+energy*.06;ctx.fillStyle=i%3===0?'#ffd08a':i%3===1?'#85d7ff':'#e89cff';ctx.beginPath();ctx.arc(p[0]*W,p[1]*H,1.2+p[2]*1.2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    const ry=G.horizonY+10,riser=ctx.createLinearGradient(0,ry,0,ry+28);riser.addColorStop(0,'rgba(118,63,47,.22)');riser.addColorStop(.35,'rgba(30,20,24,.78)');riser.addColorStop(1,'rgba(5,5,9,0)');ctx.fillStyle=riser;ctx.fillRect(W*.18,ry,W*.64,30);ctx.restore();
  };

  drawHighway=function(alpha){
    ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.lineJoin='round';
    const ty=G.horizonY,nearL=G.nearLaneX[0]-G.laneW/2,nearR=G.nearLaneX[3]+G.laneW/2,farL=G.cx+(nearL-G.cx)*SCALE_TOP,farR=G.cx+(nearR-G.cx)*SCALE_TOP;
    ctx.beginPath();ctx.moveTo(farL-7,ty-2);ctx.lineTo(farR+7,ty-2);ctx.lineTo(nearR+18,H);ctx.lineTo(nearL-18,H);ctx.closePath();let g=ctx.createLinearGradient(0,ty,0,H);g.addColorStop(0,'rgba(0,0,0,.18)');g.addColorStop(1,'rgba(0,0,0,.72)');ctx.fillStyle=g;ctx.fill();
    ctx.beginPath();ctx.moveTo(farL,ty);ctx.lineTo(farR,ty);ctx.lineTo(nearR,H);ctx.lineTo(nearL,H);ctx.closePath();g=ctx.createLinearGradient(0,ty,0,H);g.addColorStop(0,'rgba(24,18,31,.60)');g.addColorStop(.45,'rgba(33,26,43,.86)');g.addColorStop(.80,'rgba(42,28,40,.96)');g.addColorStop(1,'rgba(28,19,27,.99)');ctx.fillStyle=g;ctx.fill();
    g=ctx.createLinearGradient(nearL,0,nearR,0);g.addColorStop(0,'rgba(255,184,116,.025)');g.addColorStop(.42,'rgba(255,255,255,.035)');g.addColorStop(.58,'rgba(255,255,255,.012)');g.addColorStop(1,'rgba(83,202,255,.022)');ctx.fillStyle=g;ctx.fill();
    for(let i=0;i<LANES;i++){const nxL=G.nearLaneX[i]-G.laneW/2,nxR=G.nearLaneX[i]+G.laneW/2,fxL=G.cx+(nxL-G.cx)*SCALE_TOP,fxR=G.cx+(nxR-G.cx)*SCALE_TOP,glow=Math.max(laneFlash[i]*.55,beamGlow[i]*.68,keyHeld[i]?.58:0);if(glow>.01){const lg=ctx.createLinearGradient(0,ty,0,G.strikeY);lg.addColorStop(0,hexA(LANE_COL[i],0));lg.addColorStop(.72,hexA(LANE_COL[i],.045*glow));lg.addColorStop(1,hexA(LANE_COL[i],.22*glow));ctx.beginPath();ctx.moveTo(fxL,ty);ctx.lineTo(fxR,ty);ctx.lineTo(nxR,H);ctx.lineTo(nxL,H);ctx.closePath();ctx.fillStyle=lg;ctx.fill();}}
    for(let i=0;i<=LANES;i++){const nx=nearL+i*G.laneW,fx=G.cx+(nx-G.cx)*SCALE_TOP,string=ctx.createLinearGradient(0,ty,0,H);string.addColorStop(0,'rgba(222,200,177,.055)');string.addColorStop(.55,'rgba(194,184,176,.15)');string.addColorStop(1,'rgba(235,211,181,.30)');ctx.strokeStyle=string;ctx.lineWidth=PERF_MOBILE?1:1.25;ctx.beginPath();ctx.moveTo(fx,ty);ctx.lineTo(nx,H);ctx.stroke();}
    const visualT=syncedVisualTime(),rungCount=10,rungSpacing=APPROACH/rungCount,phase=((visualT%rungSpacing)+rungSpacing)%rungSpacing/rungSpacing;
    for(let k=0;k<rungCount;k++){const frac=((k+(1-phase))*rungSpacing)/APPROACH;if(frac<.018||frac>.985)continue;const y=projY(frac),s=scaleAt(frac),lx=G.cx+(nearL-G.cx)*s,rx=G.cx+(nearR-G.cx)*s,a=(.035+.13*Math.pow(1-frac,1.1))*Math.min(1,frac*7,(1-frac)*8);ctx.strokeStyle=`rgba(201,173,151,${a})`;ctx.lineWidth=Math.max(.7,2.1*s);ctx.beginPath();ctx.moveTo(lx,y);ctx.lineTo(rx,y);ctx.stroke();if(!PERF_MOBILE&&frac<.55){ctx.strokeStyle=`rgba(255,242,221,${a*.22})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(lx,y-1);ctx.lineTo(rx,y-1);ctx.stroke();}}
    for(const [fx,nx] of [[farL,nearL],[farR,nearR]]){const edge=ctx.createLinearGradient(0,ty,0,H);edge.addColorStop(0,'rgba(220,198,176,.16)');edge.addColorStop(1,'rgba(255,221,181,.48)');ctx.strokeStyle=edge;ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(fx,ty);ctx.lineTo(nx,H);ctx.stroke();}ctx.restore();
  };

  drawTail=function(lane,headFrac,tailFrac,n){
    const start=Math.max(-.05,Math.min(headFrac,tailFrac)),end=Math.min(1.05,Math.max(headFrac,tailFrac));if(end-start<.002)return;const col=LANE_COL[lane],active=!!n.holdActive,p0=ribbonPoint(lane,start,1),p1=ribbonPoint(lane,end,1);ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    if(!PERF_MOBILE||active){const count=PERF_MOBILE?16:24;ctx.beginPath();for(let i=0;i<=count;i++){const p=ribbonPoint(lane,start+(end-start)*(i/count),1);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=hexA(col,active?.34:.18);ctx.lineWidth=Math.max(3,G.laneW*.26*scaleAt(Math.max(0,start)));ctx.shadowColor=col;ctx.shadowBlur=PERF_MOBILE?5:12;ctx.stroke();ctx.shadowBlur=0;}
    let grad=ctx.createLinearGradient(p0.x,p0.y,p1.x,p1.y);grad.addColorStop(0,shadeA(col,-18,active?.96:.82));grad.addColorStop(.55,hexA(col,active?.93:.74));grad.addColorStop(1,shadeA(col,18,active?.88:.68));fillRibbon(lane,start,end,1,grad);
    grad=ctx.createLinearGradient(p0.x,p0.y,p1.x,p1.y);grad.addColorStop(0,'rgba(255,255,255,.34)');grad.addColorStop(.5,active?'rgba(255,255,255,.50)':'rgba(255,255,255,.22)');grad.addColorStop(1,'rgba(255,255,255,.10)');fillRibbon(lane,start,end,.34,grad);
    const cap=ribbonPoint(lane,end,1),cs=scaleAt(Math.max(0,end));ctx.fillStyle=hexA(col,active?.95:.82);ctx.shadowColor=col;ctx.shadowBlur=PERF_MOBILE?4:9;ctx.beginPath();ctx.ellipse(cap.x,cap.y,Math.max(2,cap.half),Math.max(1.5,G.laneW*.085*cs),0,0,Math.PI*2);ctx.fill();ctx.restore();
  };

  drawGem=function(lane,frac,n){
    const cf=Math.max(-.12,frac),x=projX(lane,Math.max(0,frac)),y=projY(cf),s=scaleAt(Math.max(0,frac)),r=G.fretR*.86*s,col=LANE_COL[lane],fog=Math.min(1,(1-frac)*1.45+.26),thick=r*.26;ctx.save();ctx.globalAlpha=fog;ctx.lineJoin='round';
    ctx.fillStyle='rgba(0,0,0,.26)';ctx.beginPath();ctx.ellipse(x,y+thick+r*.34,r*.90,r*.22,0,0,Math.PI*2);ctx.fill();badgePath(x,y+thick,r,.76);ctx.fillStyle=shadeA(col,-68,.94);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.34)';ctx.lineWidth=Math.max(.8,1.4*s);ctx.stroke();
    const side=ctx.createLinearGradient(x-r,y,x+r,y+thick);side.addColorStop(0,shadeA(col,-28,.96));side.addColorStop(.52,shadeA(col,-58,.97));side.addColorStop(1,shadeA(col,-24,.95));ctx.fillStyle=side;ctx.beginPath();ctx.moveTo(x-r*.82,y-r*.20);ctx.lineTo(x-r*.82,y-r*.20+thick);ctx.lineTo(x+r*.82,y-r*.20+thick);ctx.lineTo(x+r*.82,y-r*.20);ctx.closePath();ctx.fill();
    const face=ctx.createRadialGradient(x-r*.28,y-r*.34,r*.05,x,y,r);face.addColorStop(0,'rgba(255,255,255,.98)');face.addColorStop(.18,shade(col,92));face.addColorStop(.48,shade(col,34));face.addColorStop(.80,col);face.addColorStop(1,shade(col,-30));ctx.shadowColor=col;ctx.shadowBlur=PERF_MOBILE?5:10*s;badgePath(x,y,r,.76);ctx.fillStyle=face;ctx.fill();ctx.shadowBlur=0;badgePath(x,y,r,.76);ctx.strokeStyle='rgba(255,238,207,.92)';ctx.lineWidth=Math.max(1.1,2*s);ctx.stroke();
    const core=ctx.createRadialGradient(x-r*.16,y-r*.17,r*.02,x,y,r*.58);core.addColorStop(0,'rgba(255,255,255,.36)');core.addColorStop(.55,hexA(col,.28));core.addColorStop(1,'rgba(0,0,0,.16)');ctx.fillStyle=core;ctx.beginPath();ctx.ellipse(x,y,r*.52,r*.35,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.24)';ctx.lineWidth=Math.max(.7,s);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.68)';ctx.beginPath();ctx.ellipse(x-r*.27,y-r*.25,r*.17,r*.09,-.45,0,Math.PI*2);ctx.fill();ctx.restore();
  };

  drawFrets=function(alpha){
    ctx.save();ctx.globalAlpha=alpha;const y=G.strikeY,r=G.fretR,left=G.nearLaneX[0]-r*1.48,right=G.nearLaneX[3]+r*1.48,panelY=y-r*.73,panelH=r*1.72;
    let panel=ctx.createLinearGradient(0,panelY,0,panelY+panelH);panel.addColorStop(0,'rgba(116,69,54,.94)');panel.addColorStop(.2,'rgba(70,42,39,.98)');panel.addColorStop(.72,'rgba(34,25,31,.99)');panel.addColorStop(1,'rgba(18,16,23,.99)');ctx.beginPath();ctx.moveTo(left+12,panelY);ctx.lineTo(right-12,panelY);ctx.quadraticCurveTo(right+8,panelY+7,right,panelY+22);ctx.lineTo(right-7,panelY+panelH-5);ctx.quadraticCurveTo(right-10,panelY+panelH+8,right-26,panelY+panelH+7);ctx.lineTo(left+26,panelY+panelH+7);ctx.quadraticCurveTo(left+10,panelY+panelH+8,left+7,panelY+panelH-5);ctx.lineTo(left,panelY+22);ctx.quadraticCurveTo(left-8,panelY+7,left+12,panelY);ctx.closePath();ctx.fillStyle=panel;ctx.fill();ctx.strokeStyle='rgba(255,205,154,.20)';ctx.lineWidth=1.4;ctx.stroke();
    const bridge=ctx.createLinearGradient(left,0,right,0);bridge.addColorStop(0,'rgba(207,148,96,.25)');bridge.addColorStop(.5,'rgba(248,218,174,.62)');bridge.addColorStop(1,'rgba(123,180,202,.24)');ctx.strokeStyle=bridge;ctx.lineWidth=3.2+hitLineFlash*1.8;ctx.beginPath();ctx.moveTo(left+8,panelY+2);ctx.lineTo(right-8,panelY+2);ctx.stroke();
    for(let i=0;i<LANES;i++){const x=G.nearLaneX[i],col=LANE_COL[i],response=Math.min(1,Math.max(keyHeld[i]?.88:0,(laneFlash[i]||0)*.96,(hitGlow[i]||0)*.84)),press=response*.10*r,cy=y+press;gearPath(x,cy,r*1.20,6);const shell=ctx.createRadialGradient(x-r*.30,cy-r*.28,r*.10,x,cy,r*1.25);shell.addColorStop(0,shadeA(col,52,.98));shell.addColorStop(.48,hexA(col,.92));shell.addColorStop(1,shadeA(col,-58,.96));ctx.shadowColor=col;ctx.shadowBlur=PERF_MOBILE?5+response*6:9+response*11;ctx.fillStyle=shell;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=1.25;ctx.stroke();ctx.beginPath();ctx.ellipse(x,cy+r*.08,r*.74,r*.55,0,0,Math.PI*2);ctx.fillStyle='rgba(16,15,21,.74)';ctx.fill();const cap=ctx.createRadialGradient(x-r*.24,cy-r*.26,r*.05,x,cy,r*.72);cap.addColorStop(0,'rgba(255,255,255,.98)');cap.addColorStop(.22,shadeA(col,76,1));cap.addColorStop(.70,hexA(col,1));cap.addColorStop(1,shadeA(col,-30,1));ctx.beginPath();ctx.ellipse(x,cy-r*.02,r*.61,r*.49,0,0,Math.PI*2);ctx.fillStyle=cap;ctx.fill();ctx.strokeStyle='rgba(255,244,225,.70)';ctx.lineWidth=1.35;ctx.stroke();ctx.beginPath();ctx.ellipse(x-r*.16,cy-r*.18,r*.24,r*.12,-.28,Math.PI*.92,Math.PI*1.82);ctx.strokeStyle='rgba(255,255,255,.52)';ctx.lineWidth=1.15;ctx.stroke();if(response>.03){ctx.beginPath();ctx.arc(x,cy,r*(1.25+response*.18),0,Math.PI*2);ctx.strokeStyle=hexA('#ffffff',.20+.42*response);ctx.lineWidth=1.5;ctx.stroke();}}
    ctx.restore();
  };

  registerHit=function(n,grade,lane){
    baseRegisterHit(n,grade,lane);const strength=grade==='perfect'?1:grade==='great'?.72:.48;impacts.push({lane,grade,col:LANE_COL[lane],life:0,max:grade==='perfect'?.42:.32,strength});const max=PERF_MOBILE?8:14;if(impacts.length>max)impacts.splice(0,impacts.length-max);
  };
  function drawImpactBursts(dt){
    if(!impacts.length)return;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';for(let i=impacts.length-1;i>=0;i--){const b=impacts[i];b.life+=Math.min(.034,dt||0);const q=Math.min(1,b.life/b.max);if(q>=1){impacts.splice(i,1);continue;}const x=G.nearLaneX[b.lane],y=G.strikeY,ease=1-Math.pow(1-q,3),alpha=(1-q)*b.strength,base=G.fretR*(1+ease*.8);ctx.strokeStyle=hexA(b.col,.68*alpha);ctx.lineWidth=Math.max(1,3.2*(1-q));ctx.beginPath();ctx.ellipse(x,y,base,base*.68,0,0,Math.PI*2);ctx.stroke();const rays=PERF_MOBILE?4:7;for(let r=0;r<rays;r++){const a=Math.PI*2*r/rays+b.lane*.31,inner=G.fretR*(.90+ease*.25),outer=G.fretR*(1.18+ease*(b.grade==='perfect'?1.05:.68));ctx.strokeStyle=r%2?hexA('#fff3d6',.50*alpha):hexA(b.col,.70*alpha);ctx.lineWidth=Math.max(.8,2.2*(1-q));ctx.beginPath();ctx.moveTo(x+Math.cos(a)*inner,y+Math.sin(a)*inner*.72);ctx.lineTo(x+Math.cos(a)*outer,y+Math.sin(a)*outer*.72);ctx.stroke();}if(b.grade==='perfect'){ctx.fillStyle=hexA('#fff5cf',.42*alpha);ctx.beginPath();ctx.arc(x,y,Math.max(2,G.fretR*.19*(1-q)),0,Math.PI*2);ctx.fill();}}ctx.restore();
  }
  drawParticles=function(dt){baseParticles(dt);drawImpactBursts(dt);};
})();
