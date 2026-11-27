/* Synthetic regression tests for post-run analysis panels.
 * Run: node tests/session-analysis.synthetic.test.js
 * All activity data is synthetic; no network or athlete data is used.
 */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"..","runsense.html"),"utf8");
function extract(name){
  const start=html.indexOf("  function "+name+"(");
  assert.notEqual(start,-1,"missing production function "+name);
  const open=html.indexOf("{",start);let depth=0;
  for(let i=open;i<html.length;i++){if(html[i]==="{")depth++;else if(html[i]==="}"){depth--;if(depth===0)return html.slice(start,i+1);}}
  throw new Error("unclosed "+name);
}
const results=[];
function check(name,fn){try{fn();results.push({scenario:name,result:"PASS"});}catch(e){results.push({scenario:name,result:"FAIL",error:e.message});}}
const DAY=864e5,now=Date.UTC(2026,10,22,12);
const loadFn=new Function("state","loadOf","DAY",extract("saLoadTrendHTML")+";return saLoadTrendHTML;");
const progressFn=new Function("state","detectType","actPace","mp","VX_LB","DAY",extract("saProgressTrendHTML")+";return saProgressTrendHTML;");
const coachFn=new Function(extract("saCoachSummaryHTML")+";return saCoachSummaryHTML;")();
const loadOf=a=>Number(a[10])||0;
const fmtP=n=>{const s=Math.round(n*60);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");};
check("Load trend with sparse history explicitly withholds ratio",()=>{
  const state={acts:[[now-2*DAY,"run",30,5,140,0,"a","",0,"a",40]]};
  const out=loadFn(state,loadOf,DAY)([now,"run",30,5]);
  assert.match(out,/Belum cukup sebaran data/);
});
check("Load trend uses only activities before the selected session",()=>{
  const acts=[];
  for(let w=0;w<4;w++)acts.push([now-(w*7+2)*DAY,"run",30,5,140,0,"a","",0,"a",40]);
  acts.push([now+DAY,"run",30,5,140,0,"future","",0,"future",999]);
  const out=loadFn({acts},loadOf,DAY)([now,"run",30,5]);
  assert.match(out,/Beban 7 hari sebelum sesi/);
  assert.match(out,/Rerata 28 hari sebelumnya/);
  assert.match(out,/Beban 7 hari sebelum sesi dekat dengan kebiasaan/);
  assert.doesNotMatch(out,/999/);
});
check("Progress trend waits for six comparable sessions",()=>{
  const a=[now,"run",30,5,140,0,"a","",0,"a",20];
  const out=progressFn({acts:[a]},()=>({type:"easy"}),x=>x[2]/x[3],fmtP,{easy:"Easy"},DAY)(a);
  assert.match(out,/Belum ada enam sesi/);
});
check("Progress trend compares medians of six same-type sessions",()=>{
  const acts=[];
  for(let i=0;i<6;i++)acts.push([now-i*DAY,"run",30-i,5,145-i,0,"a","",0,"a",20]);
  const a=acts[0];
  const out=progressFn({acts},()=>({type:"easy"}),x=>x[2]/x[3],fmtP,{easy:"Easy"},DAY)(a);
  assert.match(out,/6 sesi · 90 hari/);
  assert.match(out,/Median pace/);
});
check("Coach summary separates positive, caution, and next-step notes",()=>{
  const rev={sections:[
    {title:"Eksekusi",notes:[{k:"g",text:"Pace stabil."}]},
    {title:"Beban",notes:[{k:"y",text:"Beban naik."}]},
    {title:"Lanjut",notes:[{k:"g",text:"Besok easy."}]}
  ]};
  const out=coachFn(rev);
  assert.match(out,/Yang berjalan baik/);
  assert.match(out,/Perlu diperhatikan/);
  assert.match(out,/<b>Aksi:<\/b> Besok easy\./);
});
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(x=>x.trim());
for(const script of scripts)new Function(script);
const report={syntheticOnly:true,scriptBlocksSyntaxChecked:scripts.length,passed:results.filter(x=>x.result==="PASS").length,failed:results.filter(x=>x.result==="FAIL").length,results};
console.log(JSON.stringify(report,null,2));
if(report.failed)process.exitCode=1;
