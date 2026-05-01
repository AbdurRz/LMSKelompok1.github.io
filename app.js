/* ═══════════════════════════════════════════════════════════════
   AKADEMI LMS — app.js (Revisi Lengkap)
   • Materi & Tugas: file upload (drag-drop) + link tab
   • Kuis Guru: builder — PG, Essay, atau keduanya; atur jawaban benar
   • Kuis Siswa: grid kartu kuis → pilih → kerjakan
═══════════════════════════════════════════════════════════════ */
'use strict';

// ─── CONFIG ──────────────────────────────────────────────────
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwOZnmhQRhJ06qvVhuqd9MmIacLBNYZeBUPq0u1igzFv-DRC3mwHEWgiiS0NBjL29R0Gg/exec',
};

// ─── STATE ───────────────────────────────────────────────────
const State = {
  user:      null,
  materi:    [],
  tugas:     [],
  jawaban:   [],
  nilai:     [],
  forum:     [],
  kuis:      [],          // array of kuis objects (dibuat guru)
  hasilKuis: [],          // array of hasil kuis siswa
  absensi:   [],          // array of absensi (dibuat guru)
  absensiSiswa: [],       // array of absensi siswa
  zoom:      [],          // array of zoom links (dibuat guru)
};

// ─── TOAST ───────────────────────────────────────────────────
const Toast = {
  show(type, title, msg = '', dur = 3500) {
    const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info', warning:'fa-triangle-exclamation' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="toast-icon"><i class="fa-solid ${icons[type]||icons.info}"></i></div>
      <div class="toast-body"><div class="toast-title">${title}</div>${msg?`<div class="toast-msg">${msg}</div>`:''}</div>`;
    document.getElementById('toast-root').appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(20px)'; el.style.transition='all .3s'; setTimeout(()=>el.remove(),300); }, dur);
  },
  success(t,m){ this.show('success',t,m); },
  error(t,m)  { this.show('error',t,m); },
  info(t,m)   { this.show('info',t,m); },
  warning(t,m){ this.show('warning',t,m); },
};

// ─── MODAL ───────────────────────────────────────────────────
const Modal = {
  open(id)  { document.getElementById(id).classList.remove('hidden'); },
  close(id) { document.getElementById(id).classList.add('hidden'); },
};

// ─── LOADER ──────────────────────────────────────────────────
const Loader = {
  show() { document.getElementById('page-loader').classList.remove('fade-out'); },
  hide() { setTimeout(()=>document.getElementById('page-loader').classList.add('fade-out'), 200); },
};

// ─── API ─────────────────────────────────────────────────────
const API = {
  async call(params) {
    const url = new URL(CONFIG.API_URL);
    Object.entries(params).forEach(([k,v]) => { if(v!=null) url.searchParams.set(k,String(v)); });
    try {
      const text = await (await fetch(url.toString())).text();
      try { return JSON.parse(text); } catch { return {success:true}; }
    } catch(e) { return {success:false, error:e.message}; }
  },
  async get(action,extra={})  { return this.call({action,...extra}); },
  async post(action,data={})  { return this.call({action,...data}); },
};

// ─── MOCK ────────────────────────────────────────────────────
const Mock = {
  users: [
    {username:'admin', password:'admin123', role:'admin', nama:'Administrator'},
    {username:'guru1', password:'guru123',  role:'guru',  nama:'Budi Santoso, S.Pd'},
    {username:'guru2', password:'guru456',  role:'guru',  nama:'Siti Rahayu, M.Pd'},
    {username:'siswa1',password:'siswa123', role:'siswa', nama:'Andi Wijaya'},
    {username:'siswa2',password:'siswa456', role:'siswa', nama:'Dewi Putri'},
    {username:'siswa3',password:'siswa789', role:'siswa', nama:'Rizky Pratama'},
  ],
  login(u,p) {
    const x = this.users.find(m=>m.username===u&&m.password===p);
    return x ? {success:true,user:{username:x.username,role:x.role,nama:x.nama}} : {success:false,message:'Username atau password tidak ditemukan.'};
  },
  getData(action) {
    const map = {getMateri:State.materi,getTugas:State.tugas,getJawaban:State.jawaban,
      getNilai:State.nilai,getForum:State.forum,getKuisBank:State.kuis,getHasilKuis:State.hasilKuis,
      getAbsensi:State.absensi,getAbsensiSiswa:State.absensiSiswa,getZoom:State.zoom};
    return {success:true, data:map[action]||[]};
  },
};

// ─── SMART API ───────────────────────────────────────────────
const SmartAPI = {
  ok() { return CONFIG.API_URL && CONFIG.API_URL!=='GANTI_DENGAN_URL_WEB_APP_ANDA'; },
  async login(u,p) {
    if(!this.ok()) return Mock.login(u,p);
    const r = await API.get('login',{username:u,password:p});
    return (r&&r.success!==undefined) ? r : Mock.login(u,p);
  },
  async register(u,p,role,nama) {
    // Jika backend tidak dikonfigurasi, gunakan mock
    if(!this.ok()) return this._mockRegister(u,p,role,nama);
    
    try {
      // Coba call backend
      const r = await API.post('register',{username:u,password:p,role,nama});
      
      // Jika response berhasil, return
      if(r&&r.success!==undefined) return r;
      
      // Jika backend error atau action tidak dikenali, fallback ke mock
      if(r&&(r.success===false||r.message?.includes('tidak dikenali'))) {
        console.warn('Backend register action tidak dikenali, menggunakan mock.');
        return this._mockRegister(u,p,role,nama);
      }
    } catch(e) {
      console.warn('Backend register gagal, menggunakan mock:', e.message);
      return this._mockRegister(u,p,role,nama);
    }
    
    // Default fallback ke mock
    return this._mockRegister(u,p,role,nama);
  },
  _mockRegister(u,p,role,nama) {
    const ex = Mock.users.find(m=>m.username===u);
    if(ex) return {success:false,message:'Username sudah digunakan.'};
    Mock.users.push({username:u,password:p,role,nama});
    return {success:true,message:'Pendaftaran berhasil!'};
  },
  async getData(action,extra={}) {
    // Jika backend tidak dikonfigurasi, gunakan mock
    if(!this.ok()) return Mock.getData(action);
    
    // Coba call backend
    const r = await API.get(action,extra);
    
    // Jika response memiliki data array, return
    if(r&&Array.isArray(r.data)) return r;
    
    // Jika backend error atau action tidak dikenali, fallback ke mock
    if(r&&(r.success===false||r.message?.includes('tidak dikenali'))) {
      console.warn(`Backend action "${action}" tidak dikenali, menggunakan mock.`);
      return Mock.getData(action);
    }
    
    // Default fallback ke mock
    return Mock.getData(action);
  },
  async save(action,data) {
    // Jika backend tidak dikonfigurasi, gunakan mock
    if(!this.ok()) { this._mock(action,data); return {success:true}; }
    
    // Coba call backend
    const r = await API.post(action,data);
    
    // Jika response berhasil, update mock juga dan return
    if(r&&r.success!==false) { this._mock(action,data); return {success:true,message:r.message}; }
    
    // Jika backend error atau action tidak dikenali, fallback ke mock
    if(r&&(r.success===false||r.message?.includes('tidak dikenali'))) {
      console.warn(`Backend action "${action}" tidak dikenali, menggunakan mock.`);
      this._mock(action,data); 
      return {success:true}; // Return success karena mock sudah handle
    }
    
    return {success:false,message:r?.message||'Gagal menyimpan.'};
  },
  _mock(action,data) {
    const d = {...data, waktu:data.waktu||new Date().toISOString()};
    ({
      addMateri:  ()=>State.materi.push(d),
      updateMateri: ()=>{ const i=State.materi.findIndex(m=>m.judul===d.oldJudul); if(i>-1) { State.materi[i].judul=d.judul; Object.assign(State.materi[i],{mapel:d.mapel,deskripsi:d.deskripsi,link:d.link,waktu:d.waktu}); } },
      deleteMateri: ()=>{ const i=State.materi.findIndex(m=>m.judul===d.judul); if(i>-1) State.materi.splice(i,1); },
      
      addTugas:   ()=>State.tugas.push(d),
      updateTugas: ()=>{ const i=State.tugas.findIndex(t=>t.judul===d.oldJudul); if(i>-1) { State.tugas[i].judul=d.judul; Object.assign(State.tugas[i],{mapel:d.mapel,deskripsi:d.deskripsi,deadline:d.deadline,link:d.link,waktu:d.waktu}); } },
      deleteTugas: ()=>{ const i=State.tugas.findIndex(t=>t.judul===d.judul); if(i>-1) State.tugas.splice(i,1); },
      
      addJawaban: ()=>{ const i=State.jawaban.findIndex(j=>j.nama===d.nama&&j.tugas===d.tugas); i>-1?State.jawaban[i]=d:State.jawaban.push(d); },
      addNilai:   ()=>{ const i=State.nilai.findIndex(n=>n.nama===d.nama&&n.tugas===d.tugas); i>-1?State.nilai[i]=d:State.nilai.push(d); },
      addForum:   ()=>State.forum.push(d),
      
      addKuisBank:()=>State.kuis.push({...d,id:d.id||'kuis_'+Date.now()}),
      updateKuisBank: ()=>{ const i=State.kuis.findIndex(k=>k.judul===d.oldJudul); if(i>-1) { State.kuis[i].judul=d.judul; Object.assign(State.kuis[i],{mapel:d.mapel,deskripsi:d.deskripsi,soalJSON:d.soalJSON,jumlahSoal:d.jumlahSoal,waktu:d.waktu}); } },
      deleteKuisBank: ()=>{ const i=State.kuis.findIndex(k=>k.judul===d.judul); if(i>-1) State.kuis.splice(i,1); },
      
      addHasilKuis:()=>State.hasilKuis.push(d),
      
      addAbsensi: ()=>State.absensi.push({...d,id:d.id||'abs_'+Date.now()}),
      updateAbsensi: ()=>{ const i=State.absensi.findIndex(a=>a.id===d.id); if(i>-1) Object.assign(State.absensi[i],d); },
      deleteAbsensi: ()=>{ const i=State.absensi.findIndex(a=>a.id===d.id); if(i>-1) State.absensi.splice(i,1); },
      
      addAbsensiSiswa: ()=>{ const i=State.absensiSiswa.findIndex(a=>a.absensiId===d.absensiId&&a.nama===d.nama); if(i>-1) State.absensiSiswa[i]=d; else State.absensiSiswa.push(d); },
      
      addZoom: ()=>State.zoom.push({...d,id:d.id||'zoom_'+Date.now()}),
      updateZoom: ()=>{ const i=State.zoom.findIndex(z=>z.id===d.id); if(i>-1) Object.assign(State.zoom[i],d); },
      deleteZoom: ()=>{ const i=State.zoom.findIndex(z=>z.id===d.id); if(i>-1) State.zoom.splice(i,1); },
    }[action]||(() => {}))();
  },
};

// ─── HELPERS ─────────────────────────────────────────────────
const H = {
  fmtDate(s){ if(!s)return'—'; try{return new Date(s).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});}catch{return s;} },
  timeAgo(s){ if(!s)return''; const d=Math.floor((Date.now()-new Date(s))/1000); if(d<60)return'Baru saja'; if(d<3600)return`${Math.floor(d/60)} menit lalu`; if(d<86400)return`${Math.floor(d/3600)} jam lalu`; return`${Math.floor(d/86400)} hari lalu`; },
  grade(n){ const v=parseInt(n); if(v>=90)return{cls:'nilai-a',label:'Sangat Baik',badge:'badge-green'}; if(v>=75)return{cls:'nilai-b',label:'Baik',badge:'badge-blue'}; if(v>=60)return{cls:'nilai-c',label:'Cukup',badge:'badge-amber'}; return{cls:'nilai-d',label:'Perlu Perbaikan',badge:'badge-red'}; },
  empty(icon,title,desc='') { return `<div class="empty-state"><div class="empty-icon"><i class="fa-solid ${icon}"></i></div><h4>${title}</h4>${desc?`<p>${desc}</p>`:''}</div>`; },
  av(n){ return n?n.charAt(0).toUpperCase():'?'; },
  escape(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); },
  kuisIcon(mapel='') {
    const m = mapel.toLowerCase();
    if(m.includes('mat')||m.includes('fisika')||m.includes('kimia')) return 'fa-calculator';
    if(m.includes('bahasa')||m.includes('inggris')) return 'fa-language';
    if(m.includes('ipa')||m.includes('biologi')) return 'fa-microscope';
    if(m.includes('ips')||m.includes('sejarah')) return 'fa-earth-asia';
    if(m.includes('agama')) return 'fa-mosque';
    if(m.includes('seni')) return 'fa-palette';
    if(m.includes('komputer')||m.includes('tik')||m.includes('program')) return 'fa-laptop-code';
    return 'fa-circle-question';
  },
};

// ─── ROUTER ──────────────────────────────────────────────────
const Router = {
  current: null,
  meta: {
    dashboard:       {title:'Dashboard',           bc:'Beranda'},
    'materi-guru':   {title:'Kelola Materi',        bc:'Materi → Kelola'},
    'materi-siswa':  {title:'Materi Pembelajaran',  bc:'Materi → Lihat'},
    'tugas-guru':    {title:'Kelola Tugas',          bc:'Tugas → Kelola'},
    'tugas-siswa':   {title:'Tugas Saya',            bc:'Tugas → Saya'},
    'nilai-guru':    {title:'Rekap Nilai',           bc:'Nilai → Rekap'},
    'nilai-siswa':   {title:'Nilai Saya',            bc:'Nilai → Saya'},
    'kuis-guru':     {title:'Buat & Kelola Kuis',    bc:'Kuis → Kelola'},
    'kuis-siswa':    {title:'Kuis Tersedia',         bc:'Kuis → Pilih'},
    'absensi-guru':  {title:'Kelola Absensi',        bc:'Absensi → Kelola'},
    'absensi-siswa': {title:'Absensi Saya',          bc:'Absensi → Saya'},
    'zoom-guru':     {title:'Kelola Zoom',           bc:'Zoom → Kelola'},
    'zoom-siswa':    {title:'Zoom Meeting',          bc:'Zoom → Join'},
    forum:           {title:'Forum Diskusi',         bc:'Forum'},
  },
  go(sec) {
    document.querySelectorAll('.sec').forEach(e=>e.classList.add('hidden'));
    const el = document.getElementById(`sec-${sec}`);
    if(el) el.classList.remove('hidden');
    document.querySelectorAll('.sb-nav-item').forEach(e=>e.classList.remove('active'));
    const nav = document.getElementById(`nav-${sec}`);
    if(nav) nav.classList.add('active');
    const m = this.meta[sec]||{title:sec,bc:sec};
    document.getElementById('topbar-title').textContent = m.title;
    document.getElementById('topbar-bc').textContent    = m.bc;
    this.current = sec;
    if(Render[sec]) Render[sec]();
    if(window.innerWidth<=768){
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.add('hidden');
    }
  },
};

// ─── NAV MENUS ───────────────────────────────────────────────
const NAV = {
  admin: [
    {id:'dashboard',   label:'Dashboard',    icon:'fa-house'},
    {id:'forum',       label:'Forum Diskusi', icon:'fa-comments'},
  ],
  guru: [
    {id:'dashboard',    label:'Dashboard',    icon:'fa-house'},
    {id:'materi-guru',  label:'Kelola Materi',  icon:'fa-cloud-arrow-up'},
    {id:'tugas-guru',   label:'Kelola Tugas',   icon:'fa-clipboard-list'},
    {id:'nilai-guru',   label:'Input Nilai',    icon:'fa-star'},
    {id:'kuis-guru',    label:'Buat Kuis',      icon:'fa-circle-question'},
    {id:'absensi-guru', label:'Kelola Absensi', icon:'fa-clipboard'},
    {id:'zoom-guru',    label:'Kelola Zoom',    icon:'fa-video'},
    {id:'forum',        label:'Forum Diskusi',  icon:'fa-comments'},
  ],
  siswa: [
    {id:'dashboard',     label:'Dashboard',    icon:'fa-house'},
    {id:'materi-siswa',  label:'Materi',       icon:'fa-book-open'},
    {id:'tugas-siswa',   label:'Tugas Saya',   icon:'fa-clipboard'},
    {id:'nilai-siswa',   label:'Nilai Saya',   icon:'fa-chart-bar'},
    {id:'kuis-siswa',    label:'Kuis',         icon:'fa-circle-question'},
    {id:'absensi-siswa', label:'Absensi',      icon:'fa-clipboard'},
    {id:'zoom-siswa',    label:'Zoom',         icon:'fa-video'},
    {id:'forum',         label:'Forum Diskusi', icon:'fa-comments'},
  ],
};

// ══════════════════════════════════════════════════════════════
// FILE UPLOAD HELPERS
// ══════════════════════════════════════════════════════════════
function makeUploadModule(tabBtnPrefix, tabLinkId, tabFileId, dropZoneId, fileInputId, selectedId, fileNameId) {
  return {
    switchTab(type) {
      const isLink = type==='link';
      document.getElementById(tabBtnPrefix+'-link').classList.toggle('active', isLink);
      document.getElementById(tabBtnPrefix+'-file').classList.toggle('active', !isLink);
      document.getElementById(tabLinkId).classList.toggle('hidden', !isLink);
      document.getElementById(tabFileId).classList.toggle('hidden', isLink);
    },
    dragOver(e) { e.preventDefault(); document.getElementById(dropZoneId).classList.add('drag-over'); },
    dragLeave(e){ document.getElementById(dropZoneId).classList.remove('drag-over'); },
    drop(e) {
      e.preventDefault();
      document.getElementById(dropZoneId).classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if(f) this._setFile(f);
    },
    fileSelected(inp) { if(inp.files[0]) this._setFile(inp.files[0]); },
    _setFile(f) {
      document.getElementById(fileNameId).textContent = f.name;
      document.getElementById(selectedId).classList.remove('hidden');
      this._selectedFile = f;
    },
    getLink() {
      // Ambil link dari tab aktif
      const linkTab = document.getElementById(tabLinkId);
      if(!linkTab.classList.contains('hidden')) {
        // Tab link aktif
        const inp = linkTab.querySelector('input[type="url"]');
        return inp ? inp.value.trim() : '';
      } else {
        // Tab file aktif — ambil dari gdrive input atau placeholder
        const gd = document.getElementById(tabFileId).querySelector('input[type="url"]');
        return gd ? gd.value.trim() : '';
      }
    },
    _selectedFile: null,
  };
}

const MateriUpload  = makeUploadModule('tab',    'materi-tab-link', 'materi-tab-file', 'materi-drop-zone', 'm-file', 'materi-file-selected', 'materi-file-name');
const TugasUpload   = makeUploadModule('ttab',   'tugas-tab-link',  'tugas-tab-file',  'tugas-drop-zone',  't-file', 'tugas-file-selected',  'tugas-file-name');
const JawabanUpload = makeUploadModule('jtab',   'jawaban-tab-link','jawaban-tab-file','jwb-drop-zone',    'j-file', 'jwb-file-selected',    'jwb-file-name');

// ══════════════════════════════════════════════════════════════
// RENDER ENGINE
// ══════════════════════════════════════════════════════════════
const Render = {

  // ── Dashboard ──────────────────────────────────────────────
  dashboard() {
    const u = State.user;
    const h = new Date().getHours();
    const g = h<11?'Selamat Pagi':h<15?'Selamat Siang':h<18?'Selamat Sore':'Selamat Malam';
    document.getElementById('dash-greeting').textContent = `${g}, ${u.nama.split(' ')[0]}!`;
    document.getElementById('dash-date-label').textContent = new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    const stats = [
      {label:'Materi',   val:State.materi.length,  icon:'fa-book-open',     cls:'sc-blue',   bg:'bg-blue'},
      {label:'Tugas',    val:State.tugas.length,   icon:'fa-clipboard-list', cls:'sc-amber',  bg:'bg-amber'},
      {label:'Kuis',     val:State.kuis.length,    icon:'fa-circle-question',cls:'sc-purple', bg:'bg-purple'},
      {label:'Forum',    val:State.forum.length,   icon:'fa-comments',       cls:'sc-green',  bg:'bg-green'},
    ];
    document.getElementById('stat-grid').innerHTML = stats.map(s=>`
      <div class="stat-card ${s.cls}">
        <div class="stat-icon ${s.bg}"><i class="fa-solid ${s.icon}"></i></div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.val}</div>
      </div>`).join('');

    const dml = document.getElementById('dash-materi-list');
    const rm  = State.materi.slice(-5).reverse();
    dml.innerHTML = rm.length ? rm.map(m=>`
      <div class="dash-item" onclick="${m.link?`window.open('${m.link}','_blank')`:''}">
        <div class="dash-item-icon bg-blue"><i class="fa-solid fa-file-lines"></i></div>
        <div class="dash-item-body"><div class="dash-item-title">${m.judul}</div><div class="dash-item-meta">${m.mapel||m.pembuat||'—'}</div></div>
      </div>`).join('') : H.empty('fa-book-open','Belum ada materi');

    const dtl = document.getElementById('dash-tugas-list');
    const rt  = State.tugas.slice(-5).reverse();
    dtl.innerHTML = rt.length ? rt.map(t=>`
      <div class="dash-item">
        <div class="dash-item-icon bg-amber"><i class="fa-solid fa-clipboard"></i></div>
        <div class="dash-item-body"><div class="dash-item-title">${t.judul}</div><div class="dash-item-meta">Deadline: ${H.fmtDate(t.deadline)}</div></div>
      </div>`).join('') : H.empty('fa-clipboard-list','Belum ada tugas');
  },

  // ── Materi Guru ────────────────────────────────────────────
  'materi-guru'() {
    document.getElementById('materi-count').textContent = State.materi.length;
    const el = document.getElementById('materi-list-guru');
    if(!State.materi.length){ el.innerHTML=H.empty('fa-cloud-arrow-up','Belum ada materi','Upload materi pertama di form sebelah.'); return; }
    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Judul</th><th>Mapel</th><th>Pembuat</th><th>Aksi</th></tr></thead>
      <tbody>${State.materi.map((m,i)=>`
        <tr data-materi="${H.escape(m.judul)}">
          <td>${i+1}</td>
          <td><strong>${m.judul}</strong>${m.deskripsi?`<br><small style="color:var(--text-tertiary)">${m.deskripsi}</small>`:''}</td>
          <td>${m.mapel?`<span class="badge badge-blue">${m.mapel}</span>`:'—'}</td>
          <td>${m.pembuat||'—'}</td>
          <td style="display:flex;gap:8px;align-items:center">
            ${m.link?`<button class="btn-secondary btn-sm" onclick="MateriViewer.openByElement(this)"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>`:''}
            <button class="btn-secondary btn-sm" onclick="MateriGuru.editByElement(this)"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-secondary btn-sm" onclick="MateriGuru.deleteByElement(this)" style="color:var(--red)"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>`).join('')}
      </tbody></table></div>`;
  },

  // ── Materi Siswa ───────────────────────────────────────────
  'materi-siswa'() { this._materiGrid(State.materi); },
  _materiGrid(data) {
    const el = document.getElementById('materi-grid-siswa');
    if(!data.length){ el.innerHTML=`<div class="card" style="grid-column:1/-1">${H.empty('fa-book-open','Belum ada materi','Materi akan muncul setelah guru mengunggah.')}</div>`; return; }
    el.innerHTML = data.map(m=>`
      <div class="materi-card" ${m.link?`onclick="MateriViewer.openByElement(this)"`:''}
           style="${m.link?'cursor:pointer':''};transition:all 0.3s" 
           data-materi="${H.escape(m.judul)}">
        <div class="materi-card-icon"><i class="fa-solid fa-file-lines"></i></div>
        <div>
          <div class="materi-card-title">${m.judul}</div>
          ${m.deskripsi?`<div class="materi-card-desc">${m.deskripsi}</div>`:''}
        </div>
        <div class="materi-card-footer">
          <div class="materi-card-author">
            <i class="fa-solid fa-chalkboard-teacher"></i> ${m.pembuat||'—'}
            ${m.mapel?` &bull; <span style="color:var(--amber-dark);font-weight:700">${m.mapel}</span>`:''}
          </div>
          ${m.link?`<span class="badge badge-blue"><i class="fa-solid fa-link"></i> Tersedia</span>`:`<span class="badge badge-gray">Tanpa link</span>`}
        </div>
      </div>`).join('');
  },

  // ── Tugas Guru ─────────────────────────────────────────────
  'tugas-guru'() {
    const elT = document.getElementById('tugas-list-guru');
    elT.innerHTML = !State.tugas.length ? H.empty('fa-clipboard-list','Belum ada tugas')
      : `<div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Judul</th><th>Mapel</th><th>Deadline</th><th>Lampiran</th><th>Aksi</th></tr></thead>
          <tbody>${State.tugas.map((t,i)=>`
            <tr>
              <td>${i+1}</td>
              <td><strong>${t.judul}</strong>${t.deskripsi?`<br><small style="color:var(--text-tertiary)">${t.deskripsi}</small>`:''}</td>
              <td>${t.mapel?`<span class="badge badge-amber">${t.mapel}</span>`:'—'}</td>
              <td>${t.deadline?`<span class="badge badge-amber"><i class="fa-regular fa-calendar"></i> ${H.fmtDate(t.deadline)}</span>`:'—'}</td>
              <td>${t.link?`<a href="${t.link}" target="_blank" class="btn-secondary btn-sm"><i class="fa-solid fa-file"></i></a>`:'—'}</td>
              <td style="display:flex;gap:8px;align-items:center">
                <button class="btn-secondary btn-sm" onclick="TugasGuru.edit('${t.judul}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-secondary btn-sm" onclick="TugasGuru.delete('${t.judul}')" style="color:var(--red)"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>`).join('')}
          </tbody></table></div>`;

    document.getElementById('jawaban-count').textContent = State.jawaban.length;
    const elJ = document.getElementById('jawaban-list-guru');
    elJ.innerHTML = !State.jawaban.length ? H.empty('fa-inbox','Belum ada jawaban','Jawaban siswa akan muncul di sini.')
      : `<div class="table-wrap"><table>
          <thead><tr><th>Siswa</th><th>Tugas</th><th>Jawaban</th><th>Catatan</th><th>Aksi</th></tr></thead>
          <tbody>${State.jawaban.map((j,i)=>`
            <tr>
              <td><strong>${j.nama}</strong></td>
              <td>${j.tugas}</td>
              <td>${j.link?`<a href="${j.link}" target="_blank" class="btn-secondary btn-sm"><i class="fa-solid fa-eye"></i> Lihat</a>`:'—'}</td>
              <td style="font-size:13px;color:var(--text-tertiary)">${j.catatan||'—'}</td>
              <td><button class="btn-amber-sm" onclick="Nilai.openModal(${i})"><i class="fa-solid fa-star"></i> Nilai</button></td>
            </tr>`).join('')}
          </tbody></table></div>`;
  },

  // ── Tugas Siswa ────────────────────────────────────────────
  'tugas-siswa'() {
    const el = document.getElementById('tugas-list-siswa');
    if(!State.tugas.length){ el.innerHTML=`<div class="card">${H.empty('fa-clipboard','Belum ada tugas','Tugas dari guru akan muncul di sini.')}</div>`; return; }
    el.innerHTML = `<div class="tugas-siswa-list">${State.tugas.map((t,i)=>{
      const done = State.jawaban.some(j=>j.tugas===t.judul&&j.nama===State.user.nama);
      return `<div class="tugas-siswa-item ${done?'done':''}">
        <div class="tsi-icon"><i class="fa-solid fa-clipboard-list"></i></div>
        <div class="tsi-body">
          <div class="tsi-title">${t.judul}</div>
          <div class="tsi-meta">
            ${t.mapel?`<span><i class="fa-solid fa-book"></i> ${t.mapel}</span>`:''}
            ${t.deskripsi?`<span>${t.deskripsi}</span>`:''}
            ${t.deadline?`<span><i class="fa-regular fa-calendar"></i> ${H.fmtDate(t.deadline)}</span>`:''}
            ${t.link?`<a href="${t.link}" target="_blank" class="badge badge-blue" style="cursor:pointer"><i class="fa-solid fa-file"></i> Soal</a>`:''}
          </div>
        </div>
        <div class="tsi-actions">
          ${done?`<span class="badge badge-green"><i class="fa-solid fa-check"></i> Terkumpul</span>`
                :`<button class="btn-primary btn-sm" onclick="Tugas.openKumpul(${i})"><i class="fa-solid fa-cloud-arrow-up"></i> Kumpulkan</button>`}
        </div>
      </div>`;
    }).join('')}</div>`;
  },

  // ── Nilai Guru ─────────────────────────────────────────────
  'nilai-guru'() {
    const el = document.getElementById('nilai-list-guru');
    if(!State.nilai.length){ el.innerHTML=H.empty('fa-star','Belum ada nilai','Berikan nilai dari menu Kelola Tugas.'); return; }
    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Nama Siswa</th><th>Tugas</th><th>Nilai</th><th>Keterangan</th><th>Waktu</th></tr></thead>
      <tbody>${State.nilai.map(n=>{ const g=H.grade(n.nilai); return `
        <tr>
          <td><strong>${n.nama}</strong></td>
          <td>${n.tugas}</td>
          <td><span class="nilai-display ${g.cls}">${n.nilai}</span></td>
          <td><span class="badge ${g.badge}">${g.label}</span></td>
          <td style="color:var(--text-tertiary);font-size:13px">${H.fmtDate(n.waktu)}</td>
        </tr>`;}).join('')}
      </tbody></table></div>`;
  },

  // ── Nilai Siswa ────────────────────────────────────────────
  'nilai-siswa'() {
    const my = State.nilai.filter(n=>n.nama===State.user.nama);
    const su = document.getElementById('nilai-summary-siswa');
    if(my.length) {
      const avg=Math.round(my.reduce((s,n)=>s+parseInt(n.nilai),0)/my.length);
      const mx=Math.max(...my.map(n=>parseInt(n.nilai)));
      const mn=Math.min(...my.map(n=>parseInt(n.nilai)));
      su.innerHTML = `<div class="nilai-summary-cards">
        <div class="nscard"><div class="nscard-val ${H.grade(avg).cls}">${avg}</div><div class="nscard-lbl">Rata-rata</div></div>
        <div class="nscard"><div class="nscard-val" style="color:var(--green)">${mx}</div><div class="nscard-lbl">Tertinggi</div></div>
        <div class="nscard"><div class="nscard-val" style="color:var(--red)">${mn}</div><div class="nscard-lbl">Terendah</div></div>
        <div class="nscard"><div class="nscard-val" style="color:var(--navy)">${my.length}</div><div class="nscard-lbl">Dinilai</div></div>
      </div>`;
    } else su.innerHTML='';

    const el = document.getElementById('nilai-list-siswa');
    if(!my.length){ el.innerHTML=H.empty('fa-chart-bar','Belum ada nilai','Nilai akan muncul setelah guru memberikan penilaian.'); return; }
    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Tugas</th><th>Nilai</th><th>Keterangan</th></tr></thead>
      <tbody>${my.map(n=>{ const g=H.grade(n.nilai); return `
        <tr>
          <td><strong>${n.tugas}</strong></td>
          <td><span class="nilai-display ${g.cls}">${n.nilai}</span></td>
          <td><span class="badge ${g.badge}">${g.label}</span></td>
        </tr>`;}).join('')}
      </tbody></table></div>`;
  },

  // ── Kuis Guru ──────────────────────────────────────────────
  'kuis-guru'() { KuisGuru.renderList(); },

  // ── Kuis Siswa ─────────────────────────────────────────────
  'kuis-siswa'() { KuisSiswa.renderGrid(); },

  // ── Forum ──────────────────────────────────────────────────
  async forum() {
    const r = await SmartAPI.getData('getForum');
    State.forum = r.data||State.forum;
    this._forum();
    document.getElementById('forum-avatar').textContent = H.av(State.user.nama);
  },
  _forum() {
    const el = document.getElementById('forum-messages');
    if(!State.forum.length){ el.innerHTML=`<div class="empty-state" style="padding:60px 24px"><div class="empty-icon"><i class="fa-solid fa-comments"></i></div><h4>Belum ada diskusi</h4><p>Mulai diskusi pertama!</p></div>`; return; }
    el.innerHTML = State.forum.map(m=>{
      const own=m.nama===State.user.nama;
      return `<div class="forum-bubble ${own?'own':''}">
        <div class="fb-avatar">${H.av(m.nama)}</div>
        <div class="fb-body">
          <div class="fb-name">${m.nama}</div>
          <div class="fb-msg">${m.pesan}</div>
          <div class="fb-time">${H.timeAgo(m.waktu)}</div>
        </div>
      </div>`;}).join('');
    el.scrollTop=el.scrollHeight;
  },

  'absensi-guru'() {
    Render._absensiGuru();
  },
  _absensiGuru() {
    const el = document.getElementById('abs-list-guru');
    if(!State.absensi.length) {
      el.innerHTML = `<div class="abs-empty-state"><i class="fa-solid fa-clipboard"></i><p>Belum ada absensi</p></div>`;
      return;
    }
    el.innerHTML = State.absensi.map(a=>`
      <div class="abs-card">
        <div class="abs-info">
          <div class="abs-title">${a.judul}</div>
          <div class="abs-meta">
            <span>${a.mapel||'—'}</span>
            <span>${a.tgl} ${a.jam}</span>
            <span class="abs-status ${a.status}">${a.status==='buka'?'🔓 Buka':'🔒 Tutup'}</span>
          </div>
        </div>
        <div class="abs-actions">
          <button class="btn-abs-action edit" onclick="AbsensiGuru.edit('${a.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-abs-action delete" onclick="AbsensiGuru.delete('${a.id}')" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
  },

  'absensi-siswa'() {
    Render._absensiSiswa();
  },
  _absensiSiswa() {
    const el = document.getElementById('abs-siswa-list');
    const myAbsensi = State.absensi.filter(a=>a.status==='buka');
    if(!myAbsensi.length) {
      el.innerHTML = `<div class="card"><div class="empty-state" style="padding:60px 24px"><i class="fa-solid fa-clipboard"></i><h4>Tidak ada absensi aktif</h4><p>Tunggu guru membuka absensi.</p></div></div>`;
      return;
    }
    el.innerHTML = myAbsensi.map(a=>{
      const sudahAbsen = State.absensiSiswa.some(as=>as.absensiId===a.id && as.nama===State.user.nama);
      return `<div class="abs-item-siswa">
        <div class="abs-item-header">
          <div class="abs-icon bg-blue"><i class="fa-solid fa-clipboard-check"></i></div>
          <div class="abs-item-body">
            <div class="abs-item-title">${a.judul}</div>
            <div class="abs-item-meta">${a.mapel||'—'} • ${a.tgl} ${a.jam}</div>
          </div>
        </div>
        <div class="abs-item-footer">
          <span class="abs-badge ${sudahAbsen?'hadir':'belum'}">${sudahAbsen?'✓ Hadir':'⏳ Belum Absen'}</span>
          ${!sudahAbsen?`<button class="btn-primary" onclick="AbsensiSiswa.absen('${a.id}')"><i class="fa-solid fa-check"></i> Absen</button>`:''}
        </div>
      </div>`}).join('');
  },

  'zoom-guru'() {
    Render._zoomGuru();
  },
  _zoomGuru() {
    const el = document.getElementById('zoom-list-guru');
    if(!State.zoom.length) {
      el.innerHTML = `<div class="zoom-empty-state"><i class="fa-solid fa-video"></i><p>Belum ada zoom</p></div>`;
      return;
    }
    el.innerHTML = State.zoom.map(z=>`
      <div class="zoom-card">
        <div class="zoom-info">
          <div class="zoom-title">${z.judul}</div>
          <div class="zoom-meta">
            <span>${z.mapel||'—'}</span>
            <a href="${z.linkZoom}" target="_blank" class="zoom-link"><i class="fa-solid fa-link"></i> Link</a>
            <span class="zoom-status ${z.status}">${z.status==='buka'?'🔓 Buka':'🔒 Tutup'}</span>
          </div>
        </div>
        <div class="zoom-actions">
          <button class="btn-zoom-action edit" onclick="ZoomGuru.edit('${z.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-zoom-action delete" onclick="ZoomGuru.delete('${z.id}')" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
  },

  'zoom-siswa'() {
    Render._zoomSiswa();
  },
  _zoomSiswa() {
    const el = document.getElementById('zoom-siswa-list');
    const myZoom = State.zoom.filter(z=>z.status==='buka');
    if(!myZoom.length) {
      el.innerHTML = `<div class="card"><div class="empty-state" style="padding:60px 24px"><i class="fa-solid fa-video"></i><h4>Tidak ada zoom aktif</h4><p>Tunggu guru membuka zoom.</p></div></div>`;
      return;
    }
    el.innerHTML = myZoom.map(z=>`
      <div class="zoom-item-siswa">
        <div class="zoom-item-header">
          <div class="zoom-icon bg-purple"><i class="fa-solid fa-video"></i></div>
          <div class="zoom-item-body">
            <div class="zoom-item-title">${z.judul}</div>
            <div class="zoom-item-meta">${z.mapel||'—'}</div>
          </div>
        </div>
        <div class="zoom-item-footer">
          <button class="btn-zoom-join" onclick="window.open('${z.linkZoom}','_blank')"><i class="fa-solid fa-arrow-up-right-from-square"></i> Masuk Zoom</button>
        </div>
      </div>`).join('');
  },
};

// ══════════════════════════════════════════════════════════════
// MATERI MODULE
// ══════════════════════════════════════════════════════════════
const Materi = {
  async upload() {
    const judul    = document.getElementById('m-judul').value.trim();
    const mapel    = document.getElementById('m-mapel').value.trim();
    const deskripsi= document.getElementById('m-deskripsi').value.trim();
    if(!judul){ Toast.error('Validasi','Judul materi wajib diisi.'); return; }

    // Ambil link dari tab aktif
    let link = MateriUpload.getLink();
    // Jika tab link aktif, ambil dari #m-link
    const tabLinkEl = document.getElementById('materi-tab-link');
    if(!tabLinkEl.classList.contains('hidden')) {
      link = document.getElementById('m-link').value.trim();
    } else {
      link = document.getElementById('m-gdrive').value.trim();
    }

    const data = {judul,mapel,deskripsi,link,pembuat:State.user.nama,waktu:new Date().toISOString()};
    const res  = await SmartAPI.save('addMateri',data);
    if(res.success!==false){
      Toast.success('Berhasil!','Materi berhasil diupload.');
      ['m-judul','m-mapel','m-link','m-deskripsi','m-gdrive'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
      document.getElementById('materi-file-selected').classList.add('hidden');
      Render['materi-guru']();
    } else Toast.error('Upload gagal',res.message);
  },
  search(q) {
    const f = State.materi.filter(m=>m.judul.toLowerCase().includes(q.toLowerCase())||(m.deskripsi||'').toLowerCase().includes(q.toLowerCase())||(m.mapel||'').toLowerCase().includes(q.toLowerCase()));
    Render._materiGrid(f);
  },
};

// ══════════════════════════════════════════════════════════════
// MATERI GURU CRUD
// ══════════════════════════════════════════════════════════════
const MateriGuru = {
  edit(judul) {
    this._edit(judul);
  },
  editByElement(el) {
    const judul = el.closest('tr').dataset.materi;
    this._edit(judul);
  },
  async _edit(judul) {
    const materi = State.materi.find(m=>m.judul===judul);
    if(!materi) { Toast.error('Error','Materi tidak ditemukan.'); return; }
    
    const newJudul = prompt('Edit Judul Materi:', judul);
    if(newJudul===null||!newJudul.trim()) return;
    
    const res = await SmartAPI.save('updateMateri',{
      oldJudul:judul,
      judul:newJudul.trim(),
      mapel:materi.mapel,
      deskripsi:materi.deskripsi,
      link:materi.link,
      waktu:new Date().toISOString()
    });
    
    if(res.success) {
      Toast.success('Berhasil','Materi diperbarui.');
      const r = await SmartAPI.getData('getMateri');
      State.materi = r.data||[];
      Render['materi-guru']();
    } else {
      Toast.error('Gagal',res.message||'Gagal mengubah materi.');
    }
  },

  delete(judul) {
    this._delete(judul);
  },
  deleteByElement(el) {
    const judul = el.closest('tr').dataset.materi;
    this._delete(judul);
  },
  async _delete(judul) {
    if(!confirm(`Hapus materi "${judul}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    const res = await SmartAPI.save('deleteMateri',{judul});
    if(res.success) {
      Toast.success('Berhasil','Materi dihapus.');
      const r = await SmartAPI.getData('getMateri');
      State.materi = r.data||[];
      Render['materi-guru']();
    } else {
      Toast.error('Gagal',res.message||'Gagal menghapus materi.');
    }
  },
};

