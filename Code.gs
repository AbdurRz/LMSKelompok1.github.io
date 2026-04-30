// ═══════════════════════════════════════════════════════════════
// AKADEMI LMS — Code.gs (Revisi: Quiz Builder Support)
// ═══════════════════════════════════════════════════════════════

const SS_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

const SHEET = {
  USERS:'Users', MATERI:'Materi', TUGAS:'Tugas',
  JAWABAN:'Jawaban', NILAI:'Nilai', FORUM:'Forum',
  KUIS_BANK:'KuisBank',   // Bank kuis buatan guru (soal JSON)
  HASIL_KUIS:'HasilKuis', // Hasil kuis siswa
  ABSENSI:'Absensi',       // Daftar absensi (dibuat guru)
  ABSENSI_SISWA:'AbsensiSiswa', // Record absensi siswa
  ZOOM:'Zoom',             // Link zoom (dibuat guru)
};

const HEADERS = {
  Users      : ['username','password','role','nama'],
  Materi     : ['judul','mapel','deskripsi','link','pembuat','waktu'],
  Tugas      : ['judul','mapel','deskripsi','deadline','link','pembuat','waktu'],
  Jawaban    : ['nama','tugas','link','catatan','waktu'],
  Nilai      : ['nama','tugas','nilai','waktu'],
  Forum      : ['nama','pesan','waktu'],
  KuisBank   : ['judul','mapel','deskripsi','soalJSON','jumlahSoal','pembuat','waktu'],
  HasilKuis  : ['nama','namaKuis','mapel','benar','pgSoal','score','waktu'],
  Absensi    : ['id','judul','mapel','tgl','jam','status','pembuat','waktu'],
  AbsensiSiswa : ['absensiId','nama','status','waktu'],
  Zoom       : ['id','judul','mapel','linkZoom','status','pembuat','waktu'],
};

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SS_ID);
  let s    = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    if (HEADERS[name]) {
      s.appendRow(HEADERS[name]);
      s.getRange(1,1,1,HEADERS[name].length).setFontWeight('bold').setBackground('#1B2B4B').setFontColor('#FFFFFF');
      s.setFrozenRows(1);
    }
  }
  return s;
}

