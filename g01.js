/* ============================================================
   STATE
   ============================================================ */
const APPROACH = 1.55;
const WIN_PERFECT=0.045, WIN_GREAT=0.09, WIN_GOOD=0.145, WIN_MISS=0.145;
const OFFSET = 0.00;
let songT = 0;
let clockRunning = false;
let syncDone = false;
let state = 'menu';
let difficulty = 'medium';
let notes = [];
let idxNext = 0;
let startAudioBase = 0;
let score=0, combo=0, maxCombo=0, mult=1, health=0.5;
let od=0, odActive=false, odTime=0;
let judge={perfect:0,great:0,good:0,miss:0};
let totalNotes=0, hitNotes=0, accWeighted=0;
let particles=[], pops=[], laneFlash=[0,0,0,0], keyHeld=[false,false,false,false];
let hitLineFlash=0, beatPulse=0;
let hitGlow=[0,0,0,0];
let beamGlow=[0,0,0,0];
let shakeAmt=0, shakeT=0;
let flowPhase=0;
let lastComboMilestone=0;
let songDur = CHART.duration || 300;