// ══════════════════════════════════════════════════════════════
// MATERI VIEWER — Buka & baca materi
// ══════════════════════════════════════════════════════════════
const MateriViewer = {
  open(judul) {
    this._open(judul);
  },
  openByElement(el) {
    // Cek apakah ada di dalam tr (table row) atau div.materi-card
    const trEl = el.closest('tr');
    const cardEl = el.closest('.materi-card');
    const judul = trEl ? trEl.dataset.materi : (cardEl ? cardEl.dataset.materi : null);
    
    if(!judul) {
      Toast.error('Error', 'Tidak bisa membuka materi.');
      return;
    }
    this._open(judul);
  },
  async _open(judul) {
    const materi = State.materi.find(m=>m.judul===judul);
    if(!materi) { Toast.error('Error','Materi tidak ditemukan.'); return; }
    
    document.getElementById('viewer-materi-judul').textContent = materi.judul;
    document.getElementById('viewer-materi-mapel').textContent = (materi.mapel||'') + (materi.pembuat?` • ${materi.pembuat}`:'');
    
    const body = document.getElementById('viewer-materi-body');
    if(!materi.link) {
      body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary)">
        <i class="fa-solid fa-exclamation-circle" style="font-size:48px;margin-bottom:16px;display:block;color:var(--amber)"></i>
        <p><strong>File belum tersedia</strong></p>
        <p style="font-size:13px;margin-top:8px">Guru belum menambahkan link ke file untuk materi ini.</p>
      </div>`;
      document.getElementById('viewer-materi-link').style.display = 'none';
    } else {
      const isGoogleDrive = materi.link.includes('drive.google.com');
      const isGoogleSheet = materi.link.includes('docs.google.com') && materi.link.includes('spreadsheet');
      const isGoogleDoc = materi.link.includes('docs.google.com') && !materi.link.includes('spreadsheet');
      
      if(isGoogleDrive || isGoogleSheet || isGoogleDoc) {
        const previewLink = materi.link.replace('/view', '').replace('?usp=sharing', '');
        body.innerHTML = `
          <iframe src="${previewLink}/preview" 
            style="width:100%;height:500px;border:1px solid var(--border);border-radius:var(--radius)" 
            allow="fullscreen"></iframe>`;
      } else {
        body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary)">
          <i class="fa-solid fa-external-link-alt" style="font-size:48px;margin-bottom:16px;display:block;color:var(--blue)"></i>
          <p><strong>File eksternal</strong></p>
          <p style="font-size:13px;margin-top:8px">Klik tombol "Buka di Tab Baru" untuk membuka file.</p>
        </div>`;
      }
      document.getElementById('viewer-materi-link').href = materi.link;
      document.getElementById('viewer-materi-link').style.display = 'inline-block';
    }
    
    Modal.open('modal-viewer-materi');
  },
};

