# RunSense — Product & UI/UX Redesign Brief

> **Status:** Panduan redesign menyeluruh — bukan panduan mengganti warna atau skin.  
> **Produk:** RunSense  
> **Repo:** `kamuiajasa-cell/runsense`  
> **Target utama:** aplikasi pendamping lari dan wellness yang membaca data dari jam/Intervals.icu, menganalisis latihan, lalu memberi arahan yang mudah dipahami.  
> **Prinsip utama:** *Running first, wellness aware, data-led, human-friendly.*

---

## 1. Ringkasan produk

RunSense bukan aplikasi untuk merekam lari dari ponsel. Aktivitas direkam oleh jam/perangkat yang terhubung, lalu disinkronkan ke RunSense melalui integrasi yang tersedia (saat ini Intervals.icu dan mode perangkat/native jika tersedia).

RunSense harus menjadi tempat pengguna untuk:
1. Memahami kondisi dan kesiapan hari ini.
2. Mengetahui latihan yang disarankan dan alasannya.
3. Meninjau aktivitas yang sudah dilakukan.
4. Memahami tren kebugaran, beban, intensitas, dan konsistensi.
5. Mengatur profil atlet, target, rencana, zona, serta koneksi perangkat.

**Bukan tujuan redesign:** menambah fitur sosial, GPS recording, marketplace, katalog latihan generik, atau fitur kesehatan yang datanya belum tersedia. Jangan membuat angka kesehatan palsu hanya untuk memenuhi layout.

## 2. Riset referensi visual

Referensi Dribbble berikut dipakai sebagai inspirasi pola komposisi dan hierarki, bukan untuk disalin mentah-mentah:

