const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "..", "runsense.html"), "utf8");
const start = html.indexOf("  function fourWeekMileageBaseline() {");
assert.ok(start >= 0, "fourWeekMileageBaseline must exist");
const open = html.indexOf("{", start); let depth = 0, end = -1;
for(let i=open;i<html.length;i++){if(html[i]==="{")depth++;else if(html[i]==="}"&&--depth===0){end=i+1;break;}}
assert.ok(end>start,"baseline function must close");
const source=html.slice(start,end);
const DAY=864e5, fixed=Date.UTC(2026,10,23,12);
class FixedDate extends Date { constructor(...args){super(...(args.length?args:[fixed]));} }
const weekStart=Date.UTC(2026,10,23);
const state={acts:[
  [weekStart-7*DAY+12*3600e3,"run",30,10],
  [weekStart-14*DAY+12*3600e3,"run",30,0],
  [weekStart-21*DAY+12*3600e3,"run",30,20],
  [weekStart-28*DAY+12*3600e3,"run",30,10],
  [weekStart+12*3600e3,"run",30,99],
  [weekStart-35*DAY+12*3600e3,"run",30,100]
]};
const baseline=new Function("state","Date","return ("+source+");")(state,FixedDate)();
assert.deepEqual(baseline.weeks,[10,0,20,10]);
assert.equal(baseline.total,40);
assert.equal(baseline.average,10);
assert.match(html,/Batas target progresi \+10%/);
assert.match(html,/Minggu kosong dipertahankan sebagai 0/);
assert.match(html,/rerata 4 minggu/);
const adjustStart=html.indexOf("function wkAdjust(mins) {");
assert.ok(adjustStart>=0,"wkAdjust must exist");
let adjustEnd=-1, adjustDepth=0, adjustOpen=html.indexOf("{",adjustStart);
for(let i=adjustOpen;i<html.length;i++){if(html[i]==="{")adjustDepth++;else if(html[i]==="}"&&--adjustDepth===0){adjustEnd=i+1;break;}}
const adjustSource=html.slice(adjustStart,adjustEnd);
const adjust=new Function("weeklyCtx","WK_HI","return ("+adjustSource+");")(()=>({ratio:1.10}),1.10);
const held=adjust(30);
assert.equal(held.mins,27,"at the +10% ceiling, coach dose should be reduced");
assert.match(held.note,/\+10%/);

const trimStart=html.indexOf("function trimQualityWork(q, targetMins) {");
assert.ok(trimStart>=0,"quality mileage cap must alter the actual interval prescription");
let trimEnd=-1,trimDepth=0,trimOpen=html.indexOf("{",trimStart);
for(let i=trimOpen;i<html.length;i++){if(html[i]==="{")trimDepth++;else if(html[i]==="}"&&--trimDepth===0){trimEnd=i+1;break;}}
const trimSource=html.slice(trimStart,trimEnd);
const trim=new Function("return ("+trimSource+");")();
const quality={dur:38,core:"4×5 mnt threshold",wl:["Warmup","- 10m Z2 HR","","4x","- 5m Z4 HR","- 1m Z1 HR"]};
trim(quality,34);
assert.equal(quality.dur,34,"quality total duration must be reduced to the weekly guardrail");
assert.equal(quality.wl[4],"- 4m Z4 HR","watch workout work interval must be reduced too");
assert.equal(quality.core,"4×4 mnt threshold","displayed main set must match the watch workout");
assert.match(html,/if \(qw\.mins < q\.dur\) trimQualityWork\(q, qw\.mins\)/);

console.log("PASS RunSense four-week mileage baseline and quality-dose cap (calendar boundaries, zero week, synchronized intervals)");
