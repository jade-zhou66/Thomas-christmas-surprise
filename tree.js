const canvas=document.querySelector("canvas");
const ctx=canvas.getContext("2d");
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
const tau=Math.PI*2;
const random=Math.random;
const colors=["#126346","#267356","#28895b","#276448","#145f54"];
const tree=Array.from({length:1350},()=>{
  const h=random();
  const tier=1-.28*((h*7)%1);
  return {h,r:(.025+h*.47)*tier*(.36+.64*Math.sqrt(random())),a:random()*tau,
    size:.55+random()*1.2,color:colors[Math.floor(random()*colors.length)],seed:random()*tau};
});
for(let i=0;i<300;i++){
  const h=i/299;
  tree.push({h,r:.035+h*.46,a:h*tau*5,seed:h*50,size:1.4,color:"#ffd482",ribbon:true});
}
const lampColors=["#df3650","#35acff","#ffd25e","#bf6ff0","#8affb3"];
for(let i=0;i<90;i++){
  const h=(i+.5)/90;
  tree.push({h,r:.035+h*.46,a:h*tau*5,seed:i,color:lampColors[i%5],size:2.8,lamp:true});
}
// Stagger three ornaments around each level of the rotating tree.
const ornaments = [.32, .56, .81].flatMap((h, level) =>
  [0, 1, 2].map(index => ({
    h,
    r: (.025 + h * .47) * (1 - .28 * ((h * 7) % 1)),
    a: (index / 3 + level / 9) * tau,
    ornament: (index + level) % 3,
  }))
);
const ornamentArt = new Image();
ornamentArt.src = "tree-ornaments.svg";
const ornamentRegions = [[13, 9, 70, 75], [99, 12, 90, 80], [209, 7, 65, 86]];
const noteArt = new Image();
noteArt.src = "wish-note.svg";
const hookHeight = 85.5 / 90;
const note = {h:hookHeight, r:.035+hookHeight*.46, a:hookHeight*tau*5, note:true};
const treeElements = tree.concat(ornaments, note);
let firstFrame;

function drawNote(hookX, hookY, depth, scale, time) {
  if (!noteArt.naturalWidth) return;
  const face = depth / note.r;
  const paperWidth = Math.min(width * .88, 485, height * 1.05);
  const paperHeight = paperWidth * 190 / 640;
  const span = paperWidth * (.20 + .80 * Math.abs(face));
  const center = Math.max(span / 2 + 5, Math.min(width - span / 2 - 5, hookX));
  const y = Math.min(height - paperHeight - 7, hookY + Math.min(16, scale * .03));
  ctx.save();
  ctx.globalAlpha = face < 0 ? .42 : 1;
  ctx.strokeStyle = "#e5b966";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hookX, hookY);
  ctx.lineTo(center, y + paperHeight * .065);
  ctx.stroke();
  ctx.translate(center, y);
  ctx.rotate(.015 * Math.sin(time * 1.3));
  ctx.drawImage(noteArt, -span / 2, 0, span, paperHeight);
  ctx.restore();
}

function drawOrnament(kind, x, y, depth, size) {
  if (depth < -.025 || !ornamentArt.naturalWidth) return;
  const [sx, sy, sw, sh] = ornamentRegions[kind];
  const width = size * sw / sh;
  ctx.globalAlpha = Math.min(1, (depth + .025) / .095);
  ctx.strokeStyle = "#ffd68e";
  ctx.lineWidth = Math.max(1, size * .025);
  ctx.beginPath();
  ctx.moveTo(x, y - size * .14);
  ctx.lineTo(x, y + size * .02);
  ctx.stroke();
  ctx.drawImage(ornamentArt, sx, sy, sw, sh, x - width / 2, y, width, size);
}
let width,height;
function resize(){
  const ratio=Math.min(2,devicePixelRatio||1);
  width=canvas.clientWidth;
  height=canvas.clientHeight;
  canvas.width=Math.round(width*ratio);
  canvas.height=Math.round(height*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
}
window.addEventListener("resize",resize);
function draw(ms){
  if(firstFrame === undefined) firstFrame = ms;
  const time=reduced.matches?0:(ms-firstFrame)/1000;
  ctx.clearRect(0,0,width,height);
  const scale=Math.min(width*.97,height*.79);
  const treeHeight=Math.min(height*.79,scale*1.48,height-Math.min(width*.88,485,height*1.05)*190/640-scale*.16-36);
  const cx=width*.5;
  const top=Math.max(scale*.061+12,(height-treeHeight-Math.min(width*.88,485,height*1.05)*190/640)*.45);
  const base=top+treeHeight;
  ctx.globalAlpha=1;
  const glow=ctx.createRadialGradient(cx,base,0,cx,base,scale*.54);
  glow.addColorStop(0,"#82d8ac38");
  glow.addColorStop(1,"#82d8ac00");
  ctx.save();
  ctx.translate(cx,base);
  ctx.scale(1,.22);
  ctx.translate(-cx,-base);
  ctx.fillStyle=glow;
  ctx.fillRect(cx-scale,base-scale,scale*2,scale*2);
  ctx.restore();
  const projected=treeElements.map(point=>{
    const a=point.a+time*.34+Math.PI/2-note.a;
    return {point,x:Math.cos(a)*point.r,z:Math.sin(a)*point.r};
  }).sort((a,b)=>a.z-b.z);
  for(const {point,x,z} of projected){
    const perspective=1+z*.36;
    const px=cx+x*scale*perspective;
    const py=top+point.h*treeHeight+z*scale*.19;
    if (point.note) {
      drawNote(px,py,z,scale,time);
      continue;
    }
    if (point.ornament !== undefined) {
      drawOrnament(point.ornament, px, py, z, Math.min(34, scale * .061) * perspective);
      continue;
    }
    const twinkle=.78+.22*Math.sin(time*2.2+point.seed);
    ctx.globalAlpha=Math.min(1,(.61+z*.71)*twinkle+(point.ribbon?.18:0));
    ctx.fillStyle=point.color;
    if(point.lamp){ctx.globalAlpha=twinkle;ctx.shadowBlur=8;ctx.shadowColor=point.color;}
    ctx.beginPath();
    ctx.arc(px,py,point.size*perspective*(scale/470+.48)*.75,0,tau);
    ctx.fill();
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;
  ctx.fillStyle="#fff0b5";
  ctx.shadowColor="#ffcd79";
  ctx.shadowBlur=28;
  const sy=top-9;
  const starSize=scale*.055;
  ctx.beginPath();
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4-Math.PI/2;
    const r=i%2===0?starSize:starSize*.25;
    const x=cx+Math.cos(a)*r;
    const y=sy+Math.sin(a)*r;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  requestAnimationFrame(draw);
}
