/* ============================================================
   HOLD + FRET POLISH
   Continuous sustain ribbons and permanently illuminated fret faces.
   Loaded last so it overrides older visual routines without touching
   scoring, timing, or the audio clock.
   ============================================================ */
(function(){
  function ribbonPoint(lane,f,widthScale){
    const cf=Math.max(-0.05,Math.min(1.05,f));
    const s=scaleAt(Math.max(0,cf));
    return {
      x:projX(lane,cf),
      y:projY(cf),
      half:G.laneW*0.15*s*(widthScale||1)
    };
  }

  function fillRibbon(lane,start,end,widthScale,fillStyle){
    const count=PERF_MOBILE?20:30;
    const left=[],right=[];
    for(let i=0;i<=count;i++){
      const q=i/count;
      const f=start+(end-start)*q;
      const p=ribbonPoint(lane,f,widthScale);
      left.push({x:p.x-p.half,y:p.y});
      right.push({x:p.x+p.half,y:p.y});
    }
    ctx.beginPath();
    ctx.moveTo(left[0].x,left[0].y);
    for(let i=1;i<left.length;i++) ctx.lineTo(left[i].x,left[i].y);
    for(let i=right.length-1;i>=0;i--) ctx.lineTo(right[i].x,right[i].y);
    ctx.closePath();
    ctx.fillStyle=fillStyle;
    ctx.fill();
  }

  /* One smooth tapered sustain instead of stacked fillRect segments. */
  drawTail=function(lane,headFrac,tailFrac,n){
    const start=Math.max(-0.05,Math.min(headFrac,tailFrac));
    const end=Math.min(1.05,Math.max(headFrac,tailFrac));
    if(end-start<0.002) return;

    const col=LANE_COL[lane];
    const active=!!n.holdActive;
    const p0=ribbonPoint(lane,start,1);
    const p1=ribbonPoint(lane,end,1);

    ctx.save();
    ctx.lineCap='round';
    ctx.lineJoin='round';

    /* soft outer energy glow */
    if(!PERF_MOBILE || active){
      const count=PERF_MOBILE?16:24;
      ctx.beginPath();
      for(let i=0;i<=count;i++){
        const f=start+(end-start)*(i/count);
        const p=ribbonPoint(lane,f,1);
        if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
      }
      ctx.strokeStyle=hexA(col,active?0.34:0.18);
      ctx.lineWidth=Math.max(3,G.laneW*0.26*scaleAt(Math.max(0,start)));
      ctx.shadowColor=col;
      ctx.shadowBlur=PERF_MOBILE?5:12;
      ctx.stroke();
      ctx.shadowBlur=0;
    }

    /* continuous body, tapered by perspective */
    const bodyGrad=ctx.createLinearGradient(p0.x,p0.y,p1.x,p1.y);
    bodyGrad.addColorStop(0,shadeA(col,-18,active?0.96:0.82));
    bodyGrad.addColorStop(0.55,hexA(col,active?0.93:0.74));
    bodyGrad.addColorStop(1,shadeA(col,18,active?0.88:0.68));
    fillRibbon(lane,start,end,1,bodyGrad);

    /* single smooth center sheen — no repeated bars/segments */
    const coreGrad=ctx.createLinearGradient(p0.x,p0.y,p1.x,p1.y);
    coreGrad.addColorStop(0,'rgba(255,255,255,0.34)');
    coreGrad.addColorStop(0.50,active?'rgba(255,255,255,0.50)':'rgba(255,255,255,0.22)');
    coreGrad.addColorStop(1,'rgba(255,255,255,0.10)');
    fillRibbon(lane,start,end,0.34,coreGrad);

    /* subtle continuous edge rails help the ribbon read as one object */
    const count=PERF_MOBILE?18:28;
    for(const side of [-1,1]){
      ctx.beginPath();
      for(let i=0;i<=count;i++){
        const f=start+(end-start)*(i/count);
        const p=ribbonPoint(lane,f,1);
        const x=p.x+side*p.half*0.92;
        if(i===0) ctx.moveTo(x,p.y); else ctx.lineTo(x,p.y);
      }
      ctx.strokeStyle=hexA('#ffffff',active?0.30:0.16);
      ctx.lineWidth=PERF_MOBILE?0.8:1.0;
      ctx.stroke();
    }

    /* rounded far cap */
    const cap=ribbonPoint(lane,end,1);
    const capScale=scaleAt(Math.max(0,end));
    ctx.fillStyle=hexA(col,active?0.95:0.82);
    ctx.shadowColor=col;
    ctx.shadowBlur=PERF_MOBILE?4:9;
    ctx.beginPath();
    ctx.ellipse(cap.x,cap.y,Math.max(2,cap.half),Math.max(1.5,G.laneW*0.085*capScale),0,0,Math.PI*2);
    ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
  };

  /* All four fret faces remain clearly colored at idle. A press/hit
     adds brightness and halo but never turns the center dark. */
  drawFrets=function(alpha){
    ctx.save();
    ctx.globalAlpha=alpha;

    const lx=G.nearLaneX[0]-G.laneW/2;
    const rx=G.nearLaneX[3]+G.laneW/2;
    const strike=ctx.createLinearGradient(lx,0,rx,0);
    strike.addColorStop(0,'rgba(124,92,255,0.10)');
    strike.addColorStop(0.5,`rgba(215,226,255,${0.64+0.28*hitLineFlash})`);
    strike.addColorStop(1,'rgba(49,224,208,0.10)');
    ctx.strokeStyle=strike;
    ctx.lineWidth=2.4+2.0*hitLineFlash;
    ctx.beginPath();
    ctx.moveTo(lx,G.strikeY);
    ctx.lineTo(rx,G.strikeY);
    ctx.stroke();

    for(let i=0;i<LANES;i++){
      const x=G.nearLaneX[i],y=G.strikeY,r=G.fretR;
      const col=LANE_COL[i];
      const held=!!keyHeld[i];
      const response=Math.min(1,Math.max(
        held?0.85:0,
        Math.max(0,laneFlash[i]||0)*0.95,
        Math.max(0,hitGlow[i]||0)*0.82
      ));

      /* always-visible colored halo */
      const halo=ctx.createRadialGradient(x,y,r*0.12,x,y,r*(1.46+response*0.44));
      halo.addColorStop(0,hexA(col,0.30+0.26*response));
      halo.addColorStop(0.55,hexA(col,0.13+0.18*response));
      halo.addColorStop(1,hexA(col,0));
      ctx.fillStyle=halo;
      ctx.beginPath();
      ctx.arc(x,y,r*(1.46+response*0.44),0,Math.PI*2);
      ctx.fill();

      /* dark socket stays behind, not over, the colored face */
      ctx.beginPath();
      ctx.ellipse(x,y+r*0.24,r*1.04,r*0.52,0,0,Math.PI*2);
      ctx.fillStyle='rgba(0,0,0,0.22)';
      ctx.fill();

      /* bright full face at idle; hit only intensifies it */
      const face=ctx.createRadialGradient(x-r*0.30,y-r*0.34,r*0.05,x,y,r*0.92);
      face.addColorStop(0,shadeA(col,115,1));
      face.addColorStop(0.26,shadeA(col,66,0.99));
      face.addColorStop(0.68,hexA(col,0.96));
      face.addColorStop(1,shadeA(col,-18,0.96));
      ctx.shadowColor=col;
      ctx.shadowBlur=PERF_MOBILE?(7+7*response):(11+17*response);
      ctx.beginPath();
      ctx.arc(x,y,r*0.86,0,Math.PI*2);
      ctx.fillStyle=face;
      ctx.fill();
      ctx.shadowBlur=0;

      /* colored outer ring */
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.strokeStyle=hexA(col,1);
      ctx.lineWidth=3.0+response*1.4;
      ctx.stroke();

      /* bright inner rim makes the whole face read as illuminated */
      ctx.beginPath();
      ctx.arc(x,y,r*0.70,0,Math.PI*2);
      ctx.strokeStyle=response>0.04?'rgba(255,255,255,0.96)':'rgba(255,255,255,0.64)';
      ctx.lineWidth=1.4+response;
      ctx.stroke();

      if(response>0.03){
        ctx.beginPath();
        ctx.arc(x,y,r*(1.08+response*0.28),0,Math.PI*2);
        ctx.strokeStyle=hexA('#ffffff',0.32+0.45*response);
        ctx.lineWidth=1.8;
        ctx.stroke();
      }

      if(!('ontouchstart' in window)){
        ctx.fillStyle='rgba(255,255,255,.98)';
        ctx.font='700 13px "Chakra Petch"';
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(LANE_KEYS[i].toUpperCase(),x,y);
      }
    }
    ctx.restore();
  };
})();