- [Running App — UI Design Exploration](https://dribbble.com/shots/26296854-Running-App-UI-Design-Exploration) — dashboard mingguan, statistik lari yang mudah dipindai, detail aktivitas, dan konsistensi light/dark.
- [Running Tracker App UI](https://dribbble.com/shots/16904080-Running-Tracker-App-UI) — onboarding yang ringkas dan dashboard aktivitas yang memprioritaskan jarak, pace, serta durasi.
- [Fitness Tracking App UI — Running & Activity Dashboard](https://dribbble.com/shots/27756266-Fitness-Tracking-App-UI-Running-Activity-Dashboard) — ringkasan aktivitas, insight, dan cara menyederhanakan data kompleks.
- [Fitness Tracker App — Running & Activity Dashboard](https://dribbble.com/shots/27149998-Fitness-Tracker-App-Running-Activity-Dashboard-Mobile-UI) — activity score, recovery, dan statistik performa dalam satu sistem visual.
- [Fitness Mobile App UI Design — Profile & Support Flow](https://dribbble.com/shots/26855097-Fitness-Mobile-App-UI-Design-Profile-Support-Flow) — pengelompokan profil dan pengaturan agar tidak menjadi satu formulir panjang.

### Sintesis arah desain

Ambil:
- Hierarki yang kuat: satu pesan utama per layar, angka penting besar, detail sekunder lebih tenang.
- Dashboard modular/editorial: ringkasan, insight, dan kartu yang punya fungsi jelas; bukan tumpukan kartu dengan bobot sama.
- Visualisasi data yang bersih dan punya konteks: periode, satuan, pembanding, dan penjelasan.
- Nuansa sport-tech yang matang: tegas dan energik, tetapi tidak terasa seperti game atau dashboard trading.
- Navigasi bawah yang konsisten dan mudah dijangkau ibu jari.
- Light dan dark mode harus sama-sama dirancang, bukan sekadar membalik warna.

Hindari:
- Menyalin layout, ilustrasi, ikon, atau aset karya desainer.
- Neon/glow berlebihan, glassmorphism pada semua kartu, gradient dekoratif, dan angka besar tanpa konteks.
- Dashboard penuh widget yang semuanya meminta perhatian.
- Menggunakan foto/ilustrasi stok sebagai pengganti informasi.
- Membuat halaman profil sebagai satu scroll form tanpa pengelompokan.

## 3. Pengguna dan karakter pengalaman

Pengguna utama adalah pelari rekreasional hingga serius yang ingin latihan konsisten dan memahami kondisi tubuh. Sebagian pengguna juga membutuhkan pandangan wellness, tetapi identitas produk tetap running-oriented.

Karakter produk:
- **Tenang:** tidak menghakimi ketika pengguna tidak latihan.
- **Cerdas:** memberi alasan di balik rekomendasi.
- **Praktis:** pengguna bisa memahami layar utama dalam beberapa detik.
- **Jujur:** tampilkan sumber, waktu sinkron, dan kualitas data; jangan mengarang metrik.
- **Adaptif:** rekomendasi mempertimbangkan beban, riwayat, rencana, dan sinyal kondisi yang memang tersedia.

Nada bahasa: Indonesia natural, ringkas, tidak terlalu teknis. Istilah teknis seperti CTL, ATL, TSB, LTHR, LTPace boleh dipakai, tetapi harus diberi penjelasan singkat saat pertama muncul.

## 4. Arsitektur informasi baru

Pertahankan empat tab navigasi utama, tetapi ubah isi dan urutan kontennya secara menyeluruh:

| Tab | Peran | Pertanyaan yang dijawab |
|---|---|---|
| **Hari Ini** | Pusat keputusan harian | Bagaimana kondisiku dan apa yang sebaiknya kulakukan hari ini? |
| **Riwayat** | Arsip aktivitas | Apa yang sudah kulakukan? |
| **Analisis** | Memahami tren dan adaptasi | Apakah latihan berkembang dengan aman dan konsisten? |
| **Profil** | Mengelola atlet dan sistem | Siapa aku, apa targetku, dan bagaimana RunSense dikonfigurasi? |

Nama internal screen boleh tetap `home`, `history`, `progress`, dan `me` agar integrasi kode tidak rusak. Label yang dilihat pengguna menggunakan bahasa Indonesia.

### Navigasi global

- Bottom navigation tetap empat item: Hari Ini, Riwayat, Analisis, Profil.
- Ikon konsisten, ukuran sentuh minimal 44–48 px, label selalu terbaca.
- Tab aktif punya penanda yang jelas; jangan hanya mengandalkan perubahan warna.
- Jangan menambahkan tab kelima untuk pengaturan. Pengaturan masuk ke Profil.
- Status sinkronisasi global dapat diakses dari header atau Profil, tetapi tidak boleh mendominasi semua halaman.
- Setiap tab mempertahankan posisi/keadaan filter ketika pengguna berpindah tab, bila memungkinkan.

---

## 5. Spesifikasi struktur setiap tab

## A. Tab Hari Ini — pusat keputusan

**Tujuan:** menjawab kondisi, rekomendasi, dan langkah berikutnya. Ini adalah layar paling penting dan harus paling matang.

Urutan konten dari atas ke bawah:

1. **Header personal**
   - Sapaan berdasarkan waktu.
   - Tanggal lengkap.
   - Nama/identitas singkat atlet jika tersedia.
   - Tombol status sinkronisasi kecil dengan indikator terakhir diperbarui.
   - Jangan memakai hero besar yang menghabiskan setengah layar.

2. **Kartu kesiapan hari ini**
   - Skor kesiapan atau status kesiapan sebagai fokus utama, hanya jika data cukup.
   - Status verbal: misalnya Siap, Perlu dijaga, atau Prioritaskan pemulihan.
   - Satu kalimat interpretasi yang menjelaskan kondisi.
   - Tampilkan tingkat keyakinan/kualitas data bila relevan.
   - Jangan menjadikan skor sebagai diagnosis medis.

3. **Rekomendasi latihan utama**
   - Jenis sesi dan durasi/jarak.
   - Target intensitas (HR/pace/zona) bila tersedia.
   - Struktur pemanasan, inti, pendinginan, dan jeda jika ada.
   - Alasan rekomendasi: beban terkini, rencana mingguan, sinyal kaki, atau kondisi lain yang relevan.
   - CTA utama: **Lihat detail latihan**.
   - CTA sekunder: **Kirim ke jam / Intervals.icu**, hanya jika integrasi tersedia.
   - Untuk hari istirahat, tampilkan rekomendasi pemulihan yang nyata, bukan kartu kosong.

4. **Sinyal tubuh**
   - Kondisi kaki: Baik / Waspada / Sakit.
   - Kondisi panas/cuaca hanya jika sumber datanya tersedia atau input pengguna.
   - Kontrol input harus ringkas, mudah disentuh, dan menjelaskan dampaknya terhadap rekomendasi.
   - Jangan menaruh kontrol ini sebagai baris kecil yang tenggelam di antara kartu.

5. **Ringkasan minggu berjalan**
   - Jarak minggu ini, jumlah sesi, dan target/rencana.
   - Visual 7 hari yang menunjukkan hari latihan/istirahat.
   - Bedakan data aktual dan rencana.
   - Tampilkan tren sederhana, bukan banyak angka sekaligus.

6. **Aktivitas terakhir**
   - Maksimal 1–2 aktivitas terbaru dengan jarak, durasi, pace, HR.
   - Tautan menuju Riwayat untuk melihat semua aktivitas.

7. **Status data**
   - Terakhir sinkron, sumber data, dan status koneksi.
   - Jika data usang/gagal, tampilkan pesan tindakan yang jelas.
   - Jangan membuat pengguna menebak mengapa data kosong.

**Yang harus dihindari:** menaruh semua metrik CTL/ATL/TSB, prediksi lomba, zona, grafik, dan log aktivitas sekaligus di halaman utama. Detail teknis pindah ke Analisis atau Profil.

## B. Tab Riwayat — arsip aktivitas yang mudah dijelajahi

**Tujuan:** menemukan sesi tertentu dan membaca ringkasan aktivitas.

Struktur baru:

1. **Header ringkas**
   - Judul “Riwayat aktivitas”.
   - Deskripsi satu baris, tanpa headline dekoratif yang terlalu besar.

2. **Kontrol periode**
   - Minggu ini, Bulan ini, Semua.
   - Filter jenis aktivitas bila datanya mendukung.
   - Kontrol pencarian/tanggal hanya jika dapat diimplementasikan dengan baik.

3. **Ringkasan periode**
   - Total jarak.
   - Jumlah sesi.
   - Total durasi.
   - Total beban latihan (TL) jika tersedia.
   - Beri label periode dengan jelas.

4. **Daftar aktivitas dikelompokkan berdasarkan tanggal/minggu**
   - Tanggal dan nama sesi.
   - Jarak dan durasi sebagai informasi utama.
   - Pace dan HR sebagai informasi sekunder.
   - Beban latihan sebagai badge sekunder, bukan elemen dominan.
   - Penanda jenis sesi: santai, jarak jauh, ambang, VO2maks, lomba.
   - Setiap kartu punya affordance jelas bahwa kartu dapat dibuka.

5. **Detail aktivitas (modal atau halaman detail)**
   - Header: tanggal, jenis, nama aktivitas.
   - Ringkasan: jarak, waktu, pace rata-rata, HR rata-rata, kalori/elevasi hanya bila tersedia.
   - Grafik pace dan HR dengan skala dan satuan yang jelas.
   - Distribusi zona bila datanya tersedia.
   - Beban dan interpretasi singkat.
   - Catatan/analisis aktivitas jika tersedia.
   - Sumber data dan waktu sinkron.
   - Hindari grafik mini yang tidak terbaca atau metrik tanpa data.

6. **Keadaan kosong**
   - Ilustrasi sederhana atau ikon, bukan ruang kosong.
   - Jelaskan bahwa aktivitas berasal dari jam/Intervals.icu.
   - CTA sinkronisasi yang jelas.

**Catatan:** jangan membuat fitur rekam lari/GPS di ponsel. Riwayat adalah hasil sinkronisasi aktivitas dari perangkat/sumber terhubung.

## C. Tab Analisis — pusat pemahaman performa

**Tujuan:** mengubah data historis menjadi pemahaman yang dapat ditindaklanjuti.

Jangan menampilkan semua grafik dalam satu dinding panjang. Susun menjadi ringkasan utama dan kelompok analisis yang bisa dipindai.

### Bagian 1 — Ikhtisar

- Pemilih periode: 8 minggu, 6 bulan, 1 tahun.
- Insight utama: satu kesimpulan paling penting dari periode tersebut.
- Volume: total km, jumlah sesi, rata-rata mingguan.
- Konsistensi: minggu aktif dan pola frekuensi.
- Pace dan HR rata-rata hanya dengan pembanding yang sepadan.
- Rekor pribadi jika data valid.

### Bagian 2 — Beban & pemulihan

- CTL, ATL, TSB dengan definisi singkat dan rentang tanggal.
- Grafik beban jangka panjang dan pendek.
- Perubahan beban mingguan dan tanda kenaikan mendadak.
- Jelaskan bahwa angka beban adalah estimasi model, bukan pengukuran langsung kondisi jaringan tubuh.
- Tampilkan rekomendasi pemulihan yang terkait dengan tren, bukan sekadar warna merah/hijau.

### Bagian 3 — Intensitas latihan

- Proporsi jarak/waktu santai, kualitas, dan jarak jauh jika klasifikasi tersedia.
- Tren distribusi intensitas.
- Peringatan jika sesi keras terlalu rapat atau proporsi intensitas berubah drastis.
- Jelaskan metode klasifikasi dan keterbatasannya.

### Bagian 4 — Performa lari

- Tren pace dan HR dengan konteks durasi/jarak.
- Estimasi performa 5K, 10K, HM, maraton jika cukup data.
- LTHR dan LTPace bila tersedia.
- Personal best: 1K, 3K, 5K, 10K, HM, FM hanya jika ada data yang sahih.
- Jangan membandingkan pace lintasan/tanjakan/cuaca berbeda seolah setara.

### Bagian 5 — Adaptasi & konsistensi

- Volume mingguan.
- Frekuensi latihan.
- Tren lari jarak jauh.
- Pola latihan dan jeda.
- Insight berbasis data dengan bahasa sederhana.

Gunakan navigasi sekunder berbentuk segmented tabs atau daftar bagian di dalam Analisis bila panjang halaman terlalu besar. Jangan menambah item bottom navigation.

**Prinsip grafik:** satu grafik menjawab satu pertanyaan. Tampilkan judul, rentang tanggal, satuan, legenda, dan nilai penting. Tooltip/interaksi harus bekerja pada layar sentuh. Grafik tidak boleh hanya mengandalkan warna.

## D. Tab Profil — pusat pengaturan atlet, bukan formulir panjang

**Masalah yang harus diselesaikan:** tab Profil saat ini menumpuk data tubuh, target, gaya coaching, rencana mingguan, tanggal lomba, run-walk, integrasi, tema, penjelasan coach, mode lanjutan, tes Cooper, dan reset data dalam satu halaman panjang. Struktur ini harus dipecah menjadi kelompok yang jelas.

### Halaman utama Profil

Header:
- Avatar/inisial.
- Nama atlet jika tersedia.
- Ringkasan singkat: target aktif dan status koneksi.
- Tombol edit profil.

Di bawah header, tampilkan daftar menu berbentuk section list dengan judul, deskripsi singkat, nilai ringkasan, dan chevron. Setiap menu membuka subhalaman atau panel terpisah.

### 1. Data atlet

Tempatkan:
- Usia.
- Tinggi dan berat badan jika fitur/data tersebut memang didukung.
- Detak jantung istirahat (jelaskan periode sumber data).
- Detak jantung maksimal.
- Parameter lain yang benar-benar dipakai mesin perhitungan.

Aturan:
- Pisahkan nilai otomatis dari nilai yang diisi manual.
- Beri label “Dari data” atau “Diatur manual”.
- Jangan menganggap nilai kosong sebagai nol.
- Validasi input dan tampilkan satuan.

### 2. Ambang & zona latihan

Tempatkan:
- LTHR.
- LTPace.
- Zona HR dan pace yang dipakai.
- Sumber nilai: otomatis atau kustom.
- Tombol pulihkan nilai otomatis.
- Penjelasan singkat dampak perubahan nilai.

Jangan mencampur pengaturan ambang dengan data profil umum.

### 3. Sasaran latihan

Tempatkan:
- Target utama: 5K, 10K, separuh maraton, maraton, umum.
- Estimasi performa saat ini.
- Target waktu (opsional).
- Tanggal lomba (opsional).
- Tingkat keyakinan estimasi.

Target dan estimasi harus ditampilkan dalam konteks, bukan sekadar tiga baris angka.

### 4. Rencana mingguan

Tempatkan:
- Jadwal Senin–Minggu.
- Jenis sesi per hari.
- Jarak/durasi.
- Mode otomatis atau manual.
- Peringatan konflik jadwal (misalnya sesi kualitas berdekatan dengan jarak jauh).
- Ringkasan total volume mingguan.
- Tombol simpan/perbarui.

Rencana mingguan harus menjadi editor jadwal visual, bukan grid input yang tidak memiliki hierarki.

### 5. Preferensi pendampingan

Tempatkan:
- Konservatif, moderat, agresif.
- Penjelasan konsekuensi tiap pilihan.
- Pola lari-jalan aktif/nonaktif.
- Durasi lari dan jalan.
- Preferensi notifikasi hanya bila sudah didukung.

Jangan menyebut agresif sebagai pilihan terbaik; beri penjelasan risiko dan kapan cocok digunakan.

### 6. Perangkat & sinkronisasi

Tempatkan:
- Intervals.icu: status koneksi, akun/athlete ID yang aman untuk ditampilkan, waktu sinkron terakhir.
- Jam/perangkat: status koneksi dan jalur data yang benar-benar tersedia.
- Tombol sinkronisasi.
- Hasil sinkronisasi terakhir dan pesan kesalahan yang bisa dipahami.
- Kelola API key: input tersembunyi, ubah/ganti, hapus, dan keterangan penyimpanan lokal.
- Jangan pernah menampilkan API key dalam teks biasa.

### 7. Tampilan & aksesibilitas

Tempatkan:
- Tema gelap/terang/sistem jika dukungan sistem tersedia.
- Ukuran teks bila dapat didukung.
- Pengaturan gerak/animasi bila dapat didukung.
- Preferensi tampilan grafik hanya bila benar-benar ada.

### 8. Laboratorium / mode lanjutan

Pindahkan dari alur utama dan beri label “Lanjutan”:
- Max METs.
- Kategori dan tahap.
- CTL/ATL/TSB mentah.
- Insight estimator.
- Tes Cooper dan hasil perhitungan.
- Referensi intensitas.
- Backtest estimator.

Fitur ini tidak boleh mengganggu pengguna umum. Beri peringatan bahwa hasil estimasi bergantung pada kualitas dan jumlah data.

### 9. Data & privasi

Tempatkan:
- Sumber data yang tersambung.
- Penjelasan data yang disimpan di perangkat.
- Ekspor data bila sudah tersedia.
- Reset data lokal.
- Keluar/logout.
- Reset harus dipisahkan dari tombol biasa, memerlukan konfirmasi yang menjelaskan konsekuensinya, dan tidak boleh mudah tertekan tanpa sengaja.

**Hasil akhir tab Profil:** layar utama profil singkat + subhalaman kategori. Bukan satu halaman scroll yang memuat seluruh pengaturan.

---

## 6. Onboarding dan koneksi pertama

Ubah setup menjadi alur bertahap yang ringkas:

1. **Perkenalan:** jelaskan RunSense membaca aktivitas dari jam/sumber yang terhubung; bukan merekam lari dari ponsel.
2. **Hubungkan sumber data:** Intervals.icu atau mode jam/native jika tersedia.
3. **Pilih sasaran:** target lari utama.
4. **Pilih gaya pendampingan:** konservatif, moderat, atau agresif dengan penjelasan singkat.
5. **Konfirmasi profil:** tampilkan data yang berhasil dibaca dan data yang perlu diisi manual.
6. **Selesai:** masuk ke Hari Ini.

Aturan onboarding:
- Demo harus diberi label DEMO secara konsisten dan tidak tercampur dengan data asli.
- Pengguna boleh melewati data opsional.
- Tampilkan progres langkah.
- Jika koneksi gagal, tampilkan penyebab dan tindakan pemulihan.
- Jangan meminta data yang sebenarnya dapat diperoleh dari sumber terhubung.
- Jangan menghapus konfigurasi lama saat redesign.

## 7. Sistem visual dan komponen

Warna bukan pekerjaan utama, tetapi sistem visual tetap harus ditetapkan agar struktur konsisten.

### Arah visual

- Sport-tech editorial: tegas, presisi, modern, dan tenang.
- Dasar netral dengan satu warna aksen utama; warna status hanya untuk status.
- Kontras tinggi untuk angka performa.
- Hindari terlalu banyak panel berbingkai dan radius besar yang seragam.
- Gunakan ruang kosong untuk memisahkan kelompok informasi.
- Gunakan tipografi numerik tabular untuk pace, waktu, HR, jarak, dan beban.
- Light/dark mode memiliki kontras dan elevasi yang diuji secara terpisah.

### Komponen wajib

- App header.
- Bottom navigation.
- Ringkasan metrik.
- Kartu rekomendasi latihan.
- Kartu insight.
- Status kesiapan.
- Status sinkronisasi.
- Activity list item.
- Grafik dengan tooltip.
- Pemilih periode.
- Form field dengan label, satuan, helper text, error state.
- Menu profil/subhalaman.
- Empty state.
- Loading/skeleton state.
- Error/retry state.
- Modal konfirmasi.
- Badge status dengan label teks, bukan warna saja.

### Aturan tata letak

- Desain mobile-first untuk lebar 360–430 px.
- Konten tidak boleh overflow horizontal.
- Area sentuh minimum 44 px.
- Jarak antarbagian konsisten.
- Satu kartu hanya punya satu fungsi utama.
- Jangan membuat semua konten menjadi kartu; gunakan section heading, divider, dan list bila lebih tepat.
- Header halaman tidak boleh terlalu tinggi.
- Hindari judul dekoratif besar yang mendorong data penting jauh ke bawah.
- Safe area Android/iOS harus diperhitungkan.

## 8. Bahasa dan microcopy

Seluruh antarmuka menggunakan bahasa Indonesia natural.

Contoh istilah:
- Home → Hari Ini
- History → Riwayat
- Progress → Analisis
- Profile → Profil
- Easy → Santai
- Long → Jarak jauh
- Threshold → Ambang
- Recovery → Pemulihan
- Quality → Kualitas
- Rest → Istirahat
- Sync → Sinkronisasi
- Workout → Sesi latihan
- Readiness → Kesiapan

Istilah teknis boleh ditampilkan dalam tanda kurung saat diperlukan: “Ambang laktat (LTHR)”. Jangan menerjemahkan nama brand atau nama produk eksternal.

Microcopy harus menjelaskan:
- Apa arti data.
- Mengapa rekomendasi diberikan.
- Apa yang perlu dilakukan pengguna.
- Apakah data berasal dari jam, Intervals.icu, input manual, atau estimasi.

## 9. Aturan data, integrasi, dan kompatibilitas

Ini adalah redesign antarmuka, bukan alasan untuk merusak mesin aplikasi.

**Wajib dipertahankan:**
- Integrasi Intervals.icu dan mekanisme autentikasi yang ada.
- Mode perangkat/native yang sudah tersedia.
- Penyimpanan lokal dan konfigurasi pengguna.
- Sinkronisasi aktivitas, wellness, dan data latihan yang sudah diimplementasikan.
- Mesin rekomendasi latihan, perhitungan beban, estimasi performa, dan analisis.
- Modal detail aktivitas, pengiriman workout, serta fitur yang sudah berjalan.
- ID DOM, fungsi global, dan event handler yang masih menjadi kontrak antarbagian, kecuali sengaja dimigrasikan dengan pengujian lengkap.

**Larangan:**
- Jangan mengganti nama properti data/API hanya demi istilah UI.
- Jangan mengubah rumus readiness, CTL/ATL/TSB, Max METs, klasifikasi sesi, atau estimasi pace sebagai bagian dari redesign visual.
- Jangan membuat data contoh muncul sebagai data nyata.
- Jangan membuat fitur perekaman aktivitas GPS di ponsel.
- Jangan memutus jalur sinkronisasi jam.
- Jangan menghapus fitur lama sebelum ada pemetaan pengganti dan persetujuan.
- Jangan menampilkan metrik ketika sumber data kosong/tidak valid.
- Jangan mengubah struktur penyimpanan lokal tanpa migrasi yang kompatibel.

Gunakan adapter/pemetaan label untuk mengubah istilah internal menjadi bahasa Indonesia. Nilai internal seperti `easy`, `long`, `thr`, `vo2`, `race`, `rest`, dan `auto` harus tetap stabil bila dipakai oleh logika.

## 10. Keadaan layar yang wajib didesain

Setiap tab dan subhalaman harus punya:
- Normal dengan data.
- Memuat/sinkronisasi.
- Kosong (belum ada data).
- Error/gagal sinkron.
- Data sebagian.
- Data usang.
- Pengguna demo.
- Layar kecil.
- Light mode dan dark mode.

Tidak boleh ada area kosong tanpa penjelasan. Jangan menampilkan nilai “0” jika sebenarnya datanya belum tersedia; gunakan “Belum ada data” atau “—” sesuai konteks.

## 11. Prioritas implementasi

### P0 — struktur produk dan navigasi
- Bangun ulang hierarki empat tab.
- Rapikan halaman Hari Ini sebagai pusat keputusan.
- Pecah Profil menjadi halaman utama dan subhalaman kategori.
- Susun ulang Riwayat dan detail aktivitas.
- Susun ulang Analisis menjadi kelompok insight yang jelas.
- Tetapkan semua state kosong/loading/error.

### P1 — komponen dan visualisasi
- Bangun komponen bersama.
- Bangun ulang grafik dan kartu statistik.
- Perbaiki interaksi filter, tombol, dan form.
- Terapkan sistem visual light/dark.
- Pastikan responsive dan aksesibilitas.

### P2 — penyempurnaan pengalaman
- Micro-interaction yang halus.
- Transisi tab yang tidak mengganggu.
- Animasi grafik seperlunya.
- Detail visual dan ilustrasi kecil bila memberi nilai informasi.

Urutan pengerjaan tidak boleh dimulai dari mengganti warna. Mulai dari arsitektur informasi, wireframe, komposisi, dan alur interaksi.

## 12. Kriteria penerimaan redesign

Redesign dianggap selesai hanya jika:

1. Keempat tab punya struktur baru yang jelas, bukan sekadar judul dan warna baru.
2. Profil sudah dipecah menjadi kategori/subhalaman seperti Data Atlet, Ambang & Zona, Sasaran, Rencana Mingguan, Preferensi, Perangkat, Tampilan, Lanjutan, dan Data & Privasi.
3. Hari Ini memprioritaskan kesiapan dan rekomendasi latihan, bukan menumpuk semua metrik.
4. Riwayat punya alur dari daftar ke detail aktivitas yang mudah dipahami.
5. Analisis punya hierarki dan pengelompokan, bukan dinding grafik.
6. Pengguna dapat memahami status data dan sumbernya.
7. Semua fitur lama yang masih relevan tetap bekerja.
8. Tidak ada ID duplikat, tombol mati, navigasi yang tidak berfungsi, atau elemen yang terpotong.
9. Tidak ada overflow horizontal pada lebar 360, 390, dan 430 px.
10. Light dan dark mode sama-sama terbaca.
11. Label UI berbahasa Indonesia; istilah teknis dijelaskan.
12. Tidak ada perubahan diam-diam pada rumus, integrasi, atau penyimpanan.

## 13. Cara kerja untuk implementasi

Sebelum mengubah kode:
1. Petakan semua fungsi, ID DOM, event handler, dan data yang dipakai tiap tab.
2. Buat wireframe teks untuk seluruh halaman dan subhalaman.
3. Petakan komponen lama ke komponen baru agar tidak ada fitur yang hilang.
4. Pisahkan perubahan struktur UI dari perubahan logika.
5. Implementasikan per bagian dengan satu sistem komponen konsisten.
6. Uji setiap navigasi, tombol, filter, form, modal, sinkronisasi, dan state.
7. Bandingkan data sebelum/sesudah untuk memastikan mesin perhitungan tidak berubah.
8. Uji pada Android ukuran kecil dan normal, termasuk safe area.

**Definisi selesai:** RunSense terasa seperti aplikasi baru dari segi struktur, alur, dan cara informasi disajikan, tetapi tetap aplikasi yang sama dari sisi data, perhitungan, integrasi, dan kemampuan yang telah ada.

---

## 14. Ringkasan arahan untuk desainer/developer

Bangun ulang RunSense sebagai **running performance & wellness companion**. Pertahankan empat tab utama, tetapi rancang ulang seluruh arsitektur isi:

- **Hari Ini:** kesiapan → rekomendasi → alasan → sinyal tubuh → minggu berjalan → aktivitas terbaru.
- **Riwayat:** periode → ringkasan → daftar sesi → detail aktivitas.
- **Analisis:** ikhtisar → beban/pemulihan → intensitas → performa → konsistensi.
- **Profil:** profil utama → Data Atlet / Ambang & Zona / Sasaran / Rencana Mingguan / Preferensi / Perangkat & Sinkronisasi / Tampilan / Lanjutan / Data & Privasi.

Jangan mulai dengan CSS. Mulai dengan struktur, wireframe, urutan konten, navigasi, dan interaksi. Warna dan tema adalah lapisan terakhir.
