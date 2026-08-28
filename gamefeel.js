/* ============================================================
   ORGANIC GAMEFEEL — visual pass 2
   Authored arcade note gems + lightweight impact feedback.
   Presentation only: scoring/timing/audio are delegated unchanged.
   ============================================================ */
(function(){
  const impacts=[];

  function badgePath(x,y,r,ys){
    const points=12;
    const inner=.82;
    ys=ys||.78;
    ctx.beginPath();
    for(let i=0;i<points;i++){
      const a=-Math.PI/2+(Math.PI*2*i/points);
      const rr=(i%2===0?r:r*inner);
      const px=x+Math.cos(a)*rr;
      const py=y+Math.sin(a)*rr*ys;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath();
  }

  /* Chunkier, authored arcade gem. Still uses the exact same note
     position/timing; this only replaces the material and silhouette. */
  drawGem=function(lane,frac,n){
    const cf=Math.max(-0.12,frac);
    const x=projX(lane,Math.max(0,frac));
    const y=projY(cf);
    const s=scaleAt(Math.max(0,frac));
    const r=G.fretR*0.86*s;
    const col=LANE_COL[lane];
    const fog=Math.min(1,(1-frac)*1.45+.26);
    const thick=r*.26;

    ctx.save();
    ctx.globalAlpha=fog;
    ctx.lineJoin='round';

    /* soft shadow anchors the token to the lane */
    ctx.fillStyle='rgba(0,0,0,.26)';
    ctx.beginPath();
    ctx.ellipse(x,y+thick+r*.34,r*.90,r*.22,0,0,Math.PI*2);
    ctx.fill();

    /* warm/dark molded underside */
    badgePath(x,y+thick,r,0.76);
    ctx.fillStyle=shadeA(col,-68,.94);
    ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.34)';
    ctx.lineWidth=Math.max(.8,1.4*s);
    ctx.stroke();

    /* side wall */
    const side=ctx.createLinearGradient(x-r,y,x+r,y+thick);
    side.addColorStop(0,shadeA(col,-28,.96));
    side.addColorStop(.52,shadeA(col,-58,.97));
    side.addColorStop(1,shadeA(col,-24,.95));
    ctx.fillStyle=side;
    ctx.beginPath();
    ctx.moveTo(x-r*.82,y-r*.20);
    ctx.lineTo(x-r*.82,y-r*.20+thick);
    ctx.lineTo(x+r*.82,y-r*.20+thick);
    ctx.lineTo(x+r*.82,y-r*.20);
    ctx.closePath();
    ctx.fill();

    /* enamel face */
    const face=ctx.createRadialGradient(x-r*.28,y-r*.34,r*.05,x,y,r);
    face.addColorStop(0,'rgba(255,255,255,.98)');
    face.addColorStop(.18,shade(col,92));
    face.addColorStop(.48,shade(col,34));
    face.addColorStop(.80,col);
    face.addColorStop(1,shade(col,-30));
    ctx.shadowColor=col;
    ctx.shadowBlur=PERF_MOBILE?5:10*s;
    badgePath(x,y,r,0.76);
    ctx.fillStyle=face;
    ctx.fill();
    ctx.shadowBlur=0;

    /* ivory/metal rim gives the gem a toy-like manufactured edge */
    badgePath(x,y,r,0.76);
    ctx.strokeStyle='rgba(255,238,207,.92)';
    ctx.lineWidth=Math.max(1.1,2.0*s);
    ctx.stroke();

    /* inset center plate */
    const core=ctx.createRadialGradient(x-r*.16,y-r*.17,r*.02,x,y,r*.58);
    core.addColorStop(0,'rgba(255,255,255,.36)');
    core.addColorStop(.55,hexA(col,.28));
    core.addColorStop(1,'rgba(0,0,0,.16)');
    ctx.fillStyle=core;
    ctx.beginPath();
    ctx.ellipse(x,y,r*.52,r*.35,0,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.24)';
    ctx.lineWidth=Math.max(.7,1.0*s);
    ctx.stroke();

    /* small specular mark; cheap on mobile */
    ctx.fillStyle='rgba(255,255,255,.68)';
    ctx.beginPath();
    ctx.ellipse(x-r*.27,y-r*.25,r*.17,r*.09,-.45,0,Math.PI*2);
    ctx.fill();

    ctx.restore();
  };

  const previousRegisterHit=registerHit;
  registerHit=function(n,grade,lane){
    previousRegisterHit(n,grade,lane);
    const strength=grade==='perfect'?1:grade==='great'?.72:.48;
    impacts.push({lane:lane,grade:grade,col:LANE_COL[lane],life:0,max:grade==='perfect'?.42:.32,strength:strength});
    if(impacts.length>(PERF_MOBILE?8:14)) impacts.splice(0,impacts.length-(PERF_MOBILE?8:14));
  };

  function drawImpactBursts(dt){
    if(!impacts.length) return;
    ctx.save();
    ctx.lineCap='round';
    ctx.lineJoin='round';

    for(let i=impacts.length-1;i>=0;i--){
      const b=impacts[i];
      b.life+=Math.min(.034,dt||0);
      const q=Math.min(1,b.life/b.max);
      if(q>=1){ impacts.splice(i,1); continue; }

      const x=G.nearLaneX[b.lane];
      const y=G.strikeY;
      const ease=1-Math.pow(1-q,3);
      const alpha=(1-q)*b.strength;
      const base=G.fretR*(1.00+ease*.80);

      /* expanding enamel ring */
      ctx.strokeStyle=hexA(b.col,.68*alpha);
      ctx.lineWidth=Math.max(1,3.2*(1-q));
      ctx.beginPath();
      ctx.ellipse(x,y,base,base*.68,0,0,Math.PI*2);
      ctx.stroke();

      /* short organic rays; intentionally few for mobile performance */
      const rays=PERF_MOBILE?4:7;
      for(let r=0;r<rays;r++){
        const a=(Math.PI*2*r/rays)+(b.lane*.31);
        const inner=G.fretR*(.90+ease*.25);
        const outer=G.fretR*(1.18+ease*(b.grade==='perfect'?1.05:.68));
        ctx.strokeStyle=r%2?hexA('#fff3d6',.50*alpha):hexA(b.col,.70*alpha);
        ctx.lineWidth=Math.max(.8,2.2*(1-q));
        ctx.beginPath();
        ctx.moveTo(x+Math.cos(a)*inner,y+Math.sin(a)*inner*.72);
        ctx.lineTo(x+Math.cos(a)*outer,y+Math.sin(a)*outer*.72);
        ctx.stroke();
      }

      if(b.grade==='perfect'){
        ctx.fillStyle=hexA('#fff5cf',.42*alpha);
        ctx.beginPath();
        ctx.arc(x,y,Math.max(2,G.fretR*.19*(1-q)),0,Math.PI*2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* Piggyback on the existing particle draw step so the stable render
     order remains unchanged. */
  const previousDrawParticles=drawParticles;
  drawParticles=function(dt){
    previousDrawParticles(dt);
    drawImpactBursts(dt);
  };
})();
