/* LTHR single-source regression tests. Synthetic profile values only. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"..","runsense.html"),"utf8");
function extract(name){
  const start=html.indexOf("  function "+name+"(");
  assert.notEqual(start,-1,"missing "+name);
  const open=html.indexOf("{",start);let depth=0;
  for(let i=open;i<html.length;i++){
    if(html[i]==="{")depth++;
    else if(html[i]==="}"){depth--;if(depth===0)return html.slice(start,i+1);}
  }
  throw new Error("unclosed "+name);
}
const results=[];
function check(name,fn){try{fn();results.push({scenario:name,result:"PASS"});}catch(e){results.push({scenario:name,result:"FAIL",error:e.message});}}
const state={lthrC:166,athlete:{lthr:172},max:185,rest:63};
const lthrNow=new Function("state","maxHr","restHr",extract("lthrNow")+";return lthrNow;")(state,()=>state.max,()=>state.rest);
const lthrZoneEdges=new Function("lthrNow",extract("lthrZoneEdges")+";return lthrZoneEdges;")(lthrNow);
const lthrZoneHrBounds=new Function("lthrZoneEdges",extract("lthrZoneHrBounds")+";return lthrZoneHrBounds;")(lthrZoneEdges);
check("Manual LTHR takes precedence over profile and HRR estimate",()=>assert.equal(lthrNow(),166));
check("Seven zone edges follow the shared 85/90/95/100/102/105% LTHR model",()=>assert.deepEqual(lthrZoneEdges(),[141,149,157,166,170,175]));
check("All seven zones convert to the correct inclusive BPM bounds",()=>{
  assert.deepEqual(Array.from({length:7},(_,i)=>lthrZoneHrBounds(i+1)),[[0,140],[141,148],[149,156],[157,165],[166,169],[170,174],[175,null]]);
});
check("Intervals athlete LTHR is used when manual value is absent",()=>{
  state.lthrC=0;assert.equal(lthrNow(),172);
});
check("HRR is only an LTHR fallback when no explicit threshold exists",()=>{
  state.athlete={};assert.equal(lthrNow(),170);
  state.rest=0;assert.equal(lthrNow(),0);
});
check("Coach summary takes LTHR from the same central source",()=>assert.match(html,/let lthr = lthrNow\(\) \|\| null/));
check("Stream time-in-zone uses the shared LTHR zone-edge helper",()=>assert.match(html,/const edge = lthrZoneEdges\(\);/));
check("Recommendation zone labels use the same LTHR zone-edge helper",()=>assert.match(html,/const zoneEdges = L > 0 \? lthrZoneEdges\(\) : \[\];/));
check("No second independent HR-based LTHR estimator remains in processData",()=>{
  const start=html.indexOf("  function processData()");
  const end=html.indexOf("\n  function ",start+15);
  const body=html.slice(start,end<0?html.length:end);
  assert.doesNotMatch(body,/hardHR|mx \* 0\.88|rst \+ 0\.88/);
});
const report={syntheticOnly:true,passed:results.filter(x=>x.result==="PASS").length,failed:results.filter(x=>x.result==="FAIL").length,results};
console.log(JSON.stringify(report,null,2));
if(report.failed)process.exitCode=1;
