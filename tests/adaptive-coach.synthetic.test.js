/* Synthetic regression tests for the production adaptiveContext() in runsense.html.
 * Run: node tests/adaptive-coach.synthetic.test.js
 * No athlete data, network, or third-party packages are used.
 */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const html = fs.readFileSync(require("node:path").join(__dirname, "..", "runsense.html"), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf("  function " + name + "(){");
  assert.notEqual(start, -1, name + " must exist");
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("Unclosed function: " + name);
}

const fnSource = extractFunction(html, "adaptiveContext");
const fixedNow = Date.UTC(2026, 10, 19, 12);
const DAY = 864e5;

function evaluate(entries, feedback = [], today = {}) {
  const activities = entries.map(([daysAgo, type, minutes = 35]) => [
    fixedNow - daysAgo * DAY, "run", minutes, 6, 150, 0, "synthetic", "", 0, "synthetic-" + daysAgo
  ]);
  const typeByTimestamp = new Map(activities.map((a, i) => [a[0], entries[i][1]]));
  const state = { acts: activities, vx: {} };
  const FEEL = { sessions: {}, today: {} };
  for (const [daysAgo, rpe, legs] of feedback) {
    FEEL.sessions[fixedNow - daysAgo * DAY] = { rpe, legs };
  }
  const feelLearning = () => ({
    sessions: Object.entries(FEEL.sessions).map(([ms, value]) => ({ ms: Number(ms), ...value }))
  });
  const detectType = activity => ({ type: typeByTimestamp.get(activity[0]) || "easy" });
  const ymd = () => "2026-11-19";
  const fourWeekMileageBaseline = () => {
    const weekStart = (() => {
      const d = new Date(fixedNow); d.setHours(0,0,0,0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime();
    })();
    const weeks = [0,0,0,0];
    for (const x of state.acts) {
      if (x[1] !== "run" || !(Number(x[3]) > 0)) continue;
      const weekIndex = Math.ceil((weekStart - x[0]) / (7 * DAY));
      if (weekIndex >= 1 && weekIndex <= 4) weeks[weekIndex - 1] += Number(x[3]) || 0;
    }
    const total = weeks.reduce((a,b)=>a+b,0);
    return { weeks, total, average: total / 4, hasHistory: state.acts.some(x=>x[1]==="run"&&x[3]>0) };
  };
  const adaptiveContext = new Function("state", "FEEL", "feelLearning", "detectType", "ymd", "fourWeekMileageBaseline", "Date",
    "return (" + fnSource + ")"
  )(state, FEEL, feelLearning, detectType, ymd, fourWeekMileageBaseline, { now: () => fixedNow }) ;
  FEEL.today[ymd()] = today;
  return adaptiveContext();
}

const priorBaseline = [[12, "easy", 30], [18, "easy", 30], [24, "easy", 30]];
const results = [];
function check(name, fn) {
  try { fn(); results.push({ scenario: name, result: "PASS" }); }
  catch (error) { results.push({ scenario: name, result: "FAIL", error: error.message }); }
}

check("No post-run feedback never grants quality progression", () => {
  const c = evaluate([[1, "thr"], [9, "thr"], ...priorBaseline]);
  assert.equal(c.qualityProgressionLevel, 0);
});
check("Two controlled quality responses allow one progression level", () => {
  const c = evaluate([[1, "thr"], [9, "thr"], ...priorBaseline], [[1, 5, 1], [9, 6, 1]]);
  assert.equal(c.successfulQuality, 2);
  assert.equal(c.qualityProgressionLevel, 1);
  assert.equal(c.qualityLock, false);
});
check("A hard RPE and heavy legs trigger caution", () => {
  const c = evaluate([[1, "thr"], [9, "thr"], ...priorBaseline], [[1, 9, 2], [9, 5, 1]]);
  assert.equal(c.qualityCaution, true);
  assert.equal(c.recoveryBias, true);
  assert.equal(c.qualityProgressionLevel, 0);
});
check("Two quality sessions in seven days lock another quality session", () => {
  const c = evaluate([[1, "thr"], [3, "vo2"], ...priorBaseline]);
  assert.equal(c.hard7, 2);
  assert.equal(c.qualityLock, true);
});
check("Normal easy running remains unlocked", () => {
  const c = evaluate([[1, "easy", 10], [3, "easy", 10], [5, "easy", 10], ...priorBaseline]);
  assert.equal(c.qualityLock, false);
  assert.equal(c.volumeFactor, 1);
});
check("Heavy leg feedback prioritizes recovery and reduces dose", () => {
  const c = evaluate([[1, "easy"], [9, "easy"], ...priorBaseline], [[1, 5, 3], [9, 5, 2]]);
  assert.equal(c.recoveryBias, true);
  assert.ok(c.volumeFactor < 1);
});


function extractDecisionFunction(source) {
  const start = source.indexOf("function applyFeelDecision(r){");
  assert.notEqual(start, -1, "applyFeelDecision must exist");
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("Unclosed applyFeelDecision");
}
const applyFeelSource = extractDecisionFunction(html);

function runFeelDecision(feel) {
  const fn = new Function("feelToday", "ymd", "feelLearning",
    applyFeelSource + "; return applyFeelDecision;"
  )(() => feel, () => "2026-11-19", () => ({ recentHard: false }));
  const recommendation = { status: "train", duration: "40 menit", tag: "QUALITY", score: 80, reason: "Sesi quality" };
  return fn(recommendation);
}
check("Unsaved pain selection does not silently override the coach recommendation", () => {
  const result = runFeelDecision({ pain: 2, energy: 1, fatigue: 3, savedDate: "" });
  assert.equal(result.status, "train");
  assert.equal(result.title, undefined);
});
check("Saved pain check-in safely overrides the planned workout", () => {
  const result = runFeelDecision({ pain: 2, savedDate: "2026-11-19" });
  assert.equal(result.status, "rest");
  assert.match(result.title, /nyeri/i);
});
check("Saved low-energy and heavy-fatigue check-in reduces a quality session", () => {
  const result = runFeelDecision({ pain: 0, energy: 1, fatigue: 3, legs: 3, savedDate: "2026-11-19" });
  assert.equal(result.status, "rest");
  assert.equal(result.tag, "RECOVERY");
  assert.equal(result.duration, "—");
});

const syntaxBlocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(script => script.trim());
for (const script of syntaxBlocks) new Function(script);
console.log(JSON.stringify({
  source: "runsense.html / adaptiveContext()",
  syntheticOnly: true,
  scriptBlocksSyntaxChecked: syntaxBlocks.length,
  passed: results.filter(x => x.result === "PASS").length,
  failed: results.filter(x => x.result === "FAIL").length,
  results
}, null, 2));
if (results.some(x => x.result === "FAIL")) process.exitCode = 1;
