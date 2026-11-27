/* RunSense Friel Training Engine v1
 * Deterministic training-decision engine. No network, no UI, no storage writes.
 * Inputs are normalized by runsense.html; output follows the existing recommendation contract.
 */
(function (root) {
  "use strict";
  const DAY = 86400000;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const median = (xs) => {
    const a = xs.filter(Number.isFinite).sort((x, y) => x - y);
    if (!a.length) return null;
    const m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  const dateOnly = (ms) => {
    const d = new Date(ms);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };
  function phaseFor(now, raceDate, raceDistance, firstTrainingDate) {
    if (raceDate) {
      const race = new Date(raceDate + "T00:00:00");
      if (!Number.isNaN(+race)) {
        const days = Math.round((dateOnly(+race) - dateOnly(now)) / DAY);
        const taperDays = raceDistance >= 42 ? 21 : raceDistance >= 21 ? 14 : 7;
        if (days < 0) return { name: "transition", days, raceDays: days };
        if (days === 0) return { name: "race", days, raceDays: 0 };
        if (days <= taperDays) return { name: "taper", days, raceDays: days };
        if (days <= taperDays + 14) return { name: "peak", days, raceDays: days };
        if (days <= 84) return { name: "build", days, raceDays: days };
      }
    }
    const start = firstTrainingDate || (now - 84 * DAY);
    const weeks = Math.max(0, Math.floor((dateOnly(now) - dateOnly(start)) / (7 * DAY)));
    if (weeks < 4) return { name: "prep", week: weeks + 1 };
    if (weeks < 8) return { name: "base1", week: weeks + 1 };
    if (weeks < 12) return { name: "base2", week: weeks + 1 };
    return { name: "base3", week: weeks + 1 };
  }
  function weekStart(ms) {
    const d = new Date(ms);
    return dateOnly(ms) - ((d.getDay() + 6) % 7) * DAY;
  }
  function classify(a, lthr) {
    const duration = Number(a.duration) || 0;
    const hr = Number(a.hr) || 0;
    const rpe = Number(a.rpe) || 0;
    const z = Array.isArray(a.zoneSeconds) ? a.zoneSeconds : [];
    const hardZone = z.reduce((s, n, i) => s + (i >= 3 ? Number(n || 0) : 0), 0);
    const quality = !!a.quality || rpe >= 7 || (lthr > 0 && hr >= lthr * .95) || (duration > 0 && hardZone / 60 >= 8);
    const long = duration >= 80 || (Number(a.distance) >= 0.75 && Number(a.distance) >= Number(a.weeklyDistance || 0) * .25);
    return { quality, long, stress: quality || (long && duration >= 90) };
  }
  function strengthForPhase(name) {
    if (name === "prep" || name === "base1") return "2 sesi/minggu; utamakan teknik, kekuatan umum dan progresi bertahap.";
    if (name === "base2") return "2 sesi/minggu; mulai beban lebih menantang dengan repetisi rendah-menengah dan teknik terjaga.";
    if (name === "base3" || name === "build") return "1 sesi/minggu pemeliharaan; sekitar 2 set per gerakan, hindari kelelahan yang mengganggu sesi lari kunci.";
    if (name === "peak") return "1 sesi ringan opsional; kurangi volume dan jangan mencoba beban baru.";
    return "Hindari strength berat; cukup aktivasi dan mobilitas ringan.";
  }
  function aerobicMetrics(activities) {
    const rows = activities.filter(a => a.kind === "run" && a.ef > 0 && a.timestamp > 0).sort((a,b)=>a.timestamp-b.timestamp);
    const recent = rows.slice(-5);
    const older = rows.slice(-10,-5);
    const avg = xs => xs.length ? xs.reduce((s,x)=>s+x.ef,0)/xs.length : null;
    const recentEf = avg(recent), priorEf = avg(older);
    const drift = rows.map(a=>a.decoupling).filter(Number.isFinite);
    return {
      samples: rows.length,
      efficiency: recentEf == null ? null : Math.round(recentEf * 100) / 100,
      efficiencyChangePct: recentEf != null && priorEf > 0 ? Math.round((recentEf / priorEf - 1) * 1000) / 10 : null,
      medianDecouplingPct: median(drift)
    };
  }
  function recommend(input) {
    const now = Number(input.now) || Date.now();
    const acts = (input.activities || []).filter(a => a && a.timestamp <= now && a.timestamp > 0);
    const runs = acts.filter(a => a.kind === "run" && a.duration > 0 && a.distance > 0);
    const first = runs.length ? Math.min(...runs.map(a=>a.timestamp)) : now - 84 * DAY;
    const phase = phaseFor(now, input.raceDate, Number(input.raceDistance) || 0, first);
    const lthr = Number(input.lthr) || 0;
    const today = dateOnly(now), start = weekStart(now);
    const last7 = acts.filter(a => a.timestamp >= today - 6 * DAY);
    const dayMap = new Map();
    last7.forEach(a => {
      const day = dateOnly(a.timestamp);
      const c = classify(a, lthr);
      const old = dayMap.get(day) || { stress:false, quality:false, long:false, duration:0 };
      old.stress = old.stress || c.stress;
      old.quality = old.quality || c.quality;
      old.long = old.long || c.long;
      old.duration += Number(a.duration) || 0;
      dayMap.set(day, old);
    });
    const stressDays = [...dayMap.values()].filter(x=>x.stress).length;
    const qualityDays = [...dayMap.values()].filter(x=>x.quality).length;
    const yesterday = dayMap.get(today - DAY);
    const readiness = input.readiness == null ? 60 : Number(input.readiness);
    const pain = Number(input.pain) || 0;
    const feel = input.feel || {};
    const heat = !!input.heat || !!feel.hot;
    const rain = !!feel.rain;
    const recentDurations = runs.filter(a=>a.timestamp >= now-28*DAY && a.duration >= 15 && a.duration <= 150).map(a=>a.duration);
    const baseDuration = median(recentDurations) || 25;
    const weeklyRuns = runs.filter(a=>a.timestamp >= now-7*DAY).length;
    const trainingWeek = Math.max(1, Math.floor((today - dateOnly(first)) / (7*DAY)) + 1);
    const cycleWeek = phase.name === "build" && Number.isFinite(raceDays) ? Math.max(1, Math.floor((84-raceDays)/7)+1) : trainingWeek;
    const recoveryWeek = cycleWeek % (Number(input.recoveryCycle) === 2 ? 3 : 4) === 0;
    const currentMinutes = last7.reduce((sum,a)=>sum+(Number(a.duration)||0),0);
    const priorWeeks = [1,2,3,4].map(w => acts.filter(a=>a.timestamp>=today-w*7*DAY && a.timestamp<today-(w-1)*7*DAY).reduce((sum,a)=>sum+(Number(a.duration)||0),0));
    const baselineMinutes = priorWeeks.reduce((sum,v)=>sum+v,0)/4;
    const loadRatio = baselineMinutes>0 ? currentMinutes/baselineMinutes : null;
    const isLongDay = input.preferredLongDay != null ? new Date(now).getDay() === Number(input.preferredLongDay) : new Date(now).getDay() === 6;
    const plannedHardDay = input.preferredQualityDays ? input.preferredQualityDays.includes(new Date(now).getDay()) : [2,5].includes(new Date(now).getDay());
    const raceDays = phase.raceDays;
    const taper = phase.name === "taper" || phase.name === "peak";
    const metrics = aerobicMetrics(acts);

    const easy = (title, mins, why, tag) => ({
      k:"easy", status:"train", title, duration:mins+" menit",
      hr:lthr ? "Zone 1–2 · di bawah 90% LTHR" : "RPE 2–3 · bisa ngobrol",
      pace:input.easyPace || "Nyaman, tanpa mengejar pace",
      reason:why, steps:[["Pemanasan","5 mnt sangat mudah"],["Inti",Math.max(10,mins-10)+" mnt lari santai, napas terkendali"],["Pendinginan","5 mnt jalan atau jog ringan"]],
      score:readiness, tag:tag || "EASY"
    });
    const rest = (why) => ({
      k:"rest", status:"rest", title:"Istirahat / pemulihan", duration:"—", hr:"—", pace:"—",
      reason:why, steps:[["Pilihan","Jalan santai 10–20 menit hanya jika terasa nyaman"]], score:readiness, tag:"RECOVERY"
    });
    const quality = (kind) => {
      const strides = kind === "strides", hills = kind === "hills", threshold = kind === "threshold";
      const reps = strides ? 6 : hills ? 6 : threshold ? (phase.name === "base3" ? 3 : 2) : 5;
      const work = strides ? 20 : hills ? 1 : threshold ? 6 : 2;
      const restMin = strides ? 1 : 2;
      const total = strides ? 23 : 15 + reps * (work + restMin);
      const label = strides ? "Strides dan teknik lari" : hills ? "Tanjakan terkontrol" : threshold ? "Threshold terkendali" : "Interval aerobik cepat";
      const zone = strides ? "Cepat-rileks · bukan sprint" : hills ? "RPE 6–7 · kuat, teknik terjaga" : threshold ? "Zone 4 · sekitar LTHR" : "Zone 5 · singkat dan terkendali";
      const main = strides ? reps+"× 20 dtk strides rileks, jeda 1 mnt jalan" : reps+"× "+work+" mnt kerja terkontrol, jeda "+restMin+" mnt jog/jalan";
      return {
        k:"quality", status:"train", title:label, duration:total+" menit", hr:zone,
        pace:threshold && input.ltPace ? input.ltPace+" /km (panduan, bukan paksaan)" : "Berdasarkan usaha; ulangi dengan teknik rapi",
        reason:"Sesi sesuai fase "+phase.name+". Pemanasan dan pendinginan wajib; hentikan repetisi bila teknik atau kondisi memburuk.",
        steps:[["Pemanasan","10 mnt jog mudah + mobilitas"],["Inti",main],["Pendinginan","5 mnt jog sangat mudah"]],
        score:readiness, tag:"QUALITY"
      };
    };
    const longRun = () => {
      const cap = phase.name === "prep" ? 40 : phase.name === "base1" ? 55 : phase.name === "base2" ? 70 : phase.name === "base3" ? 85 : 120;
      const recentLong = runs.filter(a=>a.timestamp>=now-42*DAY && a.duration>=Math.max(50,baseDuration*1.3)).map(a=>a.duration);
      const longest = recentLong.length ? Math.max(...recentLong) : baseDuration;
      const target = Math.min(cap, longest * 1.05);
      const mins = Math.round(clamp(Math.max(baseDuration,target), 25, cap) / 5) * 5;
      return easy("Long Run mudah", mins, "Sasaran daya tahan aerobik. Durasi hanya bertambah bertahap dari lari panjang yang sudah ditoleransi; intensitas tetap mudah.", "LONG");
    };

    if (input.pain >= 2 || feel.pain >= 2) return rest("Ada nyeri yang jelas atau mengubah gerak. Jangan menjalankan sesi lari; kembali bertahap setelah aktivitas harian dan jalan nyaman bebas nyeri.");
    if (input.illness) return rest("Kondisi sakit mengalahkan rencana latihan. Pulihkan diri terlebih dahulu.");
    if (phase.name === "race") return { k:"race", status:"train", title:"Hari lomba", duration:"Sesuai jarak lomba", hr:"Mulai terkendali", pace:"Ikuti target realistis", reason:"Hari lomba. Awali konservatif dan jangan mengejar pace pada kilometer awal.", steps:[["Pemanasan","10–15 mnt mudah"],["Lomba","Atur usaha bertahap sesuai jarak"],["Pemulihan","Jalan ringan setelah finis"]], score:readiness, tag:"LOMBA" };
    if (phase.name === "transition") return rest("Fase transisi setelah lomba atau siklus latihan. Pulihkan diri sebelum membangun siklus berikutnya.");
    if (phase.name === "taper" && raceDays < 4) return easy("Easy taper", 15, "Jaga kaki tetap segar. Tidak ada sesi kualitas atau penambahan volume menjelang lomba.", "TAPER");
    if (recoveryWeek || readiness < 42 || yesterday && yesterday.stress) {
      return easy("Easy recovery", Math.max(15, Math.round(baseDuration * .65)), recoveryWeek ? "Pekan pemulihan terjadwal: kurangi volume, pertahankan gerak mudah, tanpa sesi kualitas." : "Beri jarak pemulihan setelah beban berat atau kesiapan rendah.", "RECOVERY");
    }
    if (readiness < 55) return easy("Easy terbatas", Math.max(15, Math.round(baseDuration * .7)), "Kesiapan belum mendukung latihan berat. Pertahankan intensitas rendah dan evaluasi respons tubuh.", "EASY");
    if (isLongDay && weeklyRuns >= 1 && stressDays < 2 && !taper) return longRun();
    const maxQuality = phase.name === "prep" || phase.name === "base1" || phase.name === "base2" ? 1 : 2;
    const qualityAllowed = plannedHardDay && qualityDays < maxQuality && stressDays < 2 && readiness >= 65 && !taper && !(loadRatio != null && loadRatio >= 1.1);
    if (qualityAllowed) {
      const type = phase.name === "prep" || phase.name === "base1" ? "strides" : phase.name === "base2" ? "hills" : phase.name === "base3" ? "threshold" : (trainingWeek % 2 ? "threshold" : "vo2");
      return quality(type);
    }
    let easyMins = Math.round(clamp(baseDuration * (taper ? .7 : 1), 15, 65) / 5) * 5;
    if (loadRatio != null && loadRatio >= 1.1) easyMins = Math.max(15, Math.round(easyMins * (loadRatio >= 1.3 ? .8 : .9)));
    const reason = "Fase "+phase.name+" · hari mudah. Beban keras minggu ini "+stressDays+"/2 hari; mayoritas latihan dijaga ringan agar adaptasi dan pemulihan berjalan.";
    const r = easy("Easy Run", easyMins, reason, taper ? "TAPER" : "EASY");
    if (heat) { r.duration = Math.max(15, Math.round(easyMins*.85))+" menit"; r.reason += " Cuaca panas: kurangi durasi dan utamakan rasa nyaman."; }
    if (rain) r.reason += " Hujan: pilih rute aman atau pindahkan sesi.";
    if (loadRatio != null && loadRatio >= 1.1) r.reason += " Durasi disesuaikan karena total menit 7 hari mendekati atau melampaui baseline 4 minggu.";
    if (metrics.efficiencyChangePct != null) r.reason += " Efisiensi aerobik terbaru "+(metrics.efficiencyChangePct>0?"+":"")+metrics.efficiencyChangePct+"% dibanding kelompok sesi sebelumnya (indikator tren, bukan diagnosis).";
    if (metrics.medianDecouplingPct != null) r.reason += " Drift aerobik median "+metrics.medianDecouplingPct+"% pada sesi dengan stream lengkap; pantau trennya, bukan satu sesi saja.";
    const strength = strengthForPhase(phase.name);
    r.strengthGuidance = strength;
    r.reason += " Strength fase ini: " + strength;
    return r;
  }
  function inspect(input) {
    const now = Number(input.now) || Date.now();
    const acts = input.activities || [];
    const runs = acts.filter(a=>a.kind==="run"&&a.distance>0);
    const first = runs.length ? Math.min(...runs.map(a=>a.timestamp)) : now-84*DAY;
    const phase = phaseFor(now,input.raceDate,Number(input.raceDistance)||0,first);
    const recent = acts.filter(a=>a.timestamp>=now-7*DAY);
    const dayMap = new Map();
    recent.forEach(a=>{const k=dateOnly(a.timestamp),c=classify(a,Number(input.lthr)||0),v=dayMap.get(k)||{stress:false,quality:false};v.stress=v.stress||c.stress;v.quality=v.quality||c.quality;dayMap.set(k,v);});
    return { phase, strengthGuidance:strengthForPhase(phase.name), stressDays:[...dayMap.values()].filter(v=>v.stress).length, qualityDays:[...dayMap.values()].filter(v=>v.quality).length, aerobic:aerobicMetrics(acts) };
  }
  root.RunSenseFrielEngine = Object.freeze({ version:"1.0.0", recommend, inspect });
})(typeof window !== "undefined" ? window : this);
