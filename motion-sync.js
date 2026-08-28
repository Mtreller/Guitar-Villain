/* ============================================================
   MOTION SYNC
   Keep fretboard/rung motion on the same song-time velocity as notes.
   The visual clock advances continuously at real-time speed and gently
   corrects toward audioTime(), avoiding both drift and visible jitter.
   ============================================================ */
(function(){
  let smoothSongTime=null;
  let lastWall=0;
  let lastState='';

  function syncedVisualTime(){
    const raw=audioTime();
    const wall=performance.now()/1000;

    if(smoothSongTime===null || state!=='play' || lastState!=='play' || Math.abs(raw-smoothSongTime)>.18){
      smoothSongTime=raw;
    }else{
      const dt=Math.min(.05,Math.max(0,wall-lastWall));
      /* Advance at exactly normal song speed. */
      smoothSongTime+=dt;
      /* Correct small audio-clock differences smoothly, never with a snap. */
      const error=raw-smoothSongTime;
      smoothSongTime+=error*Math.min(1,dt*8);
    }

    lastWall=wall;
    lastState=state;
    return smoothSongTime;
  }

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

    /* Physical board shadow/frame. */
    ctx.beginPath();
    ctx.moveTo(farL-7,ty-2); ctx.lineTo(farR+7,ty-2);
    ctx.lineTo(nearR+18,H); ctx.lineTo(nearL-18,H); ctx.closePath();
    const shadow=ctx.createLinearGradient(0,ty,0,H);
    shadow.addColorStop(0,'rgba(0,0,0,.18)');
    shadow.addColorStop(1,'rgba(0,0,0,.72)');
    ctx.fillStyle=shadow;
    ctx.fill();

    /* Lacquered fretboard surface. */
    ctx.beginPath();
    ctx.moveTo(farL,ty); ctx.lineTo(farR,ty);
    ctx.lineTo(nearR,H); ctx.lineTo(nearL,H); ctx.closePath();
    const board=ctx.createLinearGradient(0,ty,0,H);
    board.addColorStop(0,'rgba(24,18,31,.60)');
    board.addColorStop(.45,'rgba(33,26,43,.86)');
    board.addColorStop(.80,'rgba(42,28,40,.96)');
    board.addColorStop(1,'rgba(28,19,27,.99)');
    ctx.fillStyle=board;
    ctx.fill();

    const sheen=ctx.createLinearGradient(nearL,0,nearR,0);
    sheen.addColorStop(0,'rgba(255,184,116,.025)');
    sheen.addColorStop(.42,'rgba(255,255,255,.035)');
    sheen.addColorStop(.58,'rgba(255,255,255,.012)');
    sheen.addColorStop(1,'rgba(83,202,255,.022)');
    ctx.fillStyle=sheen;
    ctx.fill();

    /* Lane response. */
    for(let i=0;i<LANES;i++){
      const nxL=G.nearLaneX[i]-G.laneW/2;
      const nxR=G.nearLaneX[i]+G.laneW/2;
      const fxL=G.cx+(nxL-G.cx)*SCALE_TOP;
      const fxR=G.cx+(nxR-G.cx)*SCALE_TOP;
      const glow=Math.max(laneFlash[i]*.55,beamGlow[i]*.68,keyHeld[i]?.58:0);
      if(glow>.01){
        const lg=ctx.createLinearGradient(0,ty,0,G.strikeY);
        lg.addColorStop(0,hexA(LANE_COL[i],0));
        lg.addColorStop(.72,hexA(LANE_COL[i],.045*glow));
        lg.addColorStop(1,hexA(LANE_COL[i],.22*glow));
        ctx.beginPath();
        ctx.moveTo(fxL,ty); ctx.lineTo(fxR,ty);
        ctx.lineTo(nxR,H); ctx.lineTo(nxL,H); ctx.closePath();
        ctx.fillStyle=lg;
        ctx.fill();
      }
    }

    /* Longitudinal strings stay fixed. */
    for(let i=0;i<=LANES;i++){
      const nx=nearL+i*G.laneW;
      const fx=G.cx+(nx-G.cx)*SCALE_TOP;
      const string=ctx.createLinearGradient(0,ty,0,H);
      string.addColorStop(0,'rgba(222,200,177,.055)');
      string.addColorStop(.55,'rgba(194,184,176,.15)');
      string.addColorStop(1,'rgba(235,211,181,.30)');
      ctx.strokeStyle=string;
      ctx.lineWidth=PERF_MOBILE?1.0:1.25;
      ctx.beginPath();
      ctx.moveTo(fx,ty); ctx.lineTo(nx,H);
      ctx.stroke();
    }

    /*
      Moving fret lines use the SAME normalized velocity as notes:
      note frac = (noteTime - songTime) / APPROACH
      so d(frac)/dt = -1 / APPROACH.

      Ten visual frets are evenly distributed across one APPROACH window.
      Their phase is anchored to song time, but song time is gently smoothed
      above, so they cannot drift or visibly jump relative to the notes.
    */
    const visualT=syncedVisualTime();
    const rungCount=10;
    const rungSpacing=APPROACH/rungCount;
    const phase=((visualT%rungSpacing)+rungSpacing)%rungSpacing/rungSpacing;

    for(let k=0;k<rungCount;k++){
      const frac=((k+(1-phase))*rungSpacing)/APPROACH;
      if(frac<.018||frac>.985) continue;

      const y=projY(frac);
      const s=scaleAt(frac);
      const lx=G.cx+(nearL-G.cx)*s;
      const rx=G.cx+(nearR-G.cx)*s;
      const a=(.035+.13*Math.pow(1-frac,1.1))*Math.min(1,frac*7,(1-frac)*8);

      ctx.strokeStyle=`rgba(201,173,151,${a})`;
      ctx.lineWidth=Math.max(.7,2.1*s);
      ctx.beginPath();
      ctx.moveTo(lx,y); ctx.lineTo(rx,y);
      ctx.stroke();

      if(!PERF_MOBILE&&frac<.55){
        ctx.strokeStyle=`rgba(255,242,221,${a*.22})`;
        ctx.lineWidth=.6;
        ctx.beginPath();
        ctx.moveTo(lx,y-1); ctx.lineTo(rx,y-1);
        ctx.stroke();
      }
    }

    /* Board edge rails. */
    for(const pair of [[farL,nearL],[farR,nearR]]){
      const fx=pair[0],nx=pair[1];
      const edge=ctx.createLinearGradient(0,ty,0,H);
      edge.addColorStop(0,'rgba(220,198,176,.16)');
      edge.addColorStop(1,'rgba(255,221,181,.48)');
      ctx.strokeStyle=edge;
      ctx.lineWidth=2.4;
      ctx.beginPath();
      ctx.moveTo(fx,ty); ctx.lineTo(nx,H);
      ctx.stroke();
    }

    ctx.restore();
  };
})();
