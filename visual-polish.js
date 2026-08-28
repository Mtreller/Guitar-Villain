/* ============================================================
   VISUAL POLISH
   Smooth decorative highway motion + fully illuminated frets.
   Notes remain locked to the audio clock; decorative grid motion
   uses requestAnimationFrame delta time so it cannot jitter when
   the audio clock is corrected/resumed.
   ============================================================ */
(function(){
  let visualTravel=0;
  let smoothShakeX=0, smoothShakeY=0;

  /* Smooth camera: no beat bob. Miss feedback is eased rather than
     applying a new random translation every single frame. */
  render=function(dt){
    const step=Math.min(0.034,Math.max(0,dt||0));
    if(state==='play') visualTravel=(visualTravel+step*0.72)%1;
    else visualTravel=(visualTravel+step*0.14)%1;

    const shake=shakeAmt||0;
    if(shake>0.01){
      const targetX=(Math.random()*2-1)*shake*3.2;
      const targetY=(Math.random()*2-1)*shake*2.4;
      const ease=Math.min(1,step*11);
      smoothShakeX+=(targetX-smoothShakeX)*ease;
      smoothShakeY+=(targetY-smoothShakeY)*ease;
    }else{
      const decay=Math.max(0,1-step*14);
      smoothShakeX*=decay;
      smoothShakeY*=decay;
    }

    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.translate(smoothShakeX,smoothShakeY);

    drawBackground(step);
    if(state==='menu'){
      drawHighway(0.45);
      drawSideRails(0.4);
      drawFrets(0.82);
      ctx.restore();
      return;
    }

    drawHighway(1);
    drawSideRails(1);
    if(!PERF_MOBILE) drawNoteShadows();
    drawNotes();
    drawFrets(1);
    drawParticles(step);
    drawPops(step);
    ctx.restore();
    drawProgress();
  };

  /* Highway deck copied from the stable renderer, with the moving
     floor grid detached from audioTime(). */
  drawHighway=function(alpha){
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.lineCap='round';
    ctx.lineJoin='round';

    const ty=G.horizonY;
    const nearL=G.nearLaneX[0]-G.laneW/2;
    const nearR=G.nearLaneX[3]+G.laneW/2;
    const farL=G.cx+(nearL-G.cx)*SCALE_TOP;
    const farR=G.cx+(nearR-G.cx)*SCALE_TOP;

    const grd=ctx.createLinearGradient(0,ty,0,H);
    grd.addColorStop(0,'rgba(24,28,70,0.02)');
    grd.addColorStop(0.55,'rgba(28,34,84,0.45)');
    grd.addColorStop(0.80,'rgba(34,40,96,0.62)');
    grd.addColorStop(1,'rgba(18,22,58,0.75)');
    ctx.beginPath();
    ctx.moveTo(farL,ty); ctx.lineTo(farR,ty); ctx.lineTo(nearR,H); ctx.lineTo(nearL,H);
    ctx.closePath();
    ctx.fillStyle=grd;
    ctx.fill();

    const sheen=ctx.createLinearGradient(0,ty,0,H);
    sheen.addColorStop(0,'rgba(160,180,255,0)');
    sheen.addColorStop(1,'rgba(160,180,255,0.055)');
    ctx.fillStyle=sheen;
    ctx.fill();

    /* Lane fills react independently, so the whole selected lane reads
       clearly instead of only the side rails reacting. */
    for(let i=0;i<LANES;i++){
      const nxL=G.nearLaneX[i]-G.laneW/2;
      const nxR=G.nearLaneX[i]+G.laneW/2;
      const fxL=G.cx+(nxL-G.cx)*SCALE_TOP;
      const fxR=G.cx+(nxR-G.cx)*SCALE_TOP;
      const glow=Math.max(laneFlash[i]*0.62,beamGlow[i]*0.76,keyHeld[i]?0.72:0);
      if(glow>0.01){
        const lg=ctx.createLinearGradient(0,ty,0,G.strikeY);
        lg.addColorStop(0,hexA(LANE_COL[i],0));
        lg.addColorStop(0.68,hexA(LANE_COL[i],0.07*glow));
        lg.addColorStop(1,hexA(LANE_COL[i],0.34*glow));
        ctx.beginPath();
        ctx.moveTo(fxL,ty); ctx.lineTo(fxR,ty); ctx.lineTo(nxR,H); ctx.lineTo(nxL,H);
        ctx.closePath();
        ctx.fillStyle=lg;
        ctx.fill();
      }
    }

    /* Crisp, continuous separators. */
    for(let i=0;i<=LANES;i++){
      const nx=nearL+i*G.laneW;
      const fx=G.cx+(nx-G.cx)*SCALE_TOP;
      const gl=ctx.createLinearGradient(0,ty,0,H);
      gl.addColorStop(0,'rgba(160,174,232,0.035)');
      gl.addColorStop(0.48,'rgba(160,174,232,0.13)');
      gl.addColorStop(1,'rgba(188,202,255,0.30)');
      ctx.strokeStyle=gl;
      ctx.lineWidth=PERF_MOBILE?1.05:1.25;
      ctx.beginPath();
      ctx.moveTo(fx,ty);
      ctx.lineTo(nx,H);
      ctx.stroke();
    }

    /* Smooth constant-speed perspective rungs. visualTravel is advanced
       by frame delta, not audio timestamps, preventing micro-jumps. */
    const rungCount=15;
    for(let k=0;k<rungCount;k++){
      const cycle=(k/rungCount+visualTravel)%1;
      const frac=1-cycle;
      if(frac<=0.006||frac>=0.998) continue;

      const y=projY(frac);
      const s=scaleAt(frac);
      const lx=G.cx+(nearL-G.cx)*s;
      const rx=G.cx+(nearR-G.cx)*s;
      const depth=Math.pow(1-frac,1.15);
      const edgeFade=Math.min(1,frac*11,(1-frac)*9);
      const a=(0.045+0.17*depth)*edgeFade;

      ctx.strokeStyle=`rgba(155,172,235,${a})`;
      ctx.lineWidth=Math.max(PERF_MOBILE?0.65:0.75,1.55*s);
      ctx.beginPath();
      ctx.moveTo(lx,y);
      ctx.lineTo(rx,y);
      ctx.stroke();
    }

    ctx.restore();
  };

  /* Fully colored frets. Every fret has a visible illuminated face at
     rest; a press/hit increases the entire surface brightness and halo. */
  drawFrets=function(alpha){
    const t=audioTime();
    const bp=60/(CHART.bpm||120);
    const pulse=state==='play'?(0.5+0.5*Math.pow(1-((t%bp)/bp),3)):0.5;
    ctx.save();
    ctx.globalAlpha=alpha;

    const lx=G.nearLaneX[0]-G.laneW/2;
    const rx=G.nearLaneX[3]+G.laneW/2;

    const gl=ctx.createLinearGradient(lx,0,rx,0);
    gl.addColorStop(0,'rgba(124,92,255,0.08)');
    gl.addColorStop(0.5,`rgba(205,218,255,${0.60+0.30*hitLineFlash})`);
    gl.addColorStop(1,'rgba(49,224,208,0.08)');
    ctx.shadowColor='rgba(150,170,255,0.72)';
    ctx.shadowBlur=PERF_MOBILE?5:(8+12*hitLineFlash);
    ctx.strokeStyle=gl;
    ctx.lineWidth=2.5+2.2*hitLineFlash;
    ctx.beginPath();
    ctx.moveTo(lx,G.strikeY);
    ctx.lineTo(rx,G.strikeY);
    ctx.stroke();
    ctx.shadowBlur=0;

    for(let i=0;i<LANES;i++){
      const x=G.nearLaneX[i],y=G.strikeY,r=G.fretR;
      const col=LANE_COL[i];
      const held=!!keyHeld[i];
      const hg=Math.max(0,hitGlow[i]||0);
      const flash=Math.max(0,laneFlash[i]||0);
      const response=Math.min(1,Math.max(held?0.78:0,flash*0.92,hg*0.82));
      const idle=0.30+0.08*pulse;
      const intensity=Math.min(1,idle+response*0.70);

      /* broad halo behind the complete fret */
      const halo=ctx.createRadialGradient(x,y,r*0.18,x,y,r*(1.55+response*0.55));
      halo.addColorStop(0,hexA(col,(0.17+0.30*response)));
      halo.addColorStop(0.55,hexA(col,(0.08+0.18*response)));
      halo.addColorStop(1,hexA(col,0));
      ctx.fillStyle=halo;
      ctx.beginPath();
      ctx.arc(x,y,r*(1.55+response*0.55),0,Math.PI*2);
      ctx.fill();

      /* recessed socket */
      ctx.beginPath();
      ctx.ellipse(x,y+r*0.22,r*1.04,r*0.52,0,0,Math.PI*2);
      ctx.fillStyle='rgba(0,0,0,0.30)';
      ctx.fill();

      /* full illuminated face */
      const dome=ctx.createRadialGradient(x-r*0.28,y-r*0.34,r*0.08,x,y,r*0.94);
      dome.addColorStop(0,shadeA(col,100,Math.min(1,0.72+0.24*intensity)));
      dome.addColorStop(0.30,shadeA(col,54,Math.min(1,0.66+0.27*intensity)));
      dome.addColorStop(0.72,hexA(col,0.50+0.44*intensity));
      dome.addColorStop(1,shadeA(col,-46,0.82+0.16*intensity));
      ctx.shadowColor=col;
      ctx.shadowBlur=PERF_MOBILE?(5+7*response):(9+16*response);
      ctx.beginPath();
      ctx.arc(x,y,r*0.86,0,Math.PI*2);
      ctx.fillStyle=dome;
      ctx.fill();
      ctx.shadowBlur=0;

      /* bright colored rim */
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.lineWidth=3.0+response*1.5;
      ctx.strokeStyle=hexA(col,0.88+0.12*response);
      ctx.stroke();

      /* inner white/color ring makes every fret readable */
      ctx.beginPath();
      ctx.arc(x,y,r*0.70,0,Math.PI*2);
      ctx.lineWidth=1.3+response*1.1;
      ctx.strokeStyle=response>0.08?'rgba(255,255,255,0.92)':hexA('#ffffff',0.42);
      ctx.stroke();

      if(response>0.02){
        ctx.beginPath();
        ctx.arc(x,y,r*(1.05+response*0.34),0,Math.PI*2);
        ctx.lineWidth=1.8;
        ctx.strokeStyle=hexA('#ffffff',0.25+0.48*response);
        ctx.stroke();
      }

      if(!('ontouchstart' in window)){
        ctx.fillStyle='rgba(255,255,255,.96)';
        ctx.font='700 13px "Chakra Petch"';
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(LANE_KEYS[i].toUpperCase(),x,y);
      }
    }
    ctx.restore();
  };
})();
