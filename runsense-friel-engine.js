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
  function iso(ms){const d=new Date(ms);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
  function phaseDurations(distance){
    if(distance>=42)return [["prep",0],["base1",28],["base2",28],["base3",28],["build",56],["peak",14],["taper",21],["race",0]];
    if(distance>=21)return [["prep",0],["base1",21],["base2",21],["base3",21],["build",42],["peak",14],["taper",14],["race",0]];
    if(distance>=10)return [["prep",0],["base1",21],["base2",21],["base3",21],["build",28],["peak",7],["taper",7],["race",0]];
    return [["prep",0],["base1",21],["base2",21],["base3",21],["build",21],["peak",7],["taper",7],["race",0]];
  }
  function calendarFor(now,raceDate,raceDistance,firstTrainingDate){
    const today=dateOnly(now);
    if(raceDate){const race=new Date(raceDate+"T00:00:00");if(!Number.isNaN(+race)){
      const raceMs=dateOnly(+race),days=Math.round((raceMs-today)/DAY),segments=[];let cursor=raceMs;
      const rows=phaseDurations(raceDistance);
      for(let i=rows.length-1;i>=1;i--){const [name,duration]=rows[i],end=cursor,start=end-duration*DAY;
        if(name==="race")segments.unshift({name,label:phaseLabel(name),start:iso(raceMs),end:iso(raceMs),days:1});
        else{const clipped=firstTrainingDate?Math.max(start,dateOnly(firstTrainingDate)):start;if(clipped<end)segments.unshift({name,label:phaseLabel(name),start:iso(clipped),end:iso(end-DAY),days:Math.ceil((end-clipped)/DAY),compressed:clipped>start});}
        cursor=start;
      }
      const prepStart=firstTrainingDate?dateOnly(firstTrainingDate):cursor;
      if(cursor>prepStart)segments.unshift({name:"prep",label:phaseLabel("prep"),start:iso(prepStart),end:iso(cursor-DAY),days:Math.ceil((cursor-prepStart)/DAY)});
      return {raceDate,raceDays:days,distance:Number(raceDistance)||0,phases:segments};
    }}
    const start=firstTrainingDate?dateOnly(firstTrainingDate):today;let cursor=start;
    const phases=[["prep",4],["base1",4],["base2",4],["base3",4]].map(([name,weeks])=>{const end=cursor+weeks*7*DAY,x={name,label:phaseLabel(name),start:iso(cursor),end:iso(end-DAY),days:weeks*7};cursor=end;return x;});
    return {raceDate:null,raceDays:null,distance:0,phases,elapsedWeeks:Math.max(0,Math.floor((today-start)/(7*DAY)))};
  }
  function phaseFor(now,raceDate,raceDistance,firstTrainingDate){
    const today=dateOnly(now);
    if(raceDate){const cal=calendarFor(now,raceDate,raceDistance,firstTrainingDate);if(cal.raceDays!=null){
      if(cal.raceDays<0)return {name:"transition",days:cal.raceDays,raceDays:cal.raceDays,week:1,weekInPhase:1};
      if(cal.raceDays===0)return {name:"race",days:0,raceDays:0,week:1,weekInPhase:1};
      const current=cal.phases.find(p=>p.name!=="prep"&&today>=Date.parse(p.start+"T00:00:00")&&today<=Date.parse(p.end+"T00:00:00"));
      if(current){const st=Date.parse(current.start+"T00:00:00"),week=Math.floor((today-st)/(7*DAY))+1;return {name:current.name,days:cal.raceDays,raceDays:cal.raceDays,week,weekInPhase:week,start:current.start,end:current.end,compressed:!!current.compressed};}
      const prep=cal.phases.find(p=>p.name==="prep");
      if(prep&&today>=Date.parse(prep.start+"T00:00:00")){const st=Date.parse(prep.start+"T00:00:00"),week=Math.floor((today-st)/(7*DAY))+1;return {name:"prep",days:cal.raceDays,raceDays:cal.raceDays,week,weekInPhase:week,start:prep.start,end:prep.end};}
      return {name:"prep",days:cal.raceDays,raceDays:cal.raceDays,week:1,weekInPhase:1};
    }}
    const start=firstTrainingDate||today,weeks=Math.max(0,Math.floor((today-dateOnly(start))/(7*DAY)));
    const name=weeks<4?"prep":weeks<8?"base1":weeks<12?"base2":"base3";
    return {name,week:weeks+1,weekInPhase:weeks%4+1};
  }
  function weekStart(ms) {
    const d = new Date(ms);
    return dateOnly(ms) - ((d.getDay() + 6) % 7) * DAY;
  }
  function classify(a, lthr) {
    if (a.kind !== "run") return { quality:false, long:false, stress:false };
    const duration = Number(a.duration) || 0;
    const hr = Number(a.hr) || 0;
    const rpe = Number(a.rpe) || 0;
    const z = Array.isArray(a.zoneSeconds) ? a.zoneSeconds : [];
    const hardZone = z.reduce((s, n, i) => s + (i >= 3 ? Number(n || 0) : 0), 0);
    const quality = !!a.quality || rpe >= 7 || (lthr > 0 && hr >= lthr * .95) || (duration > 0 && hardZone / 60 >= 8);
    const long = duration >= 75;
    return { quality, long, stress: quality || long };
  }
  function phaseLabel(name) {
    return ({prep:"Persiapan",base1:"Base 1",base2:"Base 2",base3:"Base 3",build:"Build spesifik lomba",peak:"Peak",taper:"Taper",race:"Lomba",transition:"Transisi"})[name] || name;
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
    const first = runs.length ? Math.min(...runs.map(a=>a.timestamp)) : now;
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
    const raceDays = phase.raceDays;
    const cycleWeek = phase.name === "build" && Number.isFinite(raceDays) ? Math.max(1, Math.floor((84-raceDays)/7)+1) : trainingWeek;
    const recoveryCycle = Number(input.recoveryCycle) === 2 ? 2 : 3;
    const phaseWeek = Number(phase.weekInPhase || phase.week || cycleWeek);
    const recoveryWeek = phaseWeek % (recoveryCycle + 1) === 0;
    const currentMinutes = last7.filter(a=>a.kind === "run").reduce((sum,a)=>sum+(Number(a.duration)||0),0);
    const priorWeeks = [1,2,3,4].map(w => acts.filter(a=>a.kind === "run" && a.timestamp>=today-(6+w*7)*DAY && a.timestamp<today-(6+(w-1)*7)*DAY).reduce((sum,a)=>sum+(Number(a.duration)||0),0));
    const baselineMinutes = priorWeeks.reduce((sum,v)=>sum+v,0)/4;
    const loadRatio = baselineMinutes>0 ? currentMinutes/baselineMinutes : null;
    const plannedType = input.plannedType || "auto";
    const isLongDay = plannedType === "long" || (plannedType === "auto" && (input.preferredLongDay != null ? new Date(now).getDay() === Number(input.preferredLongDay) : new Date(now).getDay() === 6));
    const plannedHardDay = plannedType === "quality" || (plannedType === "auto" && (input.preferredQualityDays ? input.preferredQualityDays.includes(new Date(now).getDay()) : [2,4].includes(new Date(now).getDay())));
    const taper = phase.name === "taper" || phase.name === "peak";
    const metrics = aerobicMetrics(acts);

    const easy = (title, mins, why, tag) => ({
      k:"easy", status:"train", title, duration:mins+" menit",
      hr:lthr ? "Zone 1–2 · di bawah 90% LTHR" : "RPE 2–3 · bisa ngobrol",
      pace:input.easyPace || "Nyaman, tanpa mengejar pace",
      reason:why, adaptation:tag === "LONG" ? "Durability dan aerobic endurance" : tag === "RECOVERY" ? "Pemulihan" : tag === "TAPER" ? "Menjaga kesegaran" : "Aerobic endurance dan aerobic efficiency",
      steps:[["Pemanasan","5 mnt sangat mudah"],["Inti",Math.max(10,mins-10)+" mnt lari santai, napas terkendali"],["Pendinginan","5 mnt jalan atau jog ringan"]],
      score:readiness, tag:tag || "EASY"
    });
    const rest = (why) => ({
      k:"rest", status:"rest", title:"Istirahat / pemulihan", duration:"—", hr:"—", pace:"—",
      reason:why, adaptation:"Pemulihan", steps:[["Pilihan","Jalan santai 10–20 menit hanya jika terasa nyaman"]], score:readiness, tag:"RECOVERY"
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
        reason:"Sesi sesuai fase "+phaseLabel(phase.name)+". Pemanasan dan pendinginan wajib; hentikan repetisi bila teknik atau kondisi memburuk.",
        adaptation:strides ? "Speed dan keterampilan neuromuskular" : hills ? "Strength endurance dan durability" : threshold ? "Threshold" : "Aerobic power dan speed",
        steps:[["Pemanasan","10 mnt jog mudah + mobilitas"],["Inti",main],["Pendinginan","5 mnt jog sangat mudah"]],
        score:readiness, tag:"QUALITY"
      };
    };
    const longRun = () => {
      const cap = phase.name === "prep" ? 40 : phase.name === "base1" ? 55 : phase.name === "base2" ? 70 : phase.name === "base3" ? 85 : 120;
      const recentRuns = runs.filter(a=>a.timestamp>=now-42*DAY).map(a=>a.duration);
      const longest = recentRuns.length ? Math.max(...recentRuns) : baseDuration;
      const phaseCap = Math.max(cap, longest);
      const target = Math.min(phaseCap, longest * 1.05);
      const mins = Math.round(clamp(Math.max(baseDuration,target), 25, phaseCap));
      return easy("Long Run mudah", mins, "Sasaran daya tahan aerobik. Durasi hanya bertambah bertahap dari lari panjang yang sudah ditoleransi; intensitas tetap mudah.", "LONG");
    };

    if (input.pain >= 2 || feel.pain >= 2) return rest("Ada nyeri yang jelas atau mengubah gerak. Jangan menjalankan sesi lari; kembali bertahap setelah aktivitas harian dan jalan nyaman bebas nyeri.");
    if (input.illness) return rest("Kondisi sakit mengalahkan rencana latihan. Pulihkan diri terlebih dahulu.");
    if (phase.name === "race") return { k:"race", status:"train", title:"Hari lomba", duration:"Sesuai jarak lomba", hr:"Mulai terkendali", pace:"Ikuti target realistis", reason:"Hari lomba. Awali konservatif dan jangan mengejar pace pada kilometer awal.", adaptation:"Eksekusi performa spesifik lomba", steps:[["Pemanasan","10–15 mnt mudah"],["Lomba","Atur usaha bertahap sesuai jarak"],["Pemulihan","Jalan ringan setelah finis"]], score:readiness, tag:"LOMBA" };
    if (phase.name === "transition") return rest("Fase transisi setelah lomba atau siklus latihan. Pulihkan diri sebelum membangun siklus berikutnya.");
    if (plannedType === "rest") return rest("Hari ini ditetapkan sebagai hari istirahat dalam jadwal mingguan.");
    if (phase.name === "taper" && raceDays < 4) return easy("Easy taper", 15, "Jaga kaki tetap segar. Tidak ada sesi kualitas atau penambahan volume menjelang lomba.", "TAPER");
    if (recoveryWeek || readiness < 42 || yesterday && yesterday.stress) {
      return easy("Easy recovery", Math.max(15, Math.round(baseDuration * .65)), recoveryWeek ? "Pekan pemulihan terjadwal: kurangi volume, pertahankan gerak mudah, tanpa sesi kualitas." : "Beri jarak pemulihan setelah beban berat atau kesiapan rendah.", "RECOVERY");
    }
    if (readiness < 55) return easy("Easy terbatas", Math.max(15, Math.round(baseDuration * .7)), "Kesiapan belum mendukung latihan berat. Pertahankan intensitas rendah dan evaluasi respons tubuh.", "EASY");
    const hasRecentLong = runs.some(a=>a.timestamp>=now-42*DAY && a.duration>=75);
    const longIsStressful = hasRecentLong || baseDuration >= 70;
    if (plannedType !== "easy" && isLongDay && weeklyRuns >= 1 && (stressDays < 2 || !longIsStressful) && !taper) return longRun();
    const maxQuality = phase.name === "prep" || phase.name === "base1" || phase.name === "base2" || longIsStressful ? 1 : 2;
    const qualityAllowed = plannedType !== "easy" && plannedHardDay && qualityDays < maxQuality && stressDays < 2 && readiness >= 65 && !taper && !(loadRatio != null && loadRatio >= 1.1);
    if (qualityAllowed) {
      const type = phase.name === "prep" || phase.name === "base1" ? "strides" : phase.name === "base2" ? "hills" : phase.name === "base3" ? "threshold" : (trainingWeek % 2 ? "threshold" : "vo2");
      return quality(type);
    }
    let easyMins = Math.round(clamp(baseDuration * (taper ? .7 : 1), 15, 65) / 5) * 5;
    if (loadRatio != null && loadRatio >= 1.1) easyMins = Math.max(15, Math.round(easyMins * (loadRatio >= 1.3 ? .8 : .9)));
    const reason = "Fase "+phaseLabel(phase.name)+" · hari mudah. Beban keras minggu ini "+stressDays+"/2 hari; mayoritas latihan dijaga ringan agar adaptasi dan pemulihan berjalan.";
    const r = easy("Easy Run", easyMins, reason, taper ? "TAPER" : "EASY");
    r.periodization = { phase:phase.name, phaseWeek:phase.weekInPhase||phase.week||1, phaseStart:phase.start||null, phaseEnd:phase.end||null, recoveryWeek, recoveryCycle:recoveryCycle+":1" };
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
    const first = runs.length ? Math.min(...runs.map(a=>a.timestamp)) : now;
    const phase = phaseFor(now,input.raceDate,Number(input.raceDistance)||0,first);
    const recent = acts.filter(a=>a.timestamp>=now-7*DAY);
    const dayMap = new Map();
    recent.forEach(a=>{const k=dateOnly(a.timestamp),c=classify(a,Number(input.lthr)||0),v=dayMap.get(k)||{stress:false,quality:false};v.stress=v.stress||c.stress;v.quality=v.quality||c.quality;dayMap.set(k,v);});
    return { phase, calendar:calendarFor(now,input.raceDate,Number(input.raceDistance)||0,first), recovery:{cycle:Number(input.recoveryCycle)===2?"2:1":"3:1",week:phase.weekInPhase||phase.week||1,isRecoveryWeek:((phase.weekInPhase||phase.week||1)%(Number(input.recoveryCycle)===2?3:4)===0)}, strengthGuidance:strengthForPhase(phase.name), stressDays:[...dayMap.values()].filter(v=>v.stress).length, qualityDays:[...dayMap.values()].filter(v=>v.quality).length, aerobic:aerobicMetrics(acts) };
  }
  root.RunSenseFrielEngine = Object.freeze({ version:"1.2.0", recommend, inspect });
})(typeof window !== "undefined" ? window : this);