function sheetToObjects(name) {
  const s = getSheet(name);
  const v = s.getDataRange().getValues();
  if (v.length < 2) return [];
  const h = v[0].map(x => String(x).trim());
  return v.slice(1).filter(r => r.some(c => c !== '')).map(r => {
    const o = {};
    h.forEach((k,i) => { o[k] = r[i]!==undefined&&r[i]!==null ? String(r[i]).trim() : ''; });
    return o;
  });
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function now() { return new Date().toISOString(); }

// ══════════ doGet ══════════
function doGet(e) {
  const p = e.parameter || {};
  const a = (p.action||'').trim();
  try {
    switch(a) {
      case 'login': {
        const u = sheetToObjects(SHEET.USERS).find(u => u.username===p.username&&u.password===p.password);
        return u ? json({success:true,user:{username:u.username,role:u.role,nama:u.nama}})
                 : json({success:false,message:'Username atau password tidak ditemukan.'});
      }
      case 'register': {
        if(!p.username||!p.password||!p.role||!p.nama) 
          return json({success:false,message:'Semua field wajib diisi.'});
        const ex = sheetToObjects(SHEET.USERS).find(u => u.username===p.username);
        if(ex) return json({success:false,message:'Username sudah digunakan. Silakan pilih username lain.'});
        getSheet(SHEET.USERS).appendRow([p.username,p.password,p.role,p.nama]);
        return json({success:true,message:'Pendaftaran berhasil! Silakan masuk dengan akun Anda.'});
      }
      case 'getMateri':    return json({success:true,data:sheetToObjects(SHEET.MATERI)});
      case 'getTugas':     return json({success:true,data:sheetToObjects(SHEET.TUGAS)});
      case 'getJawaban': {
        let d=sheetToObjects(SHEET.JAWABAN); if(p.nama)d=d.filter(j=>j.nama===p.nama);
        return json({success:true,data:d});
      }
      case 'getNilai': {
        let d=sheetToObjects(SHEET.NILAI); if(p.nama)d=d.filter(n=>n.nama===p.nama);
        return json({success:true,data:d});
      }
      case 'getForum':     return json({success:true,data:sheetToObjects(SHEET.FORUM)});
      case 'getKuisBank':  return json({success:true,data:sheetToObjects(SHEET.KUIS_BANK)});
      case 'getHasilKuis': {
        let d=sheetToObjects(SHEET.HASIL_KUIS); if(p.nama)d=d.filter(h=>h.nama===p.nama);
        return json({success:true,data:d});
      }

      case 'getAbsensi':    return json({success:true,data:sheetToObjects(SHEET.ABSENSI)});
      case 'getAbsensiSiswa': {
        let d=sheetToObjects(SHEET.ABSENSI_SISWA); if(p.absensiId)d=d.filter(a=>a.absensiId===p.absensiId);
        return json({success:true,data:d});
      }
      case 'getZoom':       return json({success:true,data:sheetToObjects(SHEET.ZOOM)});

      case 'addAbsensi': {
        if(!p.judul) return json({success:false,message:'Judul absensi wajib diisi.'});
        const id = 'abs_'+Date.now();
        getSheet(SHEET.ABSENSI).appendRow([id,p.judul||'',p.mapel||'',p.tgl||'',p.jam||'','buka',p.pembuat||'',p.waktu||now()]);
        return json({success:true,message:'Absensi dibuat.',id});
      }
      case 'updateAbsensi': {
        if(!p.id) return json({success:false,message:'ID absensi wajib.'});
        const s=getSheet(SHEET.ABSENSI); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.id){
            if(p.judul!==undefined) s.getRange(i+1,2).setValue(p.judul);
            if(p.mapel!==undefined) s.getRange(i+1,3).setValue(p.mapel);
            if(p.tgl!==undefined) s.getRange(i+1,4).setValue(p.tgl);
            if(p.jam!==undefined) s.getRange(i+1,5).setValue(p.jam);
            if(p.status!==undefined) s.getRange(i+1,6).setValue(p.status);
            if(p.waktu!==undefined) s.getRange(i+1,8).setValue(p.waktu);
            return json({success:true,message:'Absensi diperbarui.'});
          }
        }
        return json({success:false,message:'Absensi tidak ditemukan.'});
      }
      case 'deleteAbsensi': {
        if(!p.id) return json({success:false,message:'ID absensi wajib.'});
        const s=getSheet(SHEET.ABSENSI); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.id){
            s.deleteRow(i+1);
            return json({success:true,message:'Absensi dihapus.'});
          }
        }
        return json({success:false,message:'Absensi tidak ditemukan.'});
      }

      case 'addAbsensiSiswa': {
        if(!p.absensiId||!p.nama) return json({success:false,message:'absensiId dan nama wajib.'});
        const s=getSheet(SHEET.ABSENSI_SISWA); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.absensiId&&String(v[i][1])===p.nama){
            s.getRange(i+1,3).setValue('hadir');
            s.getRange(i+1,4).setValue(p.waktu||now());
            return json({success:true,message:'Absensi diperbarui.'});
          }
        }
        getSheet(SHEET.ABSENSI_SISWA).appendRow([p.absensiId,p.nama,'hadir',p.waktu||now()]);
        return json({success:true,message:'Absensi berhasil dicatat.'});
      }

      case 'addZoom': {
        if(!p.judul||!p.linkZoom) return json({success:false,message:'Judul dan link zoom wajib diisi.'});
        const id = 'zoom_'+Date.now();
        getSheet(SHEET.ZOOM).appendRow([id,p.judul||'',p.mapel||'',p.linkZoom||'','buka',p.pembuat||'',p.waktu||now()]);
        return json({success:true,message:'Zoom ditambahkan.',id});
      }
      case 'updateZoom': {
        if(!p.id) return json({success:false,message:'ID zoom wajib.'});
        const s=getSheet(SHEET.ZOOM); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.id){
            if(p.judul!==undefined) s.getRange(i+1,2).setValue(p.judul);
            if(p.mapel!==undefined) s.getRange(i+1,3).setValue(p.mapel);
            if(p.linkZoom!==undefined) s.getRange(i+1,4).setValue(p.linkZoom);
            if(p.status!==undefined) s.getRange(i+1,5).setValue(p.status);
            if(p.waktu!==undefined) s.getRange(i+1,7).setValue(p.waktu);
            return json({success:true,message:'Zoom diperbarui.'});
          }
        }
        return json({success:false,message:'Zoom tidak ditemukan.'});
      }
      case 'deleteZoom': {
        if(!p.id) return json({success:false,message:'ID zoom wajib.'});
        const s=getSheet(SHEET.ZOOM); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.id){
            s.deleteRow(i+1);
            return json({success:true,message:'Zoom dihapus.'});
          }
        }
        return json({success:false,message:'Zoom tidak ditemukan.'});
      }

      case 'addMateri': {
        if(!p.judul) return json({success:false,message:'Judul wajib diisi.'});
        getSheet(SHEET.MATERI).appendRow([p.judul||'',p.mapel||'',p.deskripsi||'',p.link||'',p.pembuat||'',p.waktu||now()]);
        return json({success:true,message:'Materi ditambahkan.'});
      }
      case 'updateMateri': {
        if(!p.judul) return json({success:false,message:'Judul wajib diisi.'});
        const s=getSheet(SHEET.MATERI); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.oldJudul||i===parseInt(p.idx)){
            s.getRange(i+1,1).setValue(p.judul); s.getRange(i+1,2).setValue(p.mapel||''); s.getRange(i+1,3).setValue(p.deskripsi||''); s.getRange(i+1,4).setValue(p.link||''); s.getRange(i+1,6).setValue(p.waktu||now());
            return json({success:true,message:'Materi diperbarui.'});
          }
        }
        return json({success:false,message:'Materi tidak ditemukan.'});
      }
      case 'deleteMateri': {
        if(!p.judul) return json({success:false,message:'Judul wajib diisi.'});
        const s=getSheet(SHEET.MATERI); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.judul){
            s.deleteRow(i+1);
            return json({success:true,message:'Materi dihapus.'});
          }
        }
        return json({success:false,message:'Materi tidak ditemukan.'});
      }
      case 'addTugas': {
        if(!p.judul) return json({success:false,message:'Judul wajib diisi.'});
        getSheet(SHEET.TUGAS).appendRow([p.judul||'',p.mapel||'',p.deskripsi||'',p.deadline||'',p.link||'',p.pembuat||'',p.waktu||now()]);
        return json({success:true,message:'Tugas dibuat.'});
      }
      case 'updateTugas': {
        if(!p.judul) return json({success:false,message:'Judul wajib diisi.'});
        const s=getSheet(SHEET.TUGAS); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.oldJudul){
            s.getRange(i+1,1).setValue(p.judul); s.getRange(i+1,2).setValue(p.mapel||''); s.getRange(i+1,3).setValue(p.deskripsi||''); s.getRange(i+1,4).setValue(p.deadline||''); s.getRange(i+1,5).setValue(p.link||''); s.getRange(i+1,7).setValue(p.waktu||now());
            return json({success:true,message:'Tugas diperbarui.'});
          }
        }
        return json({success:false,message:'Tugas tidak ditemukan.'});
      }
      case 'deleteTugas': {
        if(!p.judul) return json({success:false,message:'Judul wajib diisi.'});
        const s=getSheet(SHEET.TUGAS); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.judul){
            s.deleteRow(i+1);
            return json({success:true,message:'Tugas dihapus.'});
          }
        }
        return json({success:false,message:'Tugas tidak ditemukan.'});
      }
      case 'addJawaban': {
        if(!p.nama||!p.tugas||!p.link) return json({success:false,message:'nama, tugas, link wajib diisi.'});
        const s=getSheet(SHEET.JAWABAN); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.nama&&String(v[i][1])===p.tugas){
            s.getRange(i+1,3).setValue(p.link||''); s.getRange(i+1,4).setValue(p.catatan||''); s.getRange(i+1,5).setValue(p.waktu||now());
            return json({success:true,message:'Jawaban diperbarui.'});
          }
        }
        s.appendRow([p.nama,p.tugas,p.link,p.catatan||'',p.waktu||now()]);
        return json({success:true,message:'Jawaban dikumpulkan.'});
      }
      case 'addNilai': {
        if(!p.nama||!p.tugas||p.nilai===undefined) return json({success:false,message:'nama, tugas, nilai wajib.'});
        const s=getSheet(SHEET.NILAI); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.nama&&String(v[i][1])===p.tugas){
            s.getRange(i+1,3).setValue(p.nilai); s.getRange(i+1,4).setValue(p.waktu||now());
            return json({success:true,message:'Nilai diperbarui.'});
          }
        }
        s.appendRow([p.nama,p.tugas,p.nilai,p.waktu||now()]);
        return json({success:true,message:'Nilai disimpan.'});
      }
      case 'addForum': {
        if(!p.nama||!p.pesan) return json({success:false,message:'nama dan pesan wajib.'});
        getSheet(SHEET.FORUM).appendRow([p.nama,p.pesan,p.waktu||now()]);
        return json({success:true,message:'Pesan terkirim.'});
      }
      case 'addKuisBank': {
        if(!p.judul) return json({success:false,message:'Judul kuis wajib diisi.'});
        getSheet(SHEET.KUIS_BANK).appendRow([p.judul||'',p.mapel||'',p.deskripsi||'',p.soalJSON||'[]',p.jumlahSoal||0,p.pembuat||'',p.waktu||now()]);
        return json({success:true,message:'Kuis disimpan.'});
      }
      case 'updateKuisBank': {
        if(!p.judul) return json({success:false,message:'Judul kuis wajib diisi.'});
        const s=getSheet(SHEET.KUIS_BANK); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.oldJudul){
            s.getRange(i+1,1).setValue(p.judul); s.getRange(i+1,2).setValue(p.mapel||''); s.getRange(i+1,3).setValue(p.deskripsi||''); s.getRange(i+1,4).setValue(p.soalJSON||'[]'); s.getRange(i+1,5).setValue(p.jumlahSoal||0); s.getRange(i+1,7).setValue(p.waktu||now());
            return json({success:true,message:'Kuis diperbarui.'});
          }
        }
        return json({success:false,message:'Kuis tidak ditemukan.'});
      }
      case 'deleteKuisBank': {
        if(!p.judul) return json({success:false,message:'Judul kuis wajib diisi.'});
        const s=getSheet(SHEET.KUIS_BANK); const v=s.getDataRange().getValues();
        for(let i=1;i<v.length;i++){
          if(String(v[i][0])===p.judul){
            s.deleteRow(i+1);
            return json({success:true,message:'Kuis dihapus.'});
          }
        }
        return json({success:false,message:'Kuis tidak ditemukan.'});
      }
      case 'addHasilKuis': {
        getSheet(SHEET.HASIL_KUIS).appendRow([p.nama||'',p.namaKuis||'',p.mapel||'',p.benar||0,p.pgSoal||0,p.score||0,p.waktu||now()]);
        return json({success:true,message:'Hasil kuis disimpan.'});
      }
      case 'addUser': {
        if(!p.username||!p.password||!p.role||!p.nama) return json({success:false,message:'Semua field wajib.'});
        const ex=sheetToObjects(SHEET.USERS);
        if(ex.some(u=>u.username===p.username)) return json({success:false,message:'Username sudah digunakan.'});
        getSheet(SHEET.USERS).appendRow([p.username,p.password,p.role,p.nama]);
        return json({success:true,message:'User ditambahkan.'});
      }
      default: return json({success:false,message:'Action tidak dikenali: '+a});
    }
  } catch(err) {
    Logger.log('Error: '+err.message);
    return json({success:false,message:'Server error: '+err.message});
  }
}

