/* ============================================================
   ARCADE CONCERT STAGE — visual pass 1
   Organic performance-world rendering. Presentation only:
   timing, scoring, charts and audio remain untouched.
   ============================================================ */
(function(){
  const oldBackground=drawBackground;

  const crowd=[
    [0.08,0.36,0.7],[0.15,0.31,0.4],[0.22,0.39,0.8],[0.29,0.34,0.5],
    [0.70,0.33,0.6],[0.77,0.39,0.8],[0.85,0.31,0.45],[0.92,0.37,0.7],
    [0.11,0.46,0.35],[0.20,0.43,0.55],[0.81,0.44,0.45],[0.90,0.47,0.35]
  ];

  function roundedRectPath(x,y,w,h,r){
    r=Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  function speakerStack(x,y,w,h,flip){
    ctx.save();
    const lean=flip?-0.025:0.025;
    ctx.translate(x,y); ctx.rotate(lean);
    const body=ctx.createLinearGradient(0,0,w,h);
    body.addColorStop(0,'rgba(33,25,29,.92)');
    body.addColorStop(.5,'rgba(14,14,20,.95)');
    body.addColorStop(1,'rgba(44,26,22,.88)');
    roundedRectPath(0,0,w,h,8);
    ctx.fillStyle=body; ctx.fill();
    ctx.strokeStyle='rgba(255,214,150,.12)'; ctx.lineWidth=1; ctx.stroke();

    for(const cy of [h*.31,h*.72]){
      const rg=ctx.createRadialGradient(w*.5,cy,2,w*.5,cy,w*.28);
      rg.addColorStop(0,'rgba(73,70,77,.7)');
      rg.addColorStop(.35,'rgba(24,24,31,.96)');
      rg.addColorStop(.78,'rgba(8,8,13,.98)');
      rg.addColorStop(1,'rgba(85,52,38,.25)');
      ctx.fillStyle=rg;
      ctx.beginPath(); ctx.arc(w*.5,cy,w*.28,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=1.2; ctx.stroke();
      ctx.fillStyle='rgba(205,133,72,.22)';
      ctx.beginPath(); ctx.arc(w*.5,cy,w*.075,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function spotlight(x,topY,targetX,targetY,col,alpha){
    const grad=ctx.createLinearGradient(x,topY,targetX,targetY);
    grad.addColorStop(0,hexA(col,alpha));
    grad.addColorStop(.6,hexA(col,alpha*.36));
    grad.addColorStop(1,hexA(col,0));
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.moveTo(x-12,topY);
    ctx.lineTo(x+12,topY);
    ctx.lineTo(targetX+W*.13,targetY);
    ctx.lineTo(targetX-W*.13,targetY);
    ctx.closePath();
    ctx.fill();
  }

  drawBackground=function(dt){
    oldBackground(dt);

    const energy=Math.min(1,combo/40);
    const power=odActive?1:0;
    ctx.save();

    const wash=ctx.createLinearGradient(0,0,0,H*.72);
    wash.addColorStop(0,'rgba(52,20,35,.12)');
    wash.addColorStop(.48,`rgba(74,34,29,${0.08+energy*.05})`);
    wash.addColorStop(1,'rgba(5,6,15,0)');
    ctx.fillStyle=wash; ctx.fillRect(0,0,W,H*.76);

    const side=ctx.createLinearGradient(0,0,W,0);
    side.addColorStop(0,'rgba(41,12,24,.55)');
    side.addColorStop(.13,'rgba(18,10,20,.16)');
    side.addColorStop(.5,'rgba(0,0,0,0)');
    side.addColorStop(.87,'rgba(18,10,20,.16)');
    side.addColorStop(1,'rgba(41,12,24,.55)');
    ctx.fillStyle=side; ctx.fillRect(0,H*.08,W,H*.72);

    ctx.globalCompositeOperation='screen';
    spotlight(W*.20,H*.02,W*.42,H*.48,'#ffb36b',0.09+energy*.06);
    spotlight(W*.80,H*.02,W*.58,H*.48,'#86d7ff',0.08+energy*.05+power*.08);
    if(combo>=20||odActive){
      spotlight(W*.50,H*.00,W*.50,H*.44,odActive?'#b9fff3':'#ffd66b',0.06+energy*.06+power*.08);
    }
    ctx.globalCompositeOperation='source-over';

    const sw=Math.max(38,W*.105), sh=Math.max(92,H*.18);
    speakerStack(W*.012,H*.31,sw,sh,false);
    speakerStack(W-sw-W*.012,H*.31,sw,sh,true);

    const tm=performance.now()/1000;
    for(let i=0;i<crowd.length;i++){
      const p=crowd[i];
      const flick=.55+.45*Math.sin(tm*(.7+p[2])+i*1.7);
      ctx.globalAlpha=.16+.18*flick+energy*.06;
      ctx.fillStyle=(i%3===0)?'#ffd08a':(i%3===1?'#85d7ff':'#e89cff');
      ctx.beginPath(); ctx.arc(p[0]*W,p[1]*H,1.2+p[2]*1.2,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;

    const ry=G.horizonY+10;
    const riser=ctx.createLinearGradient(0,ry,0,ry+28);
    riser.addColorStop(0,'rgba(118,63,47,.22)');
    riser.addColorStop(.35,'rgba(30,20,24,.78)');
    riser.addColorStop(1,'rgba(5,5,9,0)');
    ctx.fillStyle=riser; ctx.fillRect(W*.18,ry,W*.64,30);
    ctx.restore();
  };

  drawHighway=function(alpha){
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.lineCap='round'; ctx.lineJoin='round';

    const ty=G.horizonY;
    const nearL=G.nearLaneX[0]-G.laneW/2;
    const nearR=G.nearLaneX[3]+G.laneW/2;
    const farL=G.cx+(nearL-G.cx)*SCALE_TOP;
    const farR=G.cx+(nearR-G.cx)*SCALE_TOP;

    ctx.beginPath();
    ctx.moveTo(farL-7,ty-2); ctx.lineTo(farR+7,ty-2);
    ctx.lineTo(nearR+18,H); ctx.lineTo(nearL-18,H); ctx.closePath();
    const shadow=ctx.createLinearGradient(0,ty,0,H);
    shadow.addColorStop(0,'rgba(0,0,0,.18)'); shadow.addColorStop(1,'rgba(0,0,0,.72)');
    ctx.fillStyle=shadow; ctx.fill();

    ctx.beginPath();
    ctx.moveTo(farL,ty); ctx.lineTo(farR,ty); ctx.lineTo(nearR,H); ctx.lineTo(nearL,H); ctx.closePath();
    const board=ctx.createLinearGradient(0,ty,0,H);
    board.addColorStop(0,'rgba(24,18,31,.60)');
    board.addColorStop(.45,'rgba(33,26,43,.86)');
    board.addColorStop(.80,'rgba(42,28,40,.96)');
    board.addColorStop(1,'rgba(28,19,27,.99)');
    ctx.fillStyle=board; ctx.fill();

    const sheen=ctx.createLinearGradient(nearL,0,nearR,0);
    sheen.addColorStop(0,'rgba(255,184,116,.025)');
    sheen.addColorStop(.42,'rgba(255,255,255,.035)');
    sheen.addColorStop(.58,'rgba(255,255,255,.012)');
    sheen.addColorStop(1,'rgba(83,202,255,.022)');
    ctx.fillStyle=sheen; ctx.fill();

    for(let i=0;i<LANES;i++){
      const nxL=G.nearLaneX[i]-G.laneW/2, nxR=G.nearLaneX[i]+G.laneW/2;
      const fxL=G.cx+(nxL-G.cx)*SCALE_TOP, fxR=G.cx+(nxR-G.cx)*SCALE_TOP;
      const glow=Math.max(laneFlash[i]*.55,beamGlow[i]*.68,keyHeld[i] ? .58 : 0);
      if(glow>.01){
        const lg=ctx.createLinearGradient(0,ty,0,G.strikeY);
        lg.addColorStop(0,hexA(LANE_COL[i],0));
        lg.addColorStop(.72,hexA(LANE_COL[i],.045*glow));
        lg.addColorStop(1,hexA(LANE_COL[i],.22*glow));
        ctx.beginPath(); ctx.moveTo(fxL,ty); ctx.lineTo(fxR,ty); ctx.lineTo(nxR,H); ctx.lineTo(nxL,H); ctx.closePath();
        ctx.fillStyle=lg; ctx.fill();
      }
    }

    for(let i=0;i<=LANES;i++){
      const nx=nearL+i*G.laneW;
      const fx=G.cx+(nx-G.cx)*SCALE_TOP;
      const string=ctx.createLinearGradient(0,ty,0,H);
      string.addColorStop(0,'rgba(222,200,177,.055)');
      string.addColorStop(.55,'rgba(194,184,176,.15)');
      string.addColorStop(1,'rgba(235,211,181,.30)');
      ctx.strokeStyle=string;
      ctx.lineWidth=PERF_MOBILE?1.0:1.25;
      ctx.beginPath(); ctx.moveTo(fx,ty); ctx.lineTo(nx,H); ctx.stroke();
    }

    const t=((performance.now()/1000)*.34)%1;
    const rungCount=10;
    for(let k=0;k<rungCount;k++){
      const cycle=(k/rungCount+t)%1;
      const frac=1-cycle;
      if(frac<.018||frac>.985) continue;
      const y=projY(frac), s=scaleAt(frac);
      const lx=G.cx+(nearL-G.cx)*s, rx=G.cx+(nearR-G.cx)*s;
      const a=(.035+.13*Math.pow(1-frac,1.1))*Math.min(1,frac*7,(1-frac)*8);
      ctx.strokeStyle=`rgba(201,173,151,${a})`;
      ctx.lineWidth=Math.max(.7,2.1*s);
      ctx.beginPath(); ctx.moveTo(lx,y); ctx.lineTo(rx,y); ctx.stroke();
      if(!PERF_MOBILE && frac<.55){
        ctx.strokeStyle=`rgba(255,242,221,${a*.22})`;
        ctx.lineWidth=.6; ctx.beginPath(); ctx.moveTo(lx,y-1); ctx.lineTo(rx,y-1); ctx.stroke();
      }
    }

    for(const [fx,nx] of [[farL,nearL],[farR,nearR]]){
      const edge=ctx.createLinearGradient(0,ty,0,H);
      edge.addColorStop(0,'rgba(220,198,176,.16)'); edge.addColorStop(1,'rgba(255,221,181,.48)');
      ctx.strokeStyle=edge; ctx.lineWidth=2.4;
      ctx.beginPath(); ctx.moveTo(fx,ty); ctx.lineTo(nx,H); ctx.stroke();
    }

    ctx.restore();
  };

  function gearPath(cx,cy,r,teeth){
    ctx.beginPath();
    const n=teeth*2;
    for(let i=0;i<n;i++){
      const a=-Math.PI/2+i*Math.PI*2/n;
      const rr=(i%2===0?r:r*.84);
      const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr*.76;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
  }

  drawFrets=function(alpha){
    ctx.save(); ctx.globalAlpha=alpha;
    const y=G.strikeY, r=G.fretR;
    const left=G.nearLaneX[0]-r*1.48, right=G.nearLaneX[3]+r*1.48;

    const panelY=y-r*.73, panelH=r*1.72;
    const panel=ctx.createLinearGradient(0,panelY,0,panelY+panelH);
    panel.addColorStop(0,'rgba(116,69,54,.94)');
    panel.addColorStop(.20,'rgba(70,42,39,.98)');
    panel.addColorStop(.72,'rgba(34,25,31,.99)');
    panel.addColorStop(1,'rgba(18,16,23,.99)');
    ctx.beginPath();
    ctx.moveTo(left+12,panelY); ctx.lineTo(right-12,panelY);
    ctx.quadraticCurveTo(right+8,panelY+7,right,panelY+22);
    ctx.lineTo(right-7,panelY+panelH-5);
    ctx.quadraticCurveTo(right-10,panelY+panelH+8,right-26,panelY+panelH+7);
    ctx.lineTo(left+26,panelY+panelH+7);
    ctx.quadraticCurveTo(left+10,panelY+panelH+8,left+7,panelY+panelH-5);
    ctx.lineTo(left,panelY+22);
    ctx.quadraticCurveTo(left-8,panelY+7,left+12,panelY);
    ctx.closePath();
    ctx.fillStyle=panel; ctx.fill();
    ctx.strokeStyle='rgba(255,205,154,.20)'; ctx.lineWidth=1.4; ctx.stroke();

    const bridge=ctx.createLinearGradient(left,0,right,0);
    bridge.addColorStop(0,'rgba(207,148,96,.25)');
    bridge.addColorStop(.5,'rgba(248,218,174,.62)');
    bridge.addColorStop(1,'rgba(123,180,202,.24)');
    ctx.strokeStyle=bridge; ctx.lineWidth=3.2+hitLineFlash*1.8;
    ctx.beginPath(); ctx.moveTo(left+8,panelY+2); ctx.lineTo(right-8,panelY+2); ctx.stroke();

    for(let i=0;i<LANES;i++){
      const x=G.nearLaneX[i], col=LANE_COL[i];
      const response=Math.min(1,Math.max(keyHeld[i] ? .88 : 0,(laneFlash[i]||0)*.96,(hitGlow[i]||0)*.84));
      const press=response*.10*r;
      const cy=y+press;

      gearPath(x,cy,r*1.20,6);
      const shell=ctx.createRadialGradient(x-r*.30,cy-r*.28,r*.10,x,cy,r*1.25);
      shell.addColorStop(0,shadeA(col,52,.98));
      shell.addColorStop(.48,hexA(col,.92));
      shell.addColorStop(1,shadeA(col,-58,.96));
      ctx.shadowColor=col; ctx.shadowBlur=PERF_MOBILE?(5+response*6):(9+response*11);
      ctx.fillStyle=shell; ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(255,255,255,.38)'; ctx.lineWidth=1.25; ctx.stroke();

      ctx.beginPath(); ctx.ellipse(x,cy+r*.08,r*.74,r*.55,0,0,Math.PI*2);
      ctx.fillStyle='rgba(16,15,21,.74)'; ctx.fill();

      const cap=ctx.createRadialGradient(x-r*.24,cy-r*.26,r*.05,x,cy,r*.72);
      cap.addColorStop(0,'rgba(255,255,255,.98)');
      cap.addColorStop(.22,shadeA(col,76,1));
      cap.addColorStop(.70,hexA(col,1));
      cap.addColorStop(1,shadeA(col,-30,1));
      ctx.beginPath(); ctx.ellipse(x,cy-r*.02,r*.61,r*.49,0,0,Math.PI*2);
      ctx.fillStyle=cap; ctx.fill();
      ctx.strokeStyle='rgba(255,244,225,.70)'; ctx.lineWidth=1.35; ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(x-r*.16,cy-r*.18,r*.24,r*.12,-.28,Math.PI*.92,Math.PI*1.82);
      ctx.strokeStyle='rgba(255,255,255,.52)'; ctx.lineWidth=1.15; ctx.stroke();

      if(response>.03){
        ctx.beginPath(); ctx.arc(x,cy,r*(1.25+response*.18),0,Math.PI*2);
        ctx.strokeStyle=hexA('#ffffff',.20+.42*response); ctx.lineWidth=1.5; ctx.stroke();
      }
    }
    ctx.restore();
  };
})();
