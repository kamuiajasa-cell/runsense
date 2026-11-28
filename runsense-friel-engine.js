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
  function phaseDurations(distance, daysUntilRace){
    // Rencana pendek mengikuti prinsip Build-Peak saat lomba A tinggal kurang dari 12 minggu:
    // jangan memaksakan Base 1–3 yang tidak lagi muat di kalender.
    const shortRace = Number.isFinite(daysUntilRace) && daysUntilRace < 84;
    if(shortRace){
      // Jika lomba tinggal 7 hari atau kurang, seluruh hari tersisa adalah taper.
      // Jangan sisakan satu hari Build yang masih bisa memicu sesi kualitas.
      const taper = daysUntilRace <= 7 ? Math.max(0, daysUntilRace) : 7;
      const peak = daysUntilRace <= 7 ? 0 : Math.min(distance >= 21 ? 14 : 7, Math.max(0, daysUntilRace - taper));
      const build = Math.max(0, daysUntilRace - taper - peak);
      return [["prep",0],["build",build],["peak",peak],["taper",taper],["race",0]];
    }
    if(distance>=42)return [["prep",0],["base1",28],["base2",28],["base3",28],["build",56],["peak",14],["taper",21],["race",0]];
    if(distance>=21)return [["prep",0],["base1",21],["base2",21],["base3",21],["build",42],["peak",14],["taper",14],["race",0]];
    if(distance>=10)return [["prep",0],["base1",21],["base2",21],["base3",21],["build",28],["peak",7],["taper",7],["race",0]];
    return [["prep",0],["base1",21],["base2",21],["base3",21],["build",21],["peak",7],["taper",7],["race",0]];
  }
  function calendarFor(now,raceDate,raceDistance,firstTrainingDate){
    const today=dateOnly(now);
    if(raceDate){const race=new Date(raceDate+"T00:00:00");if(!Number.isNaN(+race)){
      const raceMs=dateOnly(+race),days=Math.round((raceMs-today)/DAY),segments=[];let cursor=raceMs;
      const rows=phaseDurations(raceDistance,days);
      for(let i=rows.length-1;i>=1;i--){const [name,duration]=rows[i],end=cursor,start=end-duration*DAY;
        if(name==="race")segments.unshift({name,label:phaseLabel(name),start:iso(raceMs),end:iso(raceMs),days:1});
        else{const clipped=firstTrainingDate?Math.max(start,dateOnly(firstTrainingDate)):start;if(clipped<end)segments.unshift({name,label:phaseLabel(name),start:iso(clipped),end:iso(end-DAY),days:Math.ceil((end-clipped)/DAY),compressed:clipped>start});}
        cursor=start;
      }
      const prepStart=firstTrainingDate?dateOnly(firstTrainingDate):cursor;
      // Untuk lomba <12 minggu, jangan membuat fase Prep/Base historis sebagai bagian rencana Build-Peak.
      if(days>=84&&cursor>prepStart)segments.unshift({name:"prep",label:phaseLabel("prep"),start:iso(prepStart),end:iso(cursor-DAY),days:Math.ceil((cursor-prepStart)/DAY)});
      return {raceDate,raceDays:days,distance:Number(raceDistance)||0,phases:segments};
    }}
    const start=firstTrainingDate?dateOnly(firstTrainingDate):today;let cursor=start;
    const elapsedWeeks=Math.max(0,Math.floor((today-start)/(7*DAY)));
    const phases=[];
    for(const [name,weeks] of [["prep",4],["base1",4],["base2",4]]){
      const end=cursor+weeks*7*DAY;phases.push({name,label:phaseLabel(name),start:iso(cursor),end:iso(end-DAY),days:weeks*7});cursor=end;
    }
    const currentBase3Block=Math.max(0,Math.floor((elapsedWeeks-12)/4));
    const finalBlock=currentBase3Block+3;
    for(let i=0;i<=finalBlock;i++){
      const blockStart=cursor+i*28*DAY,end=blockStart+28*DAY;
      phases.push({name:"base3",label:phaseLabel("base3"),cycle:i+1,start:iso(blockStart),end:iso(end-DAY),days:28});
    }
    return {raceDate:null,raceDays:null,distance:0,phases,elapsedWeeks};
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
    const cal=calendarFor(now,"",0,firstTrainingDate);
    const current=cal.phases.find(p=>p.name===name&&today>=Date.parse(p.start+"T00:00:00")&&today<=Date.parse(p.end+"T00:00:00"));
    const phaseStart=current?Date.parse(current.start+"T00:00:00"):dateOnly(start)+Math.floor(weeks/4)*28*DAY;
    return {name,week:weeks+1,weekInPhase:weeks%4+1,start:iso(phaseStart),end:iso(phaseStart+28*DAY-DAY)};
  }
  function activeTrainingStart(runs, now) {
    // Riwayat lama diputus setelah jeda lebih dari 42 hari.
    const recent = runs.filter(a => a.timestamp <= now && a.timestamp >= now - 42*DAY);
    return recent.length ? Math.min(...recent.map(a => a.timestamp)) : now;
  }
  function typicalRunDuration(runs, now) {
    return median(runs.filter(a => a.timestamp >= now-42*DAY && a.duration >= 10 && a.duration <= 150).map(a => Number(a.duration)));
  }
  function weekStart(ms) {
    const d = new Date(ms);
    return dateOnly(ms) - ((d.getDay() + 6) % 7) * DAY;
  }
  function classify(a, lthr, typicalDuration) {
    if (a.kind !== "run") return { quality:false, long:false, stress:false };
    const duration = Number(a.duration) || 0;
    const hr = Number(a.hr) || 0;
    const rpe = Number(a.rpe) || 0;
    const z = Array.isArray(a.zoneSeconds) ? a.zoneSeconds : [];
    const hardZone = z.reduce((s, n, i) => s + (i >= 3 ? Number(n || 0) : 0), 0);
    const quality = !!a.quality || rpe >= 7 || (lthr > 0 && hr >= lthr * .95) || (duration > 0 && hardZone / 60 >= 8);
    const long = duration >= 75 || (duration >= 60 && typicalDuration > 0 && duration >= typicalDuration * 1.4);
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
  function phasePrescription(name) {
    const plans = {
      prep: { quality:1, qualityType:"Strides ringan / teknik", long:"Long run mudah, pendek dan bertahap", easy:"Sesi lain seluruhnya easy Z1–Z2 atau istirahat", strength:2, strengthPlacement:"Sesi A setelah quality/strides; sesi B setelah easy run, beri jarak sekitar 48 jam. Jangan strength kaki berat sehari sebelum quality atau long run.", focus:"Membangun kebiasaan, teknik, dan toleransi beban" },
      base1: { quality:1, qualityType:"Strides rileks, bukan interval keras", long:"Long run mudah; tambah durasi hanya bila pulih baik", easy:"Easy Z1–Z2; sisipkan hari istirahat", strength:2, strengthPlacement:"Satu sesi setelah quality/strides dan satu sesi setelah easy run; beri jarak sekitar 48 jam. Hindari strength kaki berat sehari sebelum quality atau long run.", focus:"Fondasi aerobik dan kekuatan umum" },
      base2: { quality:1, qualityType:"Tanjakan terkontrol atau tempo pendek", long:"Long run mudah dengan progresi konservatif", easy:"Easy Z1–Z2; jangan menumpuk sesi berat", strength:2, strengthPlacement:"Satu sesi setelah quality/hills dan satu sesi setelah easy run; beri jarak sekitar 48 jam. Jangan letakkan strength kaki berat sehari sebelum sesi kunci.", focus:"Daya tahan aerobik dan kekuatan spesifik awal" },
      base3: { quality:1, qualityType:"Threshold terukur; sesi kedua hanya bila long run tidak berat dan pulih baik", long:"Long run mudah; hitung sebagai hari stres bila ≥75 menit", easy:"Easy Z1–Z2; minimal satu hari ringan setelah sesi stres", strength:1, strengthPlacement:"Satu sesi pemeliharaan setelah quality atau easy run; bukan sehari sebelum long run atau quality berikutnya.", focus:"Meningkatkan threshold dan durability" },
      build: { quality:1, qualityType:"Satu sesi spesifik lomba (threshold atau interval)", long:"Long run terjaga; tidak ditambah keras bersamaan dengan quality", easy:"Easy Z1–Z2; jaga jarak pemulihan antarsesi", strength:1, strengthPlacement:"Satu sesi singkat setelah easy run; jangan menambah DOMS atau mengganggu sesi spesifik dan long run.", focus:"Mengubah fondasi menjadi kemampuan spesifik lomba" },
      peak: { quality:1, qualityType:"Sesi singkat untuk mempertahankan ketajaman", long:"Long run dipangkas; tanpa mengejar jarak baru", easy:"Easy singkat dan segar; prioritaskan pemulihan", strength:0, strengthPlacement:"Hentikan strength berat; bila perlu hanya aktivasi ringan setelah easy run.", focus:"Menjaga kesiapan tanpa menambah kelelahan" },
      taper: { quality:0, qualityType:"Hanya strides/tune-up singkat bila segar", long:"Tidak ada long run yang melelahkan", easy:"Easy singkat, volume turun, tidur dan pemulihan diutamakan", strength:0, strengthPlacement:"Tidak ada strength berat. Mobilitas/aktivasi singkat saja, jangan sampai menimbulkan pegal.", focus:"Mengurangi kelelahan sambil mempertahankan rasa bugar" },
      race: { quality:0, qualityType:"Tidak ada sesi quality tambahan", long:"Lomba menjadi beban utama", easy:"Pemanasan dan pemulihan sesuai kebutuhan", strength:0, strengthPlacement:"Tidak ada strength; fokus lomba dan pemulihan.", focus:"Eksekusi lomba" },
      transition: { quality:0, qualityType:"Tidak ada sesi quality", long:"Tidak ada long run terstruktur", easy:"Jalan atau lari sangat ringan sesuai kondisi", strength:0, strengthPlacement:"Tidak ada strength terstruktur sampai tubuh siap kembali berlatih.", focus:"Pemulihan fisik dan mental" }
    };
    const p = plans[name] || plans.base1;
    return { ...p, maxStressDays:2, distribution:"Maksimal 2 hari stres dalam 7 hari; hari lain easy atau istirahat. Beri jarak pemulihan di antara sesi stres." };
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
    const first = activeTrainingStart(runs, now);
    const typicalDuration = typicalRunDuration(runs, now);
    const phase = phaseFor(now, input.raceDate, Number(input.raceDistance) || 0, first);
    const lthr = Number(input.lthr) || 0;
    const today = dateOnly(now), start = weekStart(now);
    const last7 = acts.filter(a => a.timestamp >= today - 6 * DAY);
    const dayMap = new Map();
    last7.forEach(a => {
      const day = dateOnly(a.timestamp);
      const c = classify(a, lthr, typicalDuration);
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
    // Siklus 3:1 dihitung sejak awal blok aktif, tetapi Recovery terjadwal
    // diterapkan pada fase pembentukan (Prep/Base/Build), bukan Peak/Taper.
    // Peak tetap punya sesi sharpening; Taper mengambil alih pemulihan akhir.
    const recoveryDue = trainingWeek % (recoveryCycle + 1) === 0;
    const recoveryApplies = ["prep","base1","base2","base3","build"].includes(phase.name);
    const recoveryWeek = recoveryApplies && recoveryDue;
    const currentMinutes = last7.filter(a=>a.kind === "run").reduce((sum,a)=>sum+(Number(a.duration)||0),0);
    const priorWeeks = [1,2,3,4].map(w => acts.filter(a=>a.kind === "run" && a.timestamp>=today-(6+w*7)*DAY && a.timestamp<today-(6+(w-1)*7)*DAY).reduce((sum,a)=>sum+(Number(a.duration)||0),0));
    const baselineMinutes = priorWeeks.reduce((sum,v)=>sum+v,0)/4;
    const loadRatio = baselineMinutes>0 ? currentMinutes/baselineMinutes : null;
    // Session-RPE load: durasi × RPE. Hanya bandingkan bila kedua periode punya cukup input.
    const ratedLast7 = last7.filter(a=>a.kind==="run"&&Number(a.rpe)>0);
    const ratedPrior21 = acts.filter(a=>a.kind==="run"&&a.timestamp>=today-27*DAY&&a.timestamp<today-6*DAY&&Number(a.rpe)>0);
    const rpeLoad7d = ratedLast7.reduce((sum,a)=>sum+(Number(a.duration)||0)*Number(a.rpe),0);
    const rpeLoadPrior21d = ratedPrior21.reduce((sum,a)=>sum+(Number(a.duration)||0)*Number(a.rpe),0);
    const rpeLoadBaseline = ratedPrior21.length>=2 ? rpeLoadPrior21d/3 : null;
    const rpeLoadRatio = ratedLast7.length>=2&&rpeLoadBaseline>0 ? rpeLoad7d/rpeLoadBaseline : null;
    const plannedType = input.plannedType || "auto";
    const style = ["moderate","conservative","aggressive"].includes(input.style) ? input.style : "moderate";
    const styleConfig = style === "conservative" ? {qualityReadiness:75,easyFactor:.9,longProgress:1.02,repFactor:.8,label:"Konservatif"} : style === "aggressive" ? {qualityReadiness:70,easyFactor:1,longProgress:1.05,repFactor:1,label:"Agresif-terkendali"} : {qualityReadiness:65,easyFactor:1,longProgress:1.05,repFactor:1,label:"Moderat"};
    const isLongDay = plannedType === "long" || (plannedType === "auto" && (input.preferredLongDay != null ? new Date(now).getDay() === Number(input.preferredLongDay) : new Date(now).getDay() === 6));
    const plannedHardDay = plannedType === "quality" || (plannedType === "auto" && (input.preferredQualityDays ? input.preferredQualityDays.includes(new Date(now).getDay()) : [2,4].includes(new Date(now).getDay())));
    const taper = phase.name === "taper";
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
      const peak = kind === "peak";
      const strides = kind === "strides", hills = kind === "hills", threshold = kind === "threshold";
      const baseReps = peak ? 4 : strides ? 6 : hills ? 6 : threshold ? (phase.name === "base3" ? 3 : 2) : 5;
      const reps = style === "conservative" ? Math.max(strides ? 4 : 2, Math.floor(baseReps * styleConfig.repFactor)) : baseReps;
      const work = peak ? 1 : strides ? 20 : hills ? 1 : threshold ? 6 : 2;
      const restMin = strides ? 1 : 2;
      const total = strides ? 23 : 15 + reps * (work + restMin);
      const label = peak ? "Interval singkat menjaga ketajaman" : strides ? "Strides dan teknik lari" : hills ? "Tanjakan terkontrol" : threshold ? "Threshold terkendali" : "Interval aerobik cepat";
      const zone = peak ? "Usaha 10K terkendali · bukan sprint" : strides ? "Cepat-rileks · bukan sprint" : hills ? "RPE 6–7 · kuat, teknik terjaga" : threshold ? "Zone 4 · sekitar LTHR" : "Zone 5 · singkat dan terkendali";
      const main = peak ? reps+"× 1 mnt pada usaha 10K terkendali, jeda 2 mnt jog mudah" : strides ? reps+"× 20 dtk strides rileks, jeda 1 mnt jalan" : reps+"× "+work+" mnt kerja terkontrol, jeda "+restMin+" mnt jog/jalan";
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
      // Acuan long run = rata-rata sesi panjang per pekan dalam 6 minggu terakhir,
      // bukan satu aktivitas terpanjang yang bisa menjadi pencilan.
      const weeklyLongRuns = new Map();
      runs.filter(a => a.timestamp >= now - 42*DAY && a.duration >= 45).forEach(a => {
        const wk = weekStart(a.timestamp);
        weeklyLongRuns.set(wk, Math.max(weeklyLongRuns.get(wk) || 0, Number(a.duration)));
      });
      const longSamples = [...weeklyLongRuns.values()];
      const avgLongRun = longSamples.length
        ? longSamples.reduce((sum, value) => sum + value, 0) / longSamples.length
        : (recentDurations.length >= 3 ? baseDuration : Math.min(30, baseDuration));
      // Batas fase membatasi progresi, bukan memotong kebiasaan mapan secara mendadak.
      const target = avgLongRun >= cap ? avgLongRun : Math.min(cap, avgLongRun * styleConfig.longProgress);
      const mins = Math.round(clamp(target, 25, Math.max(cap, avgLongRun)));
      return easy("Long Run mudah", mins,
        longSamples.length ? "Durasi mengacu pada rata-rata sesi panjang per pekan dalam 6 minggu terakhir; progresi maksimal sekitar 5% dan tidak memotong kebiasaan mapan secara mendadak." : "Belum ada riwayat long run yang cukup; sesi ini hanya perpanjangan ringan dari durasi lari biasa, bukan target long run penuh.",
        "LONG");
    };

    if (input.pain >= 2 || feel.pain >= 2) return rest("Ada nyeri yang jelas atau mengubah gerak. Jangan menjalankan sesi lari; kembali bertahap setelah aktivitas harian dan jalan nyaman bebas nyeri.");
    if (input.illness) return rest("Kondisi sakit mengalahkan rencana latihan. Pulihkan diri terlebih dahulu.");
    // Satu sesi lari yang sudah tercatat pada tanggal lokal hari ini menutup
    // rekomendasi lari tambahan. Jangan meminta pengguna berlari dua kali
    // hanya karena jadwal harian masih memiliki slot latihan.
    const completedRunsToday = acts.filter(a =>
      a.kind === "run" && dateOnly(a.timestamp) === today && Number(a.duration) > 0
    );
    if (completedRunsToday.length) {
      const completedMinutes = completedRunsToday.reduce((sum,a)=>sum+(Number(a.duration)||0),0);
      const completedKm = completedRunsToday.reduce((sum,a)=>sum+(Number(a.distance)||0),0);
      return {
        k:"ok", status:"done", title:"Sudah lari hari ini",
        duration:Math.round(completedMinutes)+" menit",
        hr:"—", pace:"—", tag:"DONE", score:readiness, steps:[],
        reason:"Aktivitas lari hari ini sudah tercatat"+(completedKm>0?" ("+completedKm.toFixed(2)+" km)":"")+". Tidak perlu menambah sesi lari. Pulihkan diri dan lanjutkan rencana besok."
      };
    }
    if (phase.name === "race") {
      const targetSeconds = Number(input.raceTargetSeconds) || 0;
      const targetPace = targetSeconds > 0 && Number(input.raceDistance) > 0 ? targetSeconds / Number(input.raceDistance) : 0;
      const paceText = targetPace > 0 ? Math.floor(targetPace/60)+":"+String(Math.round(targetPace%60)).padStart(2,"0")+" /km rata-rata sasaran" : "Ikuti target realistis";
      return { k:"race", status:"train", title:"Hari lomba", duration:"Sesuai jarak lomba", hr:"Mulai terkendali", pace:paceText, reason:"Hari lomba. Awali konservatif dan jangan mengejar pace pada kilometer awal."+(targetPace>0?" Target waktu "+input.raceTargetLabel+" setara sekitar "+paceText+". Pace ini panduan rata-rata, bukan kewajiban tiap kilometer.":""), adaptation:"Eksekusi performa spesifik lomba", steps:[["Pemanasan","10–15 mnt mudah"],["Lomba",targetPace>0?"Mulai sedikit lebih lambat dari pace rata-rata sasaran; evaluasi napas dan kondisi tiap 2–3 km.":"Atur usaha bertahap sesuai jarak"],["Pemulihan","Jalan ringan setelah finis"]], score:readiness, tag:"LOMBA" };
    }
    if (phase.name === "transition") return rest("Fase transisi setelah lomba atau siklus latihan. Pulihkan diri sebelum membangun siklus berikutnya.");
    if (plannedType === "rest") return rest("Hari ini ditetapkan sebagai hari istirahat dalam jadwal mingguan.");
    if (phase.name === "taper" && raceDays < 4) return easy("Easy taper", 15, "Jaga kaki tetap segar. Tidak ada sesi kualitas atau penambahan volume menjelang lomba.", "TAPER");
    if (recoveryWeek || readiness < 42 || yesterday && yesterday.stress || rpeLoadRatio != null && rpeLoadRatio >= 1.5) {
      const why = recoveryWeek ? "Pekan pemulihan terjadwal: kurangi volume, pertahankan gerak mudah, tanpa sesi kualitas."
        : rpeLoadRatio != null && rpeLoadRatio >= 1.5 ? "Beban subjektif 7 hari mencapai "+Math.round(rpeLoadRatio*100)+"% dari rerata mingguan 3 minggu sebelumnya. Hari ini diprioritaskan untuk pemulihan."
        : "Beri jarak pemulihan setelah beban berat atau kesiapan rendah.";
      return easy("Easy recovery", Math.max(15, Math.round(baseDuration * .65)), why, "RECOVERY");
    }
    if (readiness < 55) return easy("Easy terbatas", Math.max(15, Math.round(baseDuration * .7)), "Kesiapan belum mendukung latihan berat. Pertahankan intensitas rendah dan evaluasi respons tubuh.", "EASY");
    const longIsStressful = runs.some(a=>a.timestamp>=now-42*DAY && classify(a,lthr,typicalDuration).long);
    if (plannedType !== "easy" && isLongDay && weeklyRuns >= 1 && (stressDays < 2 || !longIsStressful) && phase.name !== "peak" && !taper) return longRun();
    const phasePlan = phasePrescription(phase.name);
    // Long run yang >=75 menit dihitung sebagai hari stres; jangan menambahkan quality kedua.
    const maxQuality = longIsStressful ? 1 : phasePlan.quality;
    const qualityAllowed = plannedType !== "easy" && plannedHardDay && qualityDays < maxQuality && stressDays < 2 && readiness >= styleConfig.qualityReadiness && !taper && !(loadRatio != null && loadRatio >= 1.1) && !(rpeLoadRatio != null && rpeLoadRatio >= 1.3);
    if (qualityAllowed) {
      const type = phase.name === "peak" ? "peak" : phase.name === "prep" || phase.name === "base1" ? "strides" : phase.name === "base2" ? "hills" : phase.name === "base3" ? "threshold" : (trainingWeek % 2 ? "threshold" : "vo2");
      const result = quality(type);
      result.periodization = { phase:phase.name, phaseWeek:phase.weekInPhase||phase.week||1, phaseStart:phase.start||null, phaseEnd:phase.end||null, recoveryWeek, recoveryDue, recoveryCycle:recoveryCycle+":1" };
      return result;
    }
    const easyCap = phase.name === "peak" ? 40 : taper ? 35 : 65;
    const easyFactor = phase.name === "peak" ? .8 : taper ? .7 : 1;
    let easyMins = Math.round(clamp(baseDuration * easyFactor * styleConfig.easyFactor, 15, easyCap) / 5) * 5;
    let easyAdjustment = 1;
    if (loadRatio != null && loadRatio >= 1.1) easyAdjustment = Math.min(easyAdjustment, loadRatio >= 1.3 ? .8 : .9);
    if (rpeLoadRatio != null && rpeLoadRatio >= 1.3) easyAdjustment = Math.min(easyAdjustment, .9);
    if (easyAdjustment < 1) easyMins = Math.max(15, Math.round(easyMins * easyAdjustment));
    const reason = "Fase "+phaseLabel(phase.name)+" · hari mudah. Beban keras minggu ini "+stressDays+"/2 hari; mayoritas latihan dijaga ringan agar adaptasi dan pemulihan berjalan.";
    const r = easy("Easy Run", easyMins, reason, taper ? "TAPER" : "EASY");
    r.periodization = { phase:phase.name, phaseWeek:phase.weekInPhase||phase.week||1, phaseStart:phase.start||null, phaseEnd:phase.end||null, recoveryWeek, recoveryCycle:recoveryCycle+":1" };
    if (heat) { r.duration = Math.max(15, Math.round(easyMins*.85))+" menit"; r.reason += " Cuaca panas: kurangi durasi dan utamakan rasa nyaman."; }
    if (rain) r.reason += " Hujan: pilih rute aman atau pindahkan sesi.";
    if (loadRatio != null && loadRatio >= 1.1) r.reason += " Durasi disesuaikan karena total menit 7 hari mendekati atau melampaui baseline 4 minggu.";
    if (rpeLoadRatio != null && rpeLoadRatio >= 1.3) r.reason += " Durasi mudah dipangkas 10% karena beban subjektif 7 hari meningkat "+Math.round(rpeLoadRatio*100)+"% dari rerata mingguan 3 minggu sebelumnya.";
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
    const first = activeTrainingStart(runs, now);
    const phase = phaseFor(now,input.raceDate,Number(input.raceDistance)||0,first);
    const recent = acts.filter(a=>a.timestamp>=now-7*DAY);
    const typicalDuration = typicalRunDuration(runs, now);
    const trainingWeek = Math.max(1, Math.floor((dateOnly(now)-dateOnly(first))/(7*DAY))+1);
    const recoveryCycle = Number(input.recoveryCycle)===2?2:3;
    const recoveryDue = trainingWeek % (recoveryCycle+1) === 0;
    const recoveryApplies = ["prep","base1","base2","base3","build"].includes(phase.name);
    const recoveryWeek = recoveryApplies && recoveryDue;
    const dayMap = new Map();
    recent.forEach(a=>{const k=dateOnly(a.timestamp),c=classify(a,Number(input.lthr)||0,typicalDuration),v=dayMap.get(k)||{stress:false,quality:false};v.stress=v.stress||c.stress;v.quality=v.quality||c.quality;dayMap.set(k,v);});
    return { phase, calendar:calendarFor(now,input.raceDate,Number(input.raceDistance)||0,first), weekly:phasePrescription(phase.name), recovery:{cycle:recoveryCycle+":1",week:trainingWeek,isRecoveryWeek:recoveryWeek,recoveryDue,applies:recoveryApplies}, strengthGuidance:strengthForPhase(phase.name), stressDays:[...dayMap.values()].filter(v=>v.stress).length, qualityDays:[...dayMap.values()].filter(v=>v.quality).length, aerobic:aerobicMetrics(acts) };
  }
  root.RunSenseFrielEngine = Object.freeze({ version:"1.6.1", recommend, inspect });
})(typeof window !== "undefined" ? window : this);
