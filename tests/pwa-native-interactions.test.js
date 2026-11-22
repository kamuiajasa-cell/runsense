/* Regression checks for RunSense's native-like PWA interaction layer.
 * Run: node tests/pwa-native-interactions.test.js
 */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"runsense.html"),"utf8");
const sw=fs.readFileSync(path.join(root,"sw.js"),"utf8");
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
const checks=[];
function check(name,fn){try{fn();checks.push({name,result:"PASS"});}catch(e){checks.push({name,result:"FAIL",error:e.message});}}
check("App and entry use edge-to-edge viewport",()=>{
 assert.match(html,/viewport-fit=cover/);assert.match(index,/viewport-fit=cover/);
});
check("Root and modal scrolling contain overscroll",()=>{
 assert.match(html,/html, body\s*\{[^}]*overscroll-behavior-y:\s*contain/s);
 assert.match(html,/\.modal-bg, \.modal\s*\{[^}]*overscroll-behavior:\s*contain/s);
});
check("Text selection remains available in reading and form controls",()=>{
 assert.match(html,/input, textarea, select, \[contenteditable="true"\][\s\S]*?user-select:\s*text/);
 assert.match(html,/button, \[role="button"\][\s\S]*?user-select:\s*none/);
});
check("Viewport keyboard handling uses VisualViewport and hides bottom navigation",()=>{
 assert.match(html,/window\.visualViewport/);assert.match(html,/rs-keyboard-open/);assert.match(html,/--rs-visible-height/);
});
check("Back navigation handles modal state and restores tab scroll",()=>{
 assert.match(html,/addEventListener\("popstate"/);assert.match(html,/rsScrollPositions/);
 assert.match(html,/rsModal/);assert.doesNotMatch(html,/location\.reload\(\)/);
});
check("Haptics are feature-detected",()=>{
 assert.match(html,/navigator\.vibrate\(10\)/);assert.match(html,/!navigator\.vibrate/);
});
check("Long history rows defer offscreen rendering",()=>{
 assert.match(html,/\.hist-card\s*\{[^}]*content-visibility:\s*auto/s);
});
check("Service worker updates shell cache and uses navigation-only HTML fallback",()=>{
 assert.match(sw,/runsense-v4/);assert.match(sw,/req\.mode === "navigate"/);
 assert.doesNotMatch(sw,/location\.reload/);
});
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(x=>x.trim());
for(let i=0;i<scripts.length;i++){try{new Function(scripts[i]);}catch(e){checks.push({name:"Inline script syntax #"+(i+1),result:"FAIL",error:e.message});}}
checks.push({name:"Inline script syntax",result:"PASS",detail:scripts.length+" script blocks parsed"}) ;
const report={passed:checks.filter(x=>x.result==="PASS").length,failed:checks.filter(x=>x.result==="FAIL").length,checks};
console.log(JSON.stringify(report,null,2));
if(report.failed)process.exitCode=1;
