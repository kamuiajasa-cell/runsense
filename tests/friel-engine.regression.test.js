/* Friel engine regression tests. Run: node tests/friel-engine.regression.test.js */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const source=fs.readFileSync(path.join(__dirname,"..","runsense-friel-engine.js"),"utf8");
const context={window:{},Date,Map,Math,Number,Object,Array,String};
vm.runInNewContext(source,context);
const engine=context.window.RunSenseFrielEngine;
assert.equal(engine.version,"1.5.0");
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
check("Recovery cycle continues across phase boundaries from active training start",()=>{
 const activities=[run(16,30),run(12,30),run(8,30),run(4,30)];
 const p=inspect(activities);
 assert.equal(p.recovery.week,3);assert.equal(p.recovery.isRecoveryWeek,false);
 const fourth=inspect([run(16,30),run(12,30),run(8,30),run(4,30),run(4,30)]);
 assert.equal(fourth.recovery.week,4);assert.equal(fourth.recovery.isRecoveryWeek,true);
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
check("Maximum two stress days blocks an additional quality workout",()=>{
 const activities=[run(1,40,{quality:true}),run(3,40,{quality:true})];
 const result=recommend(activities,{plannedType:"quality",preferredQualityDays:[6]});
 assert.notEqual(result.tag,"QUALITY");
});
console.log(JSON.stringify({version:engine.version,passed:results.filter(x=>x.result==="PASS").length,failed:results.filter(x=>x.result==="FAIL").length,results},null,2));
if(results.some(x=>x.result==="FAIL"))process.exitCode=1;
