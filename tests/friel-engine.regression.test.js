/* Friel engine regression tests. Run: node tests/friel-engine.regression.test.js */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const source=fs.readFileSync(path.join(__dirname,"..","runsense-friel-engine.js"),"utf8");
const context={window:{},Date,Map,Math,Number,Object,Array,String};
vm.runInNewContext(source,context);
const engine=context.window.RunSenseFrielEngine;
assert.equal(engine.version,"1.6.0");
const DAY=864e5, now=Date.UTC(2026,10,28,12);
const run=(daysAgo,minutes,extra={})=>({timestamp:now-daysAgo*DAY,kind:"run",duration:minutes,distance:5,hr:140,rpe:3,...extra});
function inspect(activities=[],extra={}){return engine.inspect({now,activities,...extra});}
function recommend(activities=[],extra={}){return engine.recommend({now,activities,readiness:80,...extra});}
const results=[];
function check(name,fn){try{fn();results.push({name,result:"PASS"});}catch(e){results.push({name,result:"FAIL",error:e.message});}}
check("No-race phase ignores stale history after a >42-day break",()=>{
 const p=inspect([run(730,35),run(2,25)]).phase;
 assert.equal(p.name,"prep");assert.equal(p.weekInPhase,1);
});
check("3:1 recovery is counted from active training start and applied on Build week 4",()=>{
 const activities=[run(21,30),run(17,30),run(13,30),run(9,30),run(5,30)];
 const fourth=inspect(activities);
 assert.equal(fourth.recovery.week,4);
 assert.equal(fourth.recovery.recoveryDue,true);
 assert.equal(fourth.recovery.isRecoveryWeek,true);
 assert.equal(fourth.recovery.applies,true);
});
check("Scheduled 3:1 recovery does not override Peak; Peak keeps its sharpening session",()=>{
 const peakNow=Date.UTC(2026,11,19,12);
 const start=peakNow-21*DAY;
 const activities=[{timestamp:start,kind:"run",duration:30,distance:5,hr:140,rpe:3}];
 const state=engine.inspect({now:peakNow,activities,raceDate:"2026-12-31",raceDistance:10});
 assert.equal(state.phase.name,"peak");
 assert.equal(state.recovery.week,4);
 assert.equal(state.recovery.recoveryDue,true);
 assert.equal(state.recovery.isRecoveryWeek,false);
 const workout=engine.recommend({now:peakNow,activities,raceDate:"2026-12-31",raceDistance:10,readiness:90,plannedType:"quality",preferredQualityDays:[6]});
 assert.equal(workout.tag,"QUALITY");
 assert.match(workout.title,/ketajaman/i);
 assert.match(workout.steps[1][1],/4× 1 mnt/);
});
check("Peak long-day request is shortened to easy running, not a long run",()=>{
 const peakNow=Date.UTC(2026,11,19,12), start=peakNow-21*DAY;
 const activities=[
  {timestamp:start,kind:"run",duration:30,distance:5,hr:140,rpe:3},
  {timestamp:peakNow-2*DAY,kind:"run",duration:30,distance:5,hr:140,rpe:3}
 ];
 const workout=engine.recommend({now:peakNow,activities,raceDate:"2026-12-31",raceDistance:10,readiness:90,plannedType:"long"});
 assert.notEqual(workout.tag,"LONG");
 assert.ok(parseInt(workout.duration,10)<=40);
});
check("Taper suppresses scheduled 3:1 recovery and quality sessions",()=>{
 const taperNow=Date.UTC(2026,11,26,12), start=taperNow-21*DAY;
 const activities=[{timestamp:start,kind:"run",duration:30,distance:5,hr:140,rpe:3}];
 const state=engine.inspect({now:taperNow,activities,raceDate:"2026-12-31",raceDistance:10});
 assert.equal(state.phase.name,"taper");
 assert.equal(state.recovery.recoveryDue,true);
 assert.equal(state.recovery.isRecoveryWeek,false);
 const workout=engine.recommend({now:taperNow,activities,raceDate:"2026-12-31",raceDistance:10,readiness:90,plannedType:"quality",preferredQualityDays:[6]});
 assert.notEqual(workout.tag,"QUALITY");
});
check("A long run relative to current habit counts as a stress day",()=>{
 const activities=[run(1,86),run(4,35),run(7,35)];
 assert.equal(inspect(activities).stressDays,1);
});
check("Long-run target uses weekly average, not longest single session",()=>{
 const activities=[run(3,80),run(10,60),run(17,70),run(24,40),run(31,60)];
 const result=recommend(activities,{plannedType:"long"});
 assert.equal(result.title,"Long Run mudah");
 assert.ok(parseInt(result.duration,10)<80);
});
check("Established long-run tolerance is not abruptly cut by a lower phase cap",()=>{
 const activities=[run(3,80),run(10,80),run(17,80)];
 const result=recommend(activities,{plannedType:"long"});
 assert.equal(parseInt(result.duration,10),80);
});
check("Sparse running history does not fabricate a full long-run target",()=>{
 const result=recommend([run(2,24),run(5,25)],{plannedType:"long"});
 assert.ok(parseInt(result.duration,10)<=30);
 assert.match(result.reason,/belum ada riwayat long run/i);
});
check("10K race 33 days away remains Build-Peak-Taper-Race",()=>{
 const result=inspect([run(1,35)],{raceDate:"2026-12-31",raceDistance:10});
 assert.deepEqual(Array.from(result.calendar.phases,p=>p.name),["build","peak","taper","race"]);
 assert.deepEqual(Array.from(result.calendar.phases,p=>p.days),[19,7,7,1]);
});
check("Races 15–33 days away use remaining Build, seven-day Peak, and seven-day Taper",()=>{
 for(let days=15;days<=33;days++){
  const race=new Date(now+days*DAY).toISOString().slice(0,10);
  const state=inspect([run(1,35)],{raceDate:race,raceDistance:10});
  const phases=Array.from(state.calendar.phases,p=>({name:p.name,days:p.days}));
  assert.equal(phases.find(p=>p.name==="build")?.days,days-14,days+" days out Build duration");
  assert.equal(phases.find(p=>p.name==="peak")?.days,7,days+" days out Peak duration");
  assert.equal(phases.find(p=>p.name==="taper")?.days,7,days+" days out Taper duration");
  assert.equal(state.phase.name,"build",days+" days out should still be Build");
 }
});
check("Races 8–14 days away use Peak then seven-day Taper, with no leftover Build day",()=>{
 for(let days=8;days<=14;days++){
  const race=new Date(now+days*DAY).toISOString().slice(0,10);
  const state=inspect([run(1,35)],{raceDate:race,raceDistance:10});
  const phases=Array.from(state.calendar.phases,p=>({name:p.name,days:p.days}));
  assert.equal(phases.some(p=>p.name==="build"),false,days+" days out must not leave a Build day");
  assert.equal(phases.find(p=>p.name==="peak")?.days,days-7,days+" days out Peak duration");
  assert.equal(phases.find(p=>p.name==="taper")?.days,7,days+" days out Taper duration");
  assert.ok(["peak","taper"].includes(state.phase.name),days+" days out current phase");
 }
});
check("Races 2–7 days away are entirely in taper with no quality recommendation",()=>{
 for(let days=2;days<=7;days++){
  const race=new Date(now+days*DAY).toISOString().slice(0,10);
  const input={raceDate:race,raceDistance:10};
  const state=inspect([run(1,35)],input);
  assert.equal(state.phase.name,"taper",days+" days out must be taper");
  assert.equal(state.calendar.phases.some(p=>p.name==="build"||p.name==="peak"),false,days+" days out must not retain Build/Peak");
  const workout=recommend([run(1,35)],{...input,plannedType:"quality",readiness:90});
  assert.notEqual(workout.tag,"QUALITY",days+" days out must not prescribe quality");
  if(days<4) assert.equal(workout.duration,"15 menit");
 }
});
check("Maximum two stress days blocks an additional quality workout",()=>{
 const activities=[run(1,40,{quality:true}),run(3,40,{quality:true})];
 const result=recommend(activities,{plannedType:"quality",preferredQualityDays:[6]});
 assert.notEqual(result.tag,"QUALITY");
});
console.log(JSON.stringify({version:engine.version,passed:results.filter(x=>x.result==="PASS").length,failed:results.filter(x=>x.result==="FAIL").length,results},null,2));
if(results.some(x=>x.result==="FAIL"))process.exitCode=1;