// ══════════════════════════════════════════════════════════════
// TUGAS MODULE
// ══════════════════════════════════════════════════════════════
const Tugas = {
  async buat() {
    const judul    = document.getElementById('t-judul').value.trim();
    const mapel    = document.getElementById('t-mapel').value.trim();
    const deadline = document.getElementById('t-deadline').value;
    const deskripsi= document.getElementById('t-deskripsi').value.trim();
    if(!judul){ Toast.error('Validasi','Judul tugas wajib diisi.'); return; }

    let link = '';
    const tabLinkEl = document.getElementById('tugas-tab-link');
    if(!tabLinkEl.classList.contains('hidden')) {
      link = document.getElementById('t-link').value.trim();
    } else {
      link = document.getElementById('t-gdrive').value.trim();
    }

    const data = {judul,mapel,deadline,deskripsi,link,pembuat:State.user.nama,waktu:new Date().toISOString()};
    const res  = await SmartAPI.save('addTugas',data);
    if(res.success!==false){
      Toast.success('Berhasil!','Tugas berhasil dibuat.');
      ['t-judul','t-mapel','t-deadline','t-deskripsi','t-link','t-gdrive'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
      document.getElementById('tugas-file-selected').classList.add('hidden');
      Render['tugas-guru']();
    } else Toast.error('Gagal',res.message);
  },

  openKumpul(idx) {
    const t = State.tugas[idx];
    document.getElementById('j-idx').value   = idx;
    document.getElementById('j-tugas').value = t.judul;
    document.getElementById('j-link').value  = '';
    document.getElementById('j-catatan').value='';
    document.getElementById('j-gdrive').value='';
    document.getElementById('jwb-file-selected').classList.add('hidden');
    // Reset tab ke link
    JawabanUpload.switchTab('link');
    Modal.open('modal-jawaban');
  },

  async kumpul() {
    const tugas  = document.getElementById('j-tugas').value;
    const catatan= document.getElementById('j-catatan').value.trim();

    let link = '';
    const tabLinkEl = document.getElementById('jawaban-tab-link');
    if(!tabLinkEl.classList.contains('hidden')) {
      link = document.getElementById('j-link').value.trim();
    } else {
      link = document.getElementById('j-gdrive').value.trim();
    }
    if(!link){ Toast.error('Validasi','Link jawaban wajib diisi.'); return; }

    const data = {nama:State.user.nama,tugas,link,catatan,waktu:new Date().toISOString()};
    const res  = await SmartAPI.save('addJawaban',data);
    if(res.success!==false){
      Toast.success('Berhasil!','Jawaban berhasil dikumpulkan.');
      Modal.close('modal-jawaban');
      Render['tugas-siswa']();
    } else Toast.error('Gagal',res.message);
  },
};

// ══════════════════════════════════════════════════════════════
// TUGAS GURU CRUD
// ══════════════════════════════════════════════════════════════
const TugasGuru = {
  async edit(judul) {
    const tugas = State.tugas.find(t=>t.judul===judul);
    if(!tugas) { Toast.error('Error','Tugas tidak ditemukan.'); return; }
    
    const newJudul = prompt('Edit Judul Tugas:', judul);
    if(newJudul===null||!newJudul.trim()) return;
    
    const res = await SmartAPI.save('updateTugas',{
      oldJudul:judul,
      judul:newJudul.trim(),
      mapel:tugas.mapel,
      deskripsi:tugas.deskripsi,
      deadline:tugas.deadline,
      link:tugas.link,
      waktu:new Date().toISOString()
    });
    
    if(res.success) {
      Toast.success('Berhasil','Tugas diperbarui.');
      const r = await SmartAPI.getData('getTugas');
      State.tugas = r.data||[];
      Render['tugas-guru']();
    } else {
      Toast.error('Gagal',res.message||'Gagal mengubah tugas.');
    }
  },

  async delete(judul) {
    if(!confirm(`Hapus tugas "${judul}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    const res = await SmartAPI.save('deleteTugas',{judul});
    if(res.success) {
      Toast.success('Berhasil','Tugas dihapus.');
      const r = await SmartAPI.getData('getTugas');
      State.tugas = r.data||[];
      Render['tugas-guru']();
    } else {
      Toast.error('Gagal',res.message||'Gagal menghapus tugas.');
    }
  },
};

// ══════════════════════════════════════════════════════════════
// NILAI MODULE
// ══════════════════════════════════════════════════════════════
const Nilai = {
  openModal(idx) {
    const j = State.jawaban[idx];
    document.getElementById('n-idx').value   = idx;
    document.getElementById('n-nama').value  = j.nama;
    document.getElementById('n-tugas').value = j.tugas;
    document.getElementById('n-nilai').value = '';
    Modal.open('modal-nilai');
  },
  async simpan() {
    const nama  = document.getElementById('n-nama').value;
    const tugas = document.getElementById('n-tugas').value;
    const nilai = parseInt(document.getElementById('n-nilai').value);
    if(isNaN(nilai)||nilai<0||nilai>100){ Toast.error('Validasi','Nilai harus 0–100.'); return; }
    const res = await SmartAPI.save('addNilai',{nama,tugas,nilai,waktu:new Date().toISOString()});
    if(res.success!==false){
      Toast.success('Nilai disimpan!',`${nama} mendapat nilai ${nilai}.`);
      Modal.close('modal-nilai');
      Render['nilai-guru']();
    } else Toast.error('Gagal',res.message);
  },
};

// ══════════════════════════════════════════════════════════════
// FORUM MODULE
// ══════════════════════════════════════════════════════════════
const Forum = {
  async kirim() {
    const inp  = document.getElementById('forum-input');
    const pesan= inp.value.trim();
    if(!pesan) return;
    inp.value = '';
    const res = await SmartAPI.save('addForum',{nama:State.user.nama,pesan,waktu:new Date().toISOString()});
    if(res.success!==false) Render._forum();
    else { Toast.error('Gagal','Pesan tidak terkirim.'); inp.value=pesan; }
  },
};

// ══════════════════════════════════════════════════════════════
// KUIS GURU — Builder
// ══════════════════════════════════════════════════════════════
const KuisGuru = {
  // State builder
  _soalList: [],   // [{type:'pg'|'essay', teks:'', opsi:['','','',''], jawabanBenar:0}, ...]
  _mode: 'list',   // 'list' | 'build'
  _editIdx: -1,    // indeks kuis yg sedang diedit (-1 = baru)

  renderList() {
    const root = document.getElementById('kuis-guru-root');
    root.innerHTML = `
      <div class="kuis-guru-header">
        <h2>Buat & Kelola Kuis</h2>
        <button class="btn-primary" onclick="KuisGuru.openBuilder(-1)">
          <i class="fa-solid fa-plus"></i> Buat Kuis Baru
        </button>
      </div>
      ${State.kuis.length===0
        ? `<div class="card">${H.empty('fa-circle-question','Belum ada kuis','Klik "Buat Kuis Baru" untuk mulai membuat kuis.')}</div>`
        : `<div class="kuis-list-guru-grid">${State.kuis.map((k,i)=>this._cardHTML(k,i)).join('')}</div>`
      }`;
  },

  _cardHTML(k,i) {
    const soalData = this._parseSoal(k.soalJSON||'[]');
    const jml = soalData.length;
    const pg    = soalData.filter(s=>s.type==='pg').length;
    const essay = soalData.filter(s=>s.type==='essay').length;
    return `<div class="kuis-guru-card">
      <div class="kgc-top">
        <div class="kgc-icon"><i class="fa-solid ${H.kuisIcon(k.mapel)}"></i></div>
        <div class="kgc-body">
          <div class="kgc-title">${k.judul}</div>
          <div class="kgc-mapel"><i class="fa-solid fa-book"></i> ${k.mapel||'—'}</div>
        </div>
      </div>
      ${k.deskripsi?`<div class="kgc-desc">${k.deskripsi}</div>`:''}
      <div class="kgc-footer">
        <div class="kgc-meta">
          <span class="badge badge-gray"><i class="fa-solid fa-list-ol"></i> ${jml} Soal</span>
          ${pg>0?`<span class="badge badge-blue">PG: ${pg}</span>`:''}
          ${essay>0?`<span class="badge badge-purple">Essay: ${essay}</span>`:''}
        </div>
        <div class="actions">
          <button class="btn-secondary btn-sm" onclick="KuisGuru.preview(${i})"><i class="fa-solid fa-eye"></i></button>
          <button class="btn-amber-sm" onclick="KuisGuru.openBuilder(${i})"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn-danger-sm" onclick="KuisGuru.deleteKuis('${k.judul}')"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </div>
    </div>`;
  },

  openBuilder(idx) {
    this._editIdx = idx;
    if(idx>=0) {
      // Edit existing
      const k = State.kuis[idx];
      this._soalList = JSON.parse(JSON.stringify(this._parseSoal(k.soalJSON||'[]')));
      this._renderBuilder(k.judul, k.mapel||'', k.deskripsi||'');
    } else {
      this._soalList = [];
      this._renderBuilder('','','');
    }
  },

  _renderBuilder(judul, mapel, deskripsi) {
    const root = document.getElementById('kuis-guru-root');
    root.innerHTML = `
      <div class="qb-wrap">
        <div class="qb-header">
          <button class="qb-back" onclick="KuisGuru.renderList()"><i class="fa-solid fa-arrow-left"></i></button>
          <div class="qb-header-text">
            <h2>${this._editIdx>=0?'Edit Kuis':'Buat Kuis Baru'}</h2>
            <p>Isi informasi kuis dan tambahkan soal di bawah</p>
          </div>
        </div>

        <div class="card mb-20">
          <div class="card-head">
            <div class="card-head-icon bg-navy"><i class="fa-solid fa-circle-info"></i></div>
            <h3>Informasi Kuis</h3>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="form-group">
              <label class="form-label">Judul Kuis <span class="req">*</span></label>
              <input id="qb-judul" class="form-input" type="text" placeholder="Contoh: Ulangan Harian Bab 3" value="${judul}" />
            </div>
            <div class="form-group">
              <label class="form-label">Mata Pelajaran</label>
              <input id="qb-mapel" class="form-input" type="text" placeholder="Matematika, IPA, dst..." value="${mapel}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Deskripsi / Petunjuk Kuis</label>
            <textarea id="qb-deskripsi" class="form-textarea" placeholder="Tuliskan petunjuk mengerjakan kuis...">${deskripsi}</textarea>
          </div>
        </div>

        <div class="card mb-20">
          <div class="card-head">
            <div class="card-head-icon bg-blue"><i class="fa-solid fa-list-ol"></i></div>
            <h3>Daftar Soal <span class="count-badge" id="soal-count">${this._soalList.length}</span></h3>
          </div>
          <div id="soal-builder-container"></div>
          <div class="add-soal-row mt-16">
            <button class="btn-secondary btn-sm" onclick="KuisGuru.addSoal('pg')">
              <i class="fa-solid fa-circle-dot"></i> + Soal Pilihan Ganda
            </button>
            <button class="btn-secondary btn-sm" onclick="KuisGuru.addSoal('essay')">
              <i class="fa-solid fa-align-left"></i> + Soal Essay
            </button>
          </div>
        </div>

        <div style="display:flex;gap:12px;justify-content:flex-end">
          <button class="btn-ghost" onclick="KuisGuru.renderList()">Batal</button>
          <button class="btn-primary" onclick="KuisGuru.simpan()">
            <i class="fa-solid fa-floppy-disk"></i> Simpan Kuis
          </button>
        </div>
      </div>`;
    this._renderSoalList();
  },

  _renderSoalList() {
    const cont = document.getElementById('soal-builder-container');
    if(!cont) return;
    document.getElementById('soal-count').textContent = this._soalList.length;

    if(!this._soalList.length) {
      cont.innerHTML = `<div style="text-align:center;padding:28px;color:var(--text-tertiary);font-size:14px;">
        Belum ada soal. Klik tombol di bawah untuk menambah soal.</div>`;
      return;
    }
    cont.innerHTML = `<div class="soal-builder-list">
      ${this._soalList.map((s,i)=>this._soalCardHTML(s,i)).join('')}
    </div>`;
  },

  _soalCardHTML(s,i) {
    const isPG = s.type==='pg';
    return `<div class="soal-builder-card" id="sbc-${i}">
      <button class="sbc-remove" onclick="KuisGuru.removeSoal(${i})" title="Hapus soal"><i class="fa-solid fa-xmark"></i></button>
      <div class="sbc-header">
        <div class="sbc-num">
          <div class="sbc-num-badge">${i+1}</div>
          Soal ${i+1}
        </div>
        <span class="sbc-type-badge ${isPG?'type-pg':'type-essay'}">
          <i class="fa-solid ${isPG?'fa-circle-dot':'fa-align-left'}"></i>
          ${isPG?'Pilihan Ganda':'Essay'}
        </span>
      </div>

      <!-- Tipe selector -->
      <div class="sbc-type-selector">
        <button class="sbc-type-btn ${isPG?'active-pg':''}" onclick="KuisGuru.changeTipe(${i},'pg')">
          <i class="fa-solid fa-circle-dot"></i> Pilihan Ganda
        </button>
        <button class="sbc-type-btn ${!isPG?'active-essay':''}" onclick="KuisGuru.changeTipe(${i},'essay')">
          <i class="fa-solid fa-align-left"></i> Essay
        </button>
      </div>

      <!-- Teks soal -->
      <div class="form-group">
        <label class="form-label">Pertanyaan <span class="req">*</span></label>
        <textarea class="form-textarea" style="min-height:72px" placeholder="Tulis pertanyaan di sini..."
          oninput="KuisGuru.updateTeks(${i},this.value)">${s.teks||''}</textarea>
      </div>

      ${isPG ? this._pgHTML(s,i) : this._essayHTML(s,i)}
    </div>`;
  },

  _pgHTML(s,i) {
    const opsi = s.opsi&&s.opsi.length>=2 ? s.opsi : ['','','',''];
    // Pastikan panjang minimal 2
    while(opsi.length<2) opsi.push('');
    return `<div class="form-group">
      <label class="form-label">
        Opsi Jawaban
        <span style="color:var(--green);font-size:12px;font-weight:600;margin-left:8px">
          <i class="fa-solid fa-circle-check"></i> Pilih radio = jawaban benar
        </span>
      </label>
      <div class="opsi-list" id="opsi-list-${i}">
        ${opsi.map((o,j)=>`
          <div class="opsi-item ${s.jawabanBenar===j?'correct-row':''}" id="opsi-item-${i}-${j}">
            <input type="radio" class="opsi-radio" name="correct-${i}" value="${j}"
              ${s.jawabanBenar===j?'checked':''}
              onchange="KuisGuru.setJawaban(${i},${j})"
              title="Tandai sebagai jawaban benar" />
            <input class="opsi-input" type="text" placeholder="Opsi ${String.fromCharCode(65+j)}..."
              value="${o}"
              oninput="KuisGuru.updateOpsi(${i},${j},this.value)" />
            ${opsi.length>2?`<button class="opsi-del" onclick="KuisGuru.removeOpsi(${i},${j})" title="Hapus opsi"><i class="fa-solid fa-minus"></i></button>`:''}
          </div>`).join('')}
      </div>
      ${s.jawabanBenar>=0&&s.jawabanBenar<opsi.length?`<div class="jawaban-benar-hint"><i class="fa-solid fa-circle-check"></i> Jawaban benar: Opsi ${String.fromCharCode(65+s.jawabanBenar)}</div>`:''}
      <button class="add-opsi-btn" onclick="KuisGuru.addOpsi(${i})"><i class="fa-solid fa-plus"></i> Tambah Opsi</button>
    </div>`;
  },

  _essayHTML(s,i) {
    return `<div class="form-group">
      <label class="form-label">Kunci Jawaban <span class="form-hint">(untuk referensi guru)</span></label>
      <textarea class="form-textarea" style="min-height:60px" placeholder="Tuliskan kunci jawaban sebagai referensi penilaian..."
        oninput="KuisGuru.updateKunci(${i},this.value)">${s.kunci||''}</textarea>
    </div>`;
  },

  addSoal(type) {
    this._soalList.push({type, teks:'', opsi:['','','',''], jawabanBenar:0, kunci:''});
    this._renderSoalList();
    // Scroll ke bawah
    setTimeout(()=>{ const last=document.getElementById(`sbc-${this._soalList.length-1}`); if(last)last.scrollIntoView({behavior:'smooth',block:'start'}); },100);
  },

  removeSoal(i) {
    this._soalList.splice(i,1);
    this._renderSoalList();
  },

  changeTipe(i,type) {
    this._soalList[i].type = type;
    if(type==='pg' && (!this._soalList[i].opsi||this._soalList[i].opsi.length<2)) {
      this._soalList[i].opsi = ['','','',''];
      this._soalList[i].jawabanBenar = 0;
    }
    this._renderSoalList();
  },

  updateTeks(i,val)       { this._soalList[i].teks = val; },
  updateOpsi(i,j,val)     { this._soalList[i].opsi[j] = val; },
  updateKunci(i,val)      { this._soalList[i].kunci = val; },
  setJawaban(i,j) {
    this._soalList[i].jawabanBenar = j;
    // Update visual
    document.querySelectorAll(`[id^="opsi-item-${i}-"]`).forEach(el=>el.classList.remove('correct-row'));
    document.getElementById(`opsi-item-${i}-${j}`)?.classList.add('correct-row');
    // Update hint
    const card = document.getElementById(`sbc-${i}`);
    const hint = card?.querySelector('.jawaban-benar-hint');
    if(hint) hint.textContent = `✓ Jawaban benar: Opsi ${String.fromCharCode(65+j)}`;
  },
  addOpsi(i) {
    this._soalList[i].opsi.push('');
    this._renderSoalList();
  },
  removeOpsi(i,j) {
    if(this._soalList[i].opsi.length<=2){ Toast.warning('Minimal','Pilihan ganda harus memiliki minimal 2 opsi.'); return; }
    this._soalList[i].opsi.splice(j,1);
    if(this._soalList[i].jawabanBenar>=this._soalList[i].opsi.length) this._soalList[i].jawabanBenar=0;
    this._renderSoalList();
  },

  async simpan() {
    const judul    = document.getElementById('qb-judul').value.trim();
    const mapel    = document.getElementById('qb-mapel').value.trim();
    const deskripsi= document.getElementById('qb-deskripsi').value.trim();
    if(!judul){ Toast.error('Validasi','Judul kuis wajib diisi.'); return; }
    if(!this._soalList.length){ Toast.error('Validasi','Tambahkan minimal 1 soal.'); return; }

    // Validasi
    for(let i=0;i<this._soalList.length;i++){
      const s=this._soalList[i];
      if(!s.teks.trim()){ Toast.error(`Soal ${i+1}`,'Teks pertanyaan tidak boleh kosong.'); return; }
      if(s.type==='pg'){
        if(s.opsi.some(o=>!o.trim())){ Toast.error(`Soal ${i+1}`,'Semua opsi harus diisi.'); return; }
      }
    }

    const kuisData = {
      judul, mapel, deskripsi,
      pembuat: State.user.nama,
      soalJSON: JSON.stringify(this._soalList),
      jumlahSoal: this._soalList.length,
      waktu: new Date().toISOString(),
    };

    if(this._editIdx>=0) {
      State.kuis[this._editIdx] = {...State.kuis[this._editIdx], ...kuisData};
      // Update di sheets juga
      await SmartAPI.save('addKuisBank', {...kuisData, editIdx: this._editIdx});
      Toast.success('Berhasil!','Kuis berhasil diperbarui.');
    } else {
      const res = await SmartAPI.save('addKuisBank', kuisData);
      if(res.success===false){ Toast.error('Gagal',res.message); return; }
      Toast.success('Berhasil!','Kuis berhasil disimpan.');
    }
    this.renderList();
  },

  preview(idx) {
    const k = State.kuis[idx];
    const soal = this._parseSoal(k.soalJSON||'[]');
    document.getElementById('preview-kuis-body').innerHTML = `
      <div style="margin-bottom:16px">
        <div style="font-size:18px;font-weight:800">${k.judul}</div>
        ${k.mapel?`<div style="color:var(--amber-dark);font-size:13px;font-weight:700;margin-top:4px">${k.mapel}</div>`:''}
        ${k.deskripsi?`<div style="color:var(--text-secondary);font-size:14px;margin-top:8px;line-height:1.6">${k.deskripsi}</div>`:''}
        <div style="margin-top:12px;display:flex;gap:8px">
          <span class="badge badge-gray"><i class="fa-solid fa-list-ol"></i> ${soal.length} Soal</span>
          <span class="badge badge-blue">PG: ${soal.filter(s=>s.type==='pg').length}</span>
          <span class="badge badge-purple">Essay: ${soal.filter(s=>s.type==='essay').length}</span>
        </div>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      ${soal.map((s,i)=>`
        <div style="margin-bottom:20px;padding:16px;background:var(--bg);border-radius:var(--radius);border:1px solid var(--border)">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--text-tertiary);margin-bottom:8px">
            Soal ${i+1} — ${s.type==='pg'?'Pilihan Ganda':'Essay'}
          </div>
          <div style="font-weight:700;font-size:15px;margin-bottom:12px">${s.teks}</div>
          ${s.type==='pg'?s.opsi.map((o,j)=>`
            <div style="padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:14px;
              background:${j===s.jawabanBenar?'var(--green-light)':'var(--surface)'};
              border:1.5px solid ${j===s.jawabanBenar?'var(--green)':'var(--border)'};
              color:${j===s.jawabanBenar?'var(--green)':'var(--text-primary)'}">
              ${String.fromCharCode(65+j)}. ${o}
              ${j===s.jawabanBenar?'<span style="float:right;font-weight:800"><i class="fa-solid fa-check"></i> Benar</span>':''}
            </div>`).join('')
          :`<div style="font-size:13px;color:var(--text-secondary)"><strong>Kunci:</strong> ${s.kunci||'—'}</div>`}
        </div>`).join('')}`;
    Modal.open('modal-preview-kuis');
  },

  async deleteKuis(judul) {
    if(!confirm(`Hapus kuis "${judul}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    const res = await SmartAPI.save('deleteKuisBank',{judul});
    if(res.success) {
      Toast.success('Berhasil','Kuis dihapus.');
      const r = await SmartAPI.getData('getKuisBank');
      State.kuis = r.data||[];
      this.renderList();
    } else {
      Toast.error('Gagal',res.message||'Gagal menghapus kuis.');
    }
  },

  _parseSoal(json) { try { return JSON.parse(json)||[]; } catch { return []; } },
};

// ══════════════════════════════════════════════════════════════
// KUIS SISWA — Pilih kuis & kerjakan
// ══════════════════════════════════════════════════════════════
const KuisSiswa = {
  _activeKuis: null,
  _answers: {},
  _submitted: false,

  renderGrid() {
    const root = document.getElementById('kuis-siswa-root');
    root.innerHTML = `
      <div class="kuis-siswa-header">
        <h2><i class="fa-solid fa-circle-question" style="color:var(--navy);margin-right:10px"></i>Pilih Kuis</h2>
        <p>Pilih kuis yang ingin kamu kerjakan. Klik kartu kuis untuk memulai.</p>
      </div>
      ${State.kuis.length===0
        ? `<div class="card">${H.empty('fa-circle-question','Belum ada kuis','Guru belum membuat kuis. Cek kembali nanti ya!')}</div>`
        : `<div class="kuis-siswa-grid">${State.kuis.map((k,i)=>this._cardHTML(k,i)).join('')}</div>`
      }`;
  },

  _cardHTML(k,i) {
    const soal = KuisGuru._parseSoal(k.soalJSON||'[]');
    const sudah = State.hasilKuis.some(h=>h.namaKuis===k.judul&&h.nama===State.user.nama);
    return `<div class="kuis-siswa-card" onclick="KuisSiswa.mulai(${i})">
      <div class="ksc-icon"><i class="fa-solid ${H.kuisIcon(k.mapel)}"></i></div>
      ${k.mapel?`<div class="ksc-mapel"><i class="fa-solid fa-book"></i> ${k.mapel}</div>`:''}
      <div class="ksc-title">${k.judul}</div>
      ${k.deskripsi?`<div class="ksc-desc">${k.deskripsi}</div>`:''}
      <div class="ksc-footer">
        <div class="ksc-soal-count">
          <i class="fa-solid fa-list-ol"></i> ${soal.length} Soal
          ${soal.filter(s=>s.type==='pg').length>0?`<span class="badge badge-blue" style="font-size:11px">PG</span>`:''}
          ${soal.filter(s=>s.type==='essay').length>0?`<span class="badge badge-purple" style="font-size:11px">Essay</span>`:''}
        </div>
        <div class="ksc-done ${sudah?'sudah':'belum'}">
          <i class="fa-solid ${sudah?'fa-circle-check':'fa-circle'}"></i>
          ${sudah?'Sudah dikerjakan':'Belum dikerjakan'}
        </div>
      </div>
    </div>`;
  },

  mulai(idx) {
    this._activeKuis = State.kuis[idx];
    this._answers    = {};
    this._submitted  = false;
    this._renderSoal();
  },

  _renderSoal() {
    const k    = this._activeKuis;
    const soal = KuisGuru._parseSoal(k.soalJSON||'[]');
    const root = document.getElementById('kuis-siswa-root');

    root.innerHTML = `
      <div class="kuis-kerja-wrap">
        <div class="kuis-kerja-topbar">
          <div class="kkt-left">
            <div class="kkt-title">${k.judul}</div>
            ${k.mapel?`<div class="kkt-mapel"><i class="fa-solid fa-book"></i> ${k.mapel}</div>`:''}
          </div>
          <div class="kkt-right">
            <div>
              <div class="kkt-score-label" id="ks-count">0/${soal.length}</div>
              <div class="kkt-score-sub">Soal terjawab</div>
              <div class="kkt-pb-track"><div class="kkt-pb-fill" id="ks-pb" style="width:0%"></div></div>
            </div>
          </div>
        </div>

        ${k.deskripsi?`<div class="card mb-20" style="background:var(--amber-light);border-color:#fcd34d">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <i class="fa-solid fa-circle-info" style="color:var(--amber-dark);margin-top:2px"></i>
            <div style="font-size:14px;color:var(--text-primary)">${k.deskripsi}</div>
          </div>
        </div>`:''}

        ${soal.map((s,i)=>`
          <div class="kuis-question" id="qs-${i}">
            <div class="kuis-q-label">Soal ${i+1} dari ${soal.length} &bull;
              ${s.type==='pg'?'<span style="color:var(--blue)">Pilihan Ganda</span>':'<span style="color:var(--purple)">Essay</span>'}
            </div>
            <div class="kuis-q-text">${s.teks}</div>
            ${s.type==='pg'
              ? `<div class="kuis-options">
                  ${s.opsi.map((o,j)=>`
                    <label class="kuis-option" id="opt-${i}-${j}" onclick="KuisSiswa.pilih(${i},${j},'pg')">
                      <input type="radio" name="qs${i}" value="${j}" />
                      <label>${String.fromCharCode(65+j)}. ${o}</label>
                    </label>`).join('')}
                </div>`
              : `<textarea class="form-textarea" id="essay-${i}" placeholder="Tulis jawaban Anda di sini..."
                  oninput="KuisSiswa.pilih(${i},this.value,'essay')" style="min-height:100px"></textarea>`
            }
          </div>`).join('')}

        <div style="display:flex;gap:12px;justify-content:space-between;align-items:center;margin-top:8px">
          <button class="btn-ghost" onclick="KuisSiswa.renderGrid()">
            <i class="fa-solid fa-arrow-left"></i> Kembali
          </button>
          <button class="btn-primary" onclick="KuisSiswa.submit()">
            <i class="fa-solid fa-paper-plane"></i> Kirim Jawaban
          </button>
        </div>
      </div>`;
  },

  pilih(qi, val, type) {
    this._answers[qi] = {val, type};
    if(type==='pg') {
      document.querySelectorAll(`[id^="opt-${qi}-"]`).forEach(el=>el.classList.remove('selected'));
      document.getElementById(`opt-${qi}-${val}`)?.classList.add('selected');
    }
    const soal = KuisGuru._parseSoal(this._activeKuis.soalJSON||'[]');
    const count = Object.keys(this._answers).length;
    const pct   = Math.round(count/soal.length*100);
    document.getElementById('ks-count').textContent = `${count}/${soal.length}`;
    document.getElementById('ks-pb').style.width    = `${pct}%`;
  },

  async submit() {
    const k    = this._activeKuis;
    const soal = KuisGuru._parseSoal(k.soalJSON||'[]');

    if(Object.keys(this._answers).length < soal.length) {
      Toast.warning('Belum selesai','Jawab semua soal sebelum mengirim.'); return;
    }

    let benar = 0;
    soal.forEach((s,i)=>{
      const ans = this._answers[i];
      if(!ans) return;
      if(s.type==='pg') {
        document.querySelectorAll(`input[name="qs${i}"]`).forEach(r=>r.disabled=true);
        document.querySelectorAll(`[id^="opt-${i}-"]`).forEach(el=>{ el.style.cursor='default'; el.onclick=null; });
        if(parseInt(ans.val)===s.jawabanBenar) {
          benar++;
          document.getElementById(`opt-${i}-${ans.val}`)?.classList.add('correct');
        } else {
          document.getElementById(`opt-${i}-${ans.val}`)?.classList.add('wrong');
          document.getElementById(`opt-${i}-${s.jawabanBenar}`)?.classList.add('correct');
        }
      }
    });

    const pgSoal = soal.filter(s=>s.type==='pg').length;
    const score  = pgSoal>0 ? Math.round(benar/pgSoal*100) : null;
    const msgs   = [{min:90,text:'🎉 Luar biasa! Sempurna!'},{min:75,text:'👏 Sangat bagus!'},{min:60,text:'👍 Bagus, terus belajar.'},{min:0,text:'📚 Jangan menyerah!'}];
    const msg    = score!==null ? msgs.find(m=>score>=m.min).text : '📝 Jawaban essay akan dinilai oleh guru.';

    await SmartAPI.save('addHasilKuis',{nama:State.user.nama,namaKuis:k.judul,mapel:k.mapel||'',benar,pgSoal,score:score||0,waktu:new Date().toISOString()});

    const root = document.getElementById('kuis-siswa-root');
    const prev = root.querySelector('.kuis-kerja-wrap');
    if(prev) {
      const resultEl = document.createElement('div');
      resultEl.innerHTML = `<div class="kuis-result">
        ${score!==null?`<div class="kuis-result-score">${score}</div>
        <div class="kuis-result-sub">${benar} dari ${pgSoal} soal PG benar</div>`
        :`<div style="font-size:56px;line-height:1">✅</div>
        <div class="kuis-result-sub">Jawaban essay terkirim</div>`}
        <div class="kuis-result-msg">${msg}</div>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:24px">
          <button class="btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="KuisSiswa.renderGrid()">
            <i class="fa-solid fa-arrow-left"></i> Kembali ke Daftar Kuis
          </button>
        </div>
      </div>`;
      prev.appendChild(resultEl);
    }
    Toast[score>=75?'success':'info']('Kuis selesai!', score!==null?`Skor PG: ${score}`:'Jawaban essay dikirim.');
  },
};

// ══════════════════════════════════════════════════════════════
// APP CONTROLLER
// ══════════════════════════════════════════════════════════════
const App = {
  async login() {
    const username = document.getElementById('inp-username').value.trim();
    const password = document.getElementById('inp-password').value.trim();
    document.getElementById('login-error').classList.add('hidden');
    if(!username||!password){ this._err('Username dan password tidak boleh kosong.'); return; }

    const btn = document.getElementById('btn-login');
    btn.disabled=true;
    btn.innerHTML=`<span class="spinner-sm"></span> Memverifikasi...`;

    const res = await SmartAPI.login(username,password);
    if(res.success&&res.user){
      State.user=res.user;
      localStorage.setItem('lms_session',JSON.stringify(res.user));
      await this._init();
    } else {
      btn.disabled=false;
      btn.innerHTML=`<span>Masuk</span><i class="fa-solid fa-arrow-right"></i>`;
      this._err(res.message||'Username atau password salah.');
    }
  },
  _err(msg){ document.getElementById('login-error-msg').textContent=msg; document.getElementById('login-error').classList.remove('hidden'); },

  async _init() {
    Loader.show();
    const [rM,rT,rJ,rN,rF,rK,rH,rA,rAS,rZ] = await Promise.all([
      SmartAPI.getData('getMateri'),
      SmartAPI.getData('getTugas'),
      SmartAPI.getData('getJawaban'),
      SmartAPI.getData('getNilai'),
      SmartAPI.getData('getForum'),
      SmartAPI.getData('getKuisBank'),
      SmartAPI.getData('getHasilKuis'),
      SmartAPI.getData('getAbsensi'),
      SmartAPI.getData('getAbsensiSiswa'),
      SmartAPI.getData('getZoom'),
    ]);
    State.materi       = rM.data||[];
    State.tugas        = rT.data||[];
    State.jawaban      = rJ.data||[];
    State.nilai        = rN.data||[];
    State.forum        = rF.data||[];
    State.kuis         = rK.data||[];
    State.hasilKuis    = rH.data||[];
    State.absensi      = rA.data||[];
    State.absensiSiswa = rAS.data||[];
    State.zoom         = rZ.data||[];
    Loader.hide();

    this._sidebar();
    this._topbar();
    document.getElementById('pg-login').classList.add('hidden');
    document.getElementById('pg-app').classList.remove('hidden');
    Router.go('dashboard');
    Toast.success(`Selamat datang, ${State.user.nama.split(' ')[0]}!`,'Berhasil masuk ke Akademi LMS.');
  },

  _sidebar() {
    const u=State.user;
    document.getElementById('sb-avatar').textContent    = H.av(u.nama);
    document.getElementById('sb-user-name').textContent = u.nama;
    const rl={admin:'Administrator',guru:'Guru',siswa:'Siswa'};
    document.getElementById('sb-user-role').textContent = rl[u.role]||u.role;
    const menu = NAV[u.role]||NAV.siswa;
    document.getElementById('sb-nav').innerHTML =
      `<div class="sb-nav-section">Menu Utama</div>`+
      menu.map(m=>`<div class="sb-nav-item" id="nav-${m.id}" onclick="Router.go('${m.id}')">
        <div class="nav-icon"><i class="fa-solid ${m.icon}"></i></div>
        <span>${m.label}</span>
      </div>`).join('');
  },

  _topbar() {
    const upd=()=>{ document.getElementById('topbar-date').textContent=new Date().toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'}); };
    upd(); setInterval(upd,60000);
  },

  logout() {
    if(!confirm('Yakin ingin keluar dari Akademi LMS?')) return;
    localStorage.removeItem('lms_session');
    State.user=null;
    document.getElementById('pg-app').classList.add('hidden');
    document.getElementById('pg-login').classList.remove('hidden');
    document.getElementById('inp-username').value='';
    document.getElementById('inp-password').value='';
    const btn=document.getElementById('btn-login');
    btn.disabled=false;
    btn.innerHTML=`<span>Masuk</span><i class="fa-solid fa-arrow-right"></i>`;
    Toast.info('Berhasil keluar','Sampai jumpa!');
  },

  showLogin() {
    document.getElementById('pg-login').classList.remove('hidden');
    document.getElementById('pg-register').classList.add('hidden');
    document.getElementById('inp-username').focus();
  },

  showRegister() {
    document.getElementById('pg-login').classList.add('hidden');
    document.getElementById('pg-register').classList.remove('hidden');
    document.getElementById('register-error').classList.add('hidden');
    document.getElementById('reg-role').focus();
  },

  async register() {
    const role = document.getElementById('reg-role').value.trim();
    const nama = document.getElementById('reg-nama').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const password2 = document.getElementById('reg-password2').value.trim();

    document.getElementById('register-error').classList.add('hidden');

    // Validasi
    if(!role) {
      this._regErr('Pilih peran Anda terlebih dahulu.');
      return;
    }
    if(!nama||nama.length<3) {
      this._regErr('Nama harus minimal 3 karakter.');
      return;
    }
    if(!username||username.length<3) {
      this._regErr('Username harus minimal 3 karakter.');
      return;
    }
    if(!password||password.length<6) {
      this._regErr('Password harus minimal 6 karakter.');
      return;
    }
    if(password!==password2) {
      this._regErr('Password dan konfirmasi password tidak cocok.');
      return;
    }

    const btn = document.getElementById('btn-register');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-sm"></span> Mendaftarkan...`;

    const res = await SmartAPI.register(username, password, role, nama);
    if(res.success) {
      Toast.success('Berhasil terdaftar!','Silakan masuk dengan akun baru Anda.');
      setTimeout(() => {
        this.showLogin();
        document.getElementById('inp-username').value = username;
        document.getElementById('inp-password').value = '';
        btn.disabled = false;
        btn.innerHTML = `<span>Daftar</span><i class="fa-solid fa-arrow-right"></i>`;
        document.getElementById('reg-role').value = '';
        document.getElementById('reg-nama').value = '';
        document.getElementById('reg-username').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-password2').value = '';
      }, 1500);
    } else {
      btn.disabled = false;
      btn.innerHTML = `<span>Daftar</span><i class="fa-solid fa-arrow-right"></i>`;
      this._regErr(res.message||'Pendaftaran gagal. Coba lagi.');
    }
  },

  _regErr(msg){
    document.getElementById('register-error-msg').textContent = msg;
    document.getElementById('register-error').classList.remove('hidden');
  },
};

// ══════════════════════════════════════════════════════════════
// ABSENSI GURU MODULE
// ══════════════════════════════════════════════════════════════
const AbsensiGuru = {
  async tambah() {
    const judul = document.getElementById('abs-judul').value.trim();
    const mapel = document.getElementById('abs-mapel').value.trim();
    const tgl   = document.getElementById('abs-tgl').value.trim();
    const jam   = document.getElementById('abs-jam').value.trim();

    if(!judul) { Toast.error('Gagal','Judul absensi wajib diisi.'); return; }

    const res = await SmartAPI.save('addAbsensi',{judul,mapel,tgl,jam,pembuat:State.user.nama});
    if(res.success) {
      Toast.success('Berhasil','Absensi dibuat.');
      document.getElementById('abs-judul').value = '';
      document.getElementById('abs-mapel').value = '';
      document.getElementById('abs-tgl').value = '';
      document.getElementById('abs-jam').value = '';
      const r = await SmartAPI.getData('getAbsensi');
      State.absensi = r.data||[];
      Render._absensiGuru();
    } else {
      Toast.error('Gagal',res.message||'Gagal membuat absensi.');
    }
  },

  async edit(id) {
    const abs = State.absensi.find(a=>a.id===id);
    if(!abs) return;
    const judul = prompt('Edit Judul:', abs.judul);
    if(judul===null) return;
    const res = await SmartAPI.save('updateAbsensi',{id,judul});
    if(res.success) {
      Toast.success('Berhasil','Absensi diperbarui.');
      const r = await SmartAPI.getData('getAbsensi');
      State.absensi = r.data||[];
      Render._absensiGuru();
    }
  },

  async delete(id) {
    if(!confirm('Hapus absensi ini?')) return;
    const res = await SmartAPI.save('deleteAbsensi',{id});
    if(res.success) {
      Toast.success('Berhasil','Absensi dihapus.');
      const r = await SmartAPI.getData('getAbsensi');
      State.absensi = r.data||[];
      Render._absensiGuru();
    }
  },
};

// ══════════════════════════════════════════════════════════════
// ABSENSI SISWA MODULE
// ══════════════════════════════════════════════════════════════
const AbsensiSiswa = {
  async absen(absensiId) {
    const res = await SmartAPI.save('addAbsensiSiswa',{absensiId,nama:State.user.nama});
    if(res.success) {
      Toast.success('Berhasil','Absensi dicatat.');
      const r = await SmartAPI.getData('getAbsensiSiswa');
      State.absensiSiswa = r.data||[];
      Render._absensiSiswa();
    } else {
      Toast.error('Gagal',res.message||'Gagal absen.');
    }
  },
};

// ══════════════════════════════════════════════════════════════
// ZOOM GURU MODULE
// ══════════════════════════════════════════════════════════════
const ZoomGuru = {
  async tambah() {
    const judul = document.getElementById('zoom-judul').value.trim();
    const mapel = document.getElementById('zoom-mapel').value.trim();
    const linkZoom = document.getElementById('zoom-link').value.trim();

    if(!judul) { Toast.error('Gagal','Judul zoom wajib diisi.'); return; }
    if(!linkZoom) { Toast.error('Gagal','Link zoom wajib diisi.'); return; }

    const res = await SmartAPI.save('addZoom',{judul,mapel,linkZoom,pembuat:State.user.nama});
    if(res.success) {
      Toast.success('Berhasil','Zoom ditambahkan.');
      document.getElementById('zoom-judul').value = '';
      document.getElementById('zoom-mapel').value = '';
      document.getElementById('zoom-link').value = '';
      const r = await SmartAPI.getData('getZoom');
      State.zoom = r.data||[];
      Render._zoomGuru();
    } else {
      Toast.error('Gagal',res.message||'Gagal membuat zoom.');
    }
  },

  async edit(id) {
    const zoom = State.zoom.find(z=>z.id===id);
    if(!zoom) return;
    const judul = prompt('Edit Judul:', zoom.judul);
    if(judul===null) return;
    const res = await SmartAPI.save('updateZoom',{id,judul});
    if(res.success) {
      Toast.success('Berhasil','Zoom diperbarui.');
      const r = await SmartAPI.getData('getZoom');
      State.zoom = r.data||[];
      Render._zoomGuru();
    }
  },

  async delete(id) {
    if(!confirm('Hapus zoom ini?')) return;
    const res = await SmartAPI.save('deleteZoom',{id});
    if(res.success) {
      Toast.success('Berhasil','Zoom dihapus.');
      const r = await SmartAPI.getData('getZoom');
      State.zoom = r.data||[];
      Render._zoomGuru();
    }
  },
};

// ── GLOBAL HELPERS ──────────────────────────────────────────
function togglePassword() {
  const inp=document.getElementById('inp-password');
  const ico=document.getElementById('eye-icon');
  if(inp.type==='password'){ inp.type='text'; ico.className='fa-regular fa-eye-slash'; }
  else { inp.type='password'; ico.className='fa-regular fa-eye'; }
}

function toggleRegisterPassword(field) {
  const fieldMap = {1:{inp:'reg-password',ico:'eye-icon-pass1'},2:{inp:'reg-password2',ico:'eye-icon-pass2'}};
  const ids = fieldMap[field]||fieldMap[1];
  const inp = document.getElementById(ids.inp);
  const ico = document.getElementById(ids.ico);
  if(inp.type==='password'){ inp.type='text'; ico.className='fa-regular fa-eye-slash'; }
  else { inp.type='password'; ico.className='fa-regular fa-eye'; }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('hidden');
}

// ── BOOT ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>Loader.hide(), 1400);
  setTimeout(()=>{
    const saved=localStorage.getItem('lms_session');
    if(saved){ try{ State.user=JSON.parse(saved); App._init(); }catch{ localStorage.removeItem('lms_session'); } }
  },1500);
});
document.addEventListener('click',e=>{ if(e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden'); });