function doPost(e) { return doGet(e); }

// ══════════ SETUP ══════════
function setupSpreadsheet() {
  Object.values(SHEET).forEach(n => getSheet(n));
  const us = getSheet(SHEET.USERS);
  const ex = sheetToObjects(SHEET.USERS);
  [['admin','admin123','admin','Administrator'],['guru1','guru123','guru','Budi Santoso, S.Pd'],
   ['guru2','guru456','guru','Siti Rahayu, M.Pd'],['siswa1','siswa123','siswa','Andi Wijaya'],
   ['siswa2','siswa456','siswa','Dewi Putri'],['siswa3','siswa789','siswa','Rizky Pratama']
  ].forEach(r=>{ if(!ex.some(u=>u.username===r[0])) us.appendRow(r); });

  // Contoh materi
  const ms = getSheet(SHEET.MATERI); const em = sheetToObjects(SHEET.MATERI);
  [['Pengantar HTML & CSS','Komputer','Dasar HTML5 dan CSS3','https://www.w3schools.com/html/','Budi Santoso, S.Pd',now()],
   ['JavaScript Pemula','Komputer','Belajar dasar JavaScript','https://javascript.info/','Budi Santoso, S.Pd',now()],
   ['Aljabar Linear','Matematika','Persamaan aljabar','https://www.khanacademy.org/math/algebra','Siti Rahayu, M.Pd',now()]
  ].forEach(r=>{ if(!em.some(m=>m.judul===r[0])) ms.appendRow(r); });

  // Contoh kuis
  const ks = getSheet(SHEET.KUIS_BANK); const ek = sheetToObjects(SHEET.KUIS_BANK);
  const contohSoal = JSON.stringify([
    {type:'pg',teks:'Apa kepanjangan HTML?',opsi:['HyperText Markup Language','HighText Machine Language','HyperTool Markup Language','HyperText Machine Learning'],jawabanBenar:0,kunci:''},
    {type:'pg',teks:'Tag HTML untuk tautan adalah...',opsi:['<link>','<href>','<a>','<url>'],jawabanBenar:2,kunci:''},
    {type:'essay',teks:'Jelaskan perbedaan HTML dan CSS!',opsi:[],jawabanBenar:0,kunci:'HTML untuk struktur, CSS untuk tampilan/styling halaman web.'}
  ]);
  if(!ek.some(k=>k.judul==='Kuis HTML Dasar')) {
    ks.appendRow(['Kuis HTML Dasar','Komputer','Uji pemahaman dasar HTML',contohSoal,3,'Budi Santoso, S.Pd',now()]);
  }

  // Contoh absensi
  const as = getSheet(SHEET.ABSENSI); const eas = sheetToObjects(SHEET.ABSENSI);
  if(!eas.some(a=>a.judul==='Absensi Pembelajaran')) {
    const absId = 'abs_'+Date.now();
    as.appendRow([absId,'Absensi Pembelajaran','Komputer','2026-04-22','09:00','buka','Budi Santoso, S.Pd',now()]);
  }

  // Contoh zoom
  const zs = getSheet(SHEET.ZOOM); const ezs = sheetToObjects(SHEET.ZOOM);
  if(!ezs.some(z=>z.judul==='Pembelajaran Pagi')) {
    const zoomId = 'zoom_'+Date.now();
    zs.appendRow([zoomId,'Pembelajaran Pagi','Komputer','https://zoom.us/j/91234567890','buka','Budi Santoso, S.Pd',now()]);
  }

  try {
    SpreadsheetApp.getUi().alert('Setup Berhasil!\n\nSheet: Users, Materi, Tugas, Jawaban, Nilai, Forum, KuisBank, HasilKuis, Absensi, AbsensiSiswa, Zoom\n\nAkun demo: admin/admin123, guru1/guru123, siswa1/siswa123\n\nSelanjutnya: Deploy → New Deployment → Web App');
  } catch(e) { Logger.log('Setup selesai.'); }
}
