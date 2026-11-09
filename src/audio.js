// Original generative ambient synthesizer, not sampled from copyrighted music.
let context=null,voices=[],master=null,loopId=null;
const NOTE=[196,246.94,293.66,392,329.63,261.63];
export async function playAmbient(){
  stopAmbient();
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)return false;
  context=new Ctx(); await context.resume();
  master=context.createGain();master.gain.value=0.0001;master.connect(context.destination);
  const tick=()=>{
    if(!context)return;
    const t=context.currentTime;
    NOTE.forEach((hz,i)=>{
      const oscillator=context.createOscillator(),gain=context.createGain();
      oscillator.type=i%2?'sine':'triangle';oscillator.frequency.value=hz/(i>3?2:1);
      oscillator.detune.value=(i%2?2:-3);
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.019,t+1.5+i*.18);
      gain.gain.exponentialRampToValueAtTime(.0001,t+7+i*.12);
      oscillator.connect(gain).connect(master);
      oscillator.start(t+i*.12);oscillator.stop(t+7.5+i*.12);
      voices.push(oscillator);
    });
  };
  master.gain.exponentialRampToValueAtTime(.7,context.currentTime+2);
  tick();loopId=window.setInterval(tick,6600);
  return true;
}
export function stopAmbient(){
  if(loopId)clearInterval(loopId);loopId=null;
  if(master&&context){try{master.gain.setTargetAtTime(.0001,context.currentTime,.12);}catch{}}
  const old=context;
  if(old){setTimeout(()=>old.close().catch(()=>{}),350);}
  context=null;master=null;voices=[];
}
