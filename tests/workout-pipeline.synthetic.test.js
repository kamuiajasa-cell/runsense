/* Synthetic end-to-end workout pipeline tests.
 * Covers coach workout -> Intervals.icu text/event -> Huawei course structure -> sync verification.
 * Run: node tests/workout-pipeline.synthetic.test.js
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const html = fs.readFileSync(path.join(__dirname, "..", "runsense.html"), "utf8");

function extractFunction(name) {
  const start = html.indexOf("  function " + name + "(");
  assert.notEqual(start, -1, "missing production function " + name);
  const open = html.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error("unclosed production function " + name);
}

// buildWorkout uses the production text parser; include that dependency in this isolated harness.
const buildWorkout = new Function(extractFunction("parsePlannedWorkout") + ";" + extractFunction("buildWorkout") + "; return buildWorkout;")();
const buildIntervalsWorkoutEvent = new Function(extractFunction("buildIntervalsWorkoutEvent") + "; return buildIntervalsWorkoutEvent;")();
const hasStructuredWorkout = new Function(extractFunction("hasStructuredWorkout") + "; return hasStructuredWorkout;")();
const mergeActsSource = extractFunction("mergeActs");
const ZONE_PCT = { 1: [50, 70], 2: [70, 80], 3: [80, 87], 4: [87, 93], 5: [93, 100] };
// toCourse calls buildWorkout, which in turn uses the production text parser.
const courseState = { lthrC: 166, max: 185, rest: 63, athlete: {} };
const toCourse = new Function("ZONE_PCT", "state",
  extractFunction("maxHr") + ";" + extractFunction("restHr") + ";" +
  extractFunction("lthrNow") + ";" + extractFunction("lthrZoneEdges") + ";" +
  extractFunction("lthrZoneHrBounds") + ";" +
  extractFunction("parsePlannedWorkout") + ";" + extractFunction("buildWorkout") + ";" +
  extractFunction("toCourse") + "; return toCourse;"
)(ZONE_PCT, courseState);

const results = [];
function test(name, fn) {
  try { fn(); results.push({ scenario: name, result: "PASS" }); }
  catch (error) { results.push({ scenario: name, result: "FAIL", error: error.message }); }
}

// A realistic synthetic threshold workout, including all phases and recovery repetitions.
const recommendation = {
  title: "Cruise intervals",
  duration: "48 menit",
  stage: 2,
  pace: "Terkendali",
  wl: [
    "Warmup", "- 10m Z2 HR", "",
    "Main set", "4x", "- 6m Z4 HR", "- 1m Z1 HR", "",
    "Cooldown", "- 8m Z1 HR"
  ]
};
const compiled = buildWorkout(recommendation);
const course = toCourse(recommendation);
const event = buildIntervalsWorkoutEvent(recommendation, "2026-11-19", compiled.text);

test("Compiler retains warm-up, work, recovery, and cool-down", () => {
  assert.equal(compiled.structured, true);
  assert.match(compiled.text, /Warmup[\s\S]*- 10m Z2 HR/);
  assert.match(compiled.text, /4x[\s\S]*- 6m Z4 HR[\s\S]*- 1m Z1 HR/);
  assert.match(compiled.text, /Cooldown[\s\S]*- 8m Z1 HR/);
  assert.equal(compiled.expectedSteps, 4);
});
test("Huawei course contains all phases and interval repeat count", () => {
  assert.ok(course);
  assert.equal(course.blocks.length, 3);
  assert.equal(course.blocks[0].steps[0].kind, "warmup");
  assert.equal(course.blocks[1].repeat, 4);
  assert.equal(course.blocks[1].steps.length, 2);
  assert.equal(course.blocks[2].steps[0].kind, "cooldown");
});
test("Intervals event uses the selected date, run type, and full compiled description", () => {
  assert.equal(event.category, "WORKOUT");
  assert.equal(event.start_date_local, "2026-11-19T00:00:00");
  assert.equal(event.type, "Run");
  assert.match(event.name, /Cruise intervals/);
  assert.equal(event.description, compiled.text);
});
test("A complete synthetic Intervals workout_doc is accepted", () => {
  const mockApiResponse = { id: 8123, workout_doc: { steps: [
    { duration: 600 },
    { reps: 4, text: "4x", steps: [{ duration: 360 }, { duration: 60 }] },
    { duration: 480 }
  ] } };
  assert.equal(hasStructuredWorkout(mockApiResponse, compiled.expectedSteps), true);
});
test("An event without workout_doc is not falsely reported as synced", () => {
  assert.equal(hasStructuredWorkout({ id: 8124 }, compiled.expectedSteps), false);
});
test("A truncated workout_doc is rejected", () => {
  assert.equal(hasStructuredWorkout({ workout_doc: { steps: [
    { duration: 600 },
    { reps: 4, steps: [{ duration: 360 }] }
  ] } }, compiled.expectedSteps), false);
});
test("Walk recommendations remain Walk events", () => {
  const walk = buildIntervalsWorkoutEvent({ title: "Walk recovery", stage: 1 }, "2026-11-19", "Warmup\n- 5m Z1 HR");
  assert.equal(walk.type, "Walk");
});


test("Post-run feedback follows stable activity ID when Intervals corrects start time", () => {
  const oldStart = Date.UTC(2026, 10, 18, 8);
  const newStart = oldStart + 60000;
  const state = { acts: [[oldStart, "run", 35, 5, 150, 0, "icu_42", "Easy", 0, "42", 0, 0]], vx: {} };
  const FEEL = { sessions: { [oldStart]: { rpe: 5, legs: 1 } } };
  let saved = 0;
  const row = () => [newStart, "run", 35, 5, 150, 0, "icu_42", "Easy", 0, "42", 0, 0];
  const mergeActs = new Function("state", "FEEL", "feelSave", "row", mergeActsSource + "; return mergeActs;")(state, FEEL, () => saved++, row);
  mergeActs([{}]);
  assert.equal(FEEL.sessions[oldStart], undefined);
  assert.equal(FEEL.sessions[newStart].rpe, 5);
  assert.equal(FEEL.sessions[newStart].activityId, "42");
  assert.equal(saved, 1);
});
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x => x[1]).filter(x => x.trim());
for (const script of scripts) new Function(script);
const report = { syntheticOnly: true, productionFunctions: ["buildWorkout", "buildIntervalsWorkoutEvent", "hasStructuredWorkout", "toCourse"], scriptBlocksSyntaxChecked: scripts.length, passed: results.filter(x => x.result === "PASS").length, failed: results.filter(x => x.result === "FAIL").length, results };
console.log(JSON.stringify(report, null, 2));
if (report.failed) process.exitCode = 1;
