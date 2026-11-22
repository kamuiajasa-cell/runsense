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
console.log("PASS RunSense four-week mileage baseline (calendar boundaries, zero week, excludes current/old weeks)");
