// ===== KONFIGURASI API =====
const API_BASE = 'https://madrasahku-topaz.vercel.app/api';

// ===== APP STATE =====
let appData = {
  currentUser: null,
  currentRole: 'siswa',
  token: null,
  materi: [],
  soalPretest: [],
  dataSiswa: []
};

let pretestState = {
  soalList: [], currentIndex: 0, answers: {}, kelas: '1', mapel: 'Matematika'
};

// =============================================
// HELPER: Fetch dengan Auth Token
// =============================================
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (appData.token) headers['Authorization'] = `Bearer ${appData.token}`;
  const res = await fetch(API_BASE + path, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Terjadi kesalahan');
  return json;
}

// =============================================
// INIT
// =============================================
window.addEventListener('DOMContentLoaded', () => {
  // Cek dulu apakah URL mengandung ?token= (link reset password)
  if (checkResetToken()) return;

  setTimeout(() => {
    document.getElementById('splash-screen').style.display = 'none';
    showPage('page-login');
    updateGreeting();
  }, 3000);
  setInterval(updateTopbarDate, 1000);
  updateTopbarDate();
});

function updateGreeting() {
  const hour = new Date().getHours();
  let g = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
  const el = document.getElementById('hero-greeting');
  if (el) el.textContent = g + '!';
}

// =============================================
// BERANDA STATS
// =============================================
async function loadBerandaStats() {
  try {
    const [materi, soal] = await Promise.all([
      apiFetch('/materi'),
      apiFetch('/soal')
    ]);
    const elMateri = document.getElementById('hero-stat-materi');
    const elSoal   = document.getElementById('hero-stat-soal');
    if (elMateri) elMateri.textContent = materi.length;
    if (elSoal)   elSoal.textContent   = soal.length;
    for (let k = 1; k <= 6; k++) {
      const count = materi.filter(m => m.kelas === k || m.kelas === String(k)).length;
      const el = document.getElementById(`count-kelas-${k}`);
      if (el) el.textContent = count > 0 ? count : '0';
    }
  } catch (err) {
    for (let k = 1; k <= 6; k++) {
      const el = document.getElementById(`count-kelas-${k}`);
      if (el) el.textContent = '-';
    }
  }
}

// =============================================
// PROFIL SEKOLAH
// =============================================
async function loadProfilSekolah() {
  try {
    const profil = await apiFetch('/profil');
    renderProfilSekolah(profil);
  } catch (err) {
    try {
      const profil = await apiFetch('/sekolah');
      renderProfilSekolah(profil);
    } catch (err2) {
      console.warn('Endpoint profil tidak tersedia:', err2.message);
    }
  }
}

function renderProfilSekolah(p) {
  if (!p) return;
  const setId = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.textContent = val; };
  setId('profil-nama-hero', p.nama || p.nama_sekolah);
  setId('profil-sub-hero', p.sub || p.deskripsi || '');
  setId('profil-tagline-hero', p.tagline ? `"${p.tagline}"` : '');
  setId('profil-nama-sekolah', p.nama || p.nama_sekolah);
  setId('profil-npsn', p.npsn);
  setId('profil-status', p.status);
  setId('profil-akreditasi', p.akreditasi);
  setId('profil-tahun', p.tahun_berdiri);
  setId('profil-kepsek', p.kepala_sekolah);
  setId('profil-alamat', p.alamat);
  setId('profil-kelurahan', p.kelurahan);
  setId('profil-kecamatan', p.kecamatan);
  setId('profil-kota', p.kota);
  setId('profil-telp', p.telepon || p.telp);
  setId('profil-email', p.email);
  setId('profil-visi', p.visi);
  const misiEl = document.getElementById('profil-misi-list');
  if (misiEl && p.misi) {
    const misiArr = Array.isArray(p.misi) ? p.misi : p.misi.split('\n').filter(Boolean);
    misiEl.innerHTML = misiArr.map(m => `<li>${m}</li>`).join('');
  }
  setId('profil-stat-siswa',    p.jumlah_siswa  || p.stat_siswa);
  setId('profil-stat-guru',     p.jumlah_guru   || p.tenaga_pendidik || p.stat_guru);
  setId('profil-stat-kelas',    p.jumlah_kelas  || p.ruang_kelas     || p.stat_kelas);
  setId('profil-stat-prestasi', p.prestasi      || p.jumlah_prestasi  || p.stat_prestasi);
  const fasEl = document.getElementById('profil-fasilitas-grid');
  if (fasEl && p.fasilitas && Array.isArray(p.fasilitas) && p.fasilitas.length > 0) {
    const icons = {
      'Lab Komputer':'laptop','Perpustakaan':'book','Mushola':'pray',
      'Lab IPA':'flask','Lapangan':'futbol','Kantin':'utensils',
      'UKS':'medkit','Parkir':'parking'
    };
    fasEl.innerHTML = p.fasilitas.map(f => {
      const iconKey = Object.keys(icons).find(k => f.includes(k)) || '';
      const icon    = iconKey ? `fas fa-${icons[iconKey]}` : 'fas fa-check';
      return `<div class="fas-item"><i class="${icon}"></i> ${f}</div>`;
    }).join('');
  }
}

function updateTopbarDate() {
  const el = document.getElementById('topbar-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('id-ID', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });
}

// =============================================
// PAGE MANAGEMENT
// =============================================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// =============================================
// LOGIN
// =============================================
let selectedRole = 'siswa';
function selectRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-role="${role}"]`).classList.add('active');
}

async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errEl    = document.getElementById('login-error');
  errEl.classList.add('hidden');

  try {
    const res = await apiFetch('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.user.role !== selectedRole) {
      document.getElementById('login-error-msg').textContent =
        `Akun ini adalah ${res.user.role}, bukan ${selectedRole}`;
      errEl.classList.remove('hidden');
      return;
    }
    appData.token       = res.token;
    appData.currentUser = res.user;

    if (res.user.role === 'siswa') {
      document.getElementById('siswa-name-display').textContent = res.user.nama;
      document.getElementById('hero-name').textContent = `Halo, ${res.user.nama}! 👋`;
      showPage('app-siswa');
      showSiswaSection('beranda');
      updateGreeting();
      loadBerandaStats();
      loadProgressWidget();       // ← progress tracking
    } else {
      document.getElementById('guru-name-display').textContent = res.user.nama;
      document.getElementById('admin-welcome-name').textContent = `Selamat Datang, ${res.user.nama}! 👋`;
      showPage('app-guru');
      showAdminSection('dashboard');
    }
  } catch (err) {
    document.getElementById('login-error-msg').textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

function doLogout() {
  clearProgressWidget();          // ← bersihkan widget
  appData.currentUser = null;
  appData.token       = null;
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  showPage('page-login');
}

// =============================================
// TOGGLE SHOW / HIDE PASSWORD
// =============================================
function togglePw(inputId, btn) {
  const input  = document.getElementById(inputId);
  const isHide = input.type === 'password';
  input.type   = isHide ? 'text' : 'password';
  btn.innerHTML = isHide
    ? '<i class="fas fa-eye-slash"></i>'
    : '<i class="fas fa-eye"></i>';
}

// =============================================
// LUPA PASSWORD — Step 1 (request token)
// =============================================
function showModalLupa() {
  // Reset ke step 1
  document.getElementById('lupa-step-1').classList.remove('hidden');
  document.getElementById('lupa-step-2').classList.add('hidden');
  document.getElementById('lupa-error').classList.add('hidden');
  document.getElementById('lupa-username').value = '';
  const btn = document.getElementById('btn-lupa-kirim');
  btn.disabled  = false;
  btn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Permintaan';
  document.getElementById('modal-lupa').classList.remove('hidden');
  setTimeout(() => document.getElementById('lupa-username').focus(), 100);
}

async function submitLupaPassword() {
  const username = document.getElementById('lupa-username').value.trim();
  const errEl    = document.getElementById('lupa-error');
  errEl.classList.add('hidden');

  if (!username) {
    document.getElementById('lupa-error-msg').textContent = 'Username harus diisi!';
    errEl.classList.remove('hidden');
    return;
  }

  const btn     = document.getElementById('btn-lupa-kirim');
  btn.disabled  = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

  try {
    const res = await apiFetch('/auth/lupa-password', {
      method: 'POST',
      body  : JSON.stringify({ username })
    });

    // Tampilkan step 2 sukses
    document.getElementById('lupa-step-1').classList.add('hidden');
    document.getElementById('lupa-step-2').classList.remove('hidden');

    // Jika server kembalikan resetUrl (mode dev), tampilkan di UI
    if (res.resetUrl) {
      document.getElementById('lupa-reset-url').textContent  = res.resetUrl;
      document.getElementById('lupa-reset-link-box').classList.remove('hidden');
      window._lupaResetUrl = res.resetUrl;
    }

  } catch (err) {
    document.getElementById('lupa-error-msg').textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Permintaan';
  }
}

function copyResetLink() {
  const url = window._lupaResetUrl;
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    showToast('✅ Link berhasil disalin!');
  }).catch(() => {
    // Fallback manual
    const el       = document.createElement('textarea');
    el.value       = url;
    el.style.position = 'fixed';
    el.style.opacity  = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('✅ Link berhasil disalin!');
  });
}

// =============================================
// RESET PASSWORD — dari link ?token= di URL
// =============================================
function checkResetToken() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');
  if (!token) return false;

  // Simpan token di memory
  window._resetToken = token;

  // Langsung ke halaman reset, bypass splash
  document.getElementById('splash-screen').style.display = 'none';
  showPage('page-reset');

  // Bersihkan token dari URL (supaya tidak bisa di-refresh ulang)
  window.history.replaceState({}, document.title, window.location.pathname);
  return true;
}

async function submitResetPassword() {
  const pw1   = document.getElementById('reset-pw1').value;
  const pw2   = document.getElementById('reset-pw2').value;
  const errEl = document.getElementById('reset-error');
  errEl.classList.add('hidden');

  if (pw1.length < 6) {
    document.getElementById('reset-error-msg').textContent = 'Kata sandi minimal 6 karakter!';
    errEl.classList.remove('hidden');
    return;
  }
  if (pw1 !== pw2) {
    document.getElementById('reset-error-msg').textContent = 'Kata sandi tidak cocok!';
    errEl.classList.remove('hidden');
    return;
  }

  const btn     = document.getElementById('btn-reset-submit');
  btn.disabled  = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

  try {
    await apiFetch('/auth/reset-password', {
      method: 'POST',
      body  : JSON.stringify({ token: window._resetToken, newPassword: pw1 })
    });

    document.getElementById('reset-form-wrap').classList.add('hidden');
    document.getElementById('reset-success-wrap').classList.remove('hidden');

  } catch (err) {
    // Jika token expired/invalid, tampilkan halaman error khusus
    if (err.message.includes('kadaluarsa') || err.message.includes('tidak valid')) {
      document.getElementById('reset-form-wrap').classList.add('hidden');
      document.getElementById('reset-invalid-wrap').classList.remove('hidden');
    } else {
      document.getElementById('reset-error-msg').textContent = err.message;
      errEl.classList.remove('hidden');
      btn.disabled  = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan Kata Sandi Baru';
    }
  }
}

function goToLogin() {
  document.getElementById('reset-form-wrap').classList.remove('hidden');
  document.getElementById('reset-success-wrap').classList.add('hidden');
  document.getElementById('reset-invalid-wrap').classList.add('hidden');
  document.getElementById('reset-pw1').value = '';
  document.getElementById('reset-pw2').value = '';
  showPage('page-login');
}

// =============================================
// SISWA NAVIGATION
// =============================================
function showSiswaSection(name) {
  document.querySelectorAll('.siswa-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`sec-${name}`).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const mapping = { beranda:0, materi:1, pretest:2, 'profil-sekolah':3 };
  const items   = document.querySelectorAll('.nav-item');
  if (items[mapping[name]]) items[mapping[name]].classList.add('active');
  if (name === 'materi')         filterKelas(1);
  if (name === 'pretest')        loadPretestSoal();
  if (name === 'profil-sekolah') loadProfilSekolah();
  if (name === 'beranda')        loadProgressWidget();
  window.scrollTo({ top:0, behavior:'smooth' });
}

function toggleMobileNav() {
  document.getElementById('mobile-menu').classList.toggle('hidden');
}

// =============================================
// PROGRESS TRACKING — localStorage engine
// =============================================
function _pgKey(suffix) {
  const u = appData.currentUser?.username || appData.currentUser?.nama || 'guest';
  return `mkprogress:${u}:${suffix}`;
}
function markMateriDibuka(materiId) {
  try { localStorage.setItem(_pgKey(`materi:${materiId}`), 'true'); } catch(e) {}
}
function markBahanDibuka(materiId, bahanUrl) {
  try {
    localStorage.setItem(_pgKey(`bahan:${materiId}:${bahanUrl}`), 'true');
    const m = appData.materi.find(x => x.id === materiId);
    if (m) {
      const semuaDibuka = m.bahan.every(b =>
        localStorage.getItem(_pgKey(`bahan:${materiId}:${b.url || '#'}`)) === 'true'
      );
      if (semuaDibuka) localStorage.setItem(_pgKey(`selesai:${materiId}`), 'true');
    }
  } catch(e) {}
}
function isMateriDibuka(materiId) {
  return localStorage.getItem(_pgKey(`materi:${materiId}`)) === 'true';
}
function isMateriSelesai(materiId) {
  return localStorage.getItem(_pgKey(`selesai:${materiId}`)) === 'true';
}
function isBahanDibuka(materiId, bahanUrl) {
  return localStorage.getItem(_pgKey(`bahan:${materiId}:${bahanUrl || '#'}`)) === 'true';
}
function getProgressKelas(kelas, semua) {
  const items   = semua.filter(m => String(m.kelas) === String(kelas));
  const total   = items.length;
  if (!total) return { total:0, selesai:0, pct:0 };
  const selesai = items.filter(m => isMateriSelesai(m.id)).length;
  return { total, selesai, pct: Math.round((selesai / total) * 100) };
}
function clearProgressWidget() {
  const el = document.getElementById('progress-widget');
  if (el) el.innerHTML = '';
}
async function loadProgressWidget() {
  const el = document.getElementById('progress-widget');
  if (!el) return;
  el.innerHTML = '<div class="pg-loading">⏳ Memuat progress...</div>';
  try {
    const semua = await apiFetch('/materi');
    const total   = semua.length;
    const selesai = semua.filter(m => isMateriSelesai(m.id)).length;
    const pct     = total > 0 ? Math.round((selesai / total) * 100) : 0;

    const kelasColors = { 1:'#FF6B35',2:'#FF8C42',3:'#4ECDC4',4:'#A55EEA',5:'#1E90FF',6:'#2ED573' };
    const kelasIcons  = { 1:'🌱',2:'🌿',3:'🌳',4:'⭐',5:'🌟',6:'🏆' };

    const barsHTML = [1,2,3,4,5,6].map(k => {
      const pg    = getProgressKelas(k, semua);
      const color = kelasColors[k];
      return `
        <div class="pg-bar-row">
          <div class="pg-bar-label">
            <span>${kelasIcons[k]} Kelas ${k}</span>
            <span class="pg-bar-stat">${pg.selesai}/${pg.total}</span>
          </div>
          <div class="pg-bar-track">
            <div class="pg-bar-fill" style="width:${pg.pct}%;background:${color}"></div>
          </div>
          <span class="pg-bar-pct" style="color:${color}">${pg.pct}%</span>
        </div>`;
    }).join('');

    const ringColor   = pct >= 80 ? '#2ED573' : pct >= 40 ? '#FF8C42' : '#1E90FF';
    const circumference = 2 * Math.PI * 30;
    const offset      = circumference - (pct / 100) * circumference;

    el.innerHTML = `
      <div class="pg-widget">
        <div class="pg-header">
          <div class="pg-title">📊 Progress Belajarku</div>
          <button class="pg-reset-btn" onclick="confirmResetProgress()" title="Reset progress">
            <i class="fas fa-trash-alt"></i> Reset
          </button>
        </div>
        <div class="pg-body">
          <div class="pg-ring-wrap">
            <svg class="pg-ring" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="30" class="pg-ring-bg"/>
              <circle cx="40" cy="40" r="30" class="pg-ring-fg"
                style="stroke:${ringColor};stroke-dasharray:${circumference};stroke-dashoffset:${offset}"/>
            </svg>
            <div class="pg-ring-text">
              <span class="pg-pct-big">${pct}%</span>
              <span class="pg-pct-sub">Selesai</span>
            </div>
          </div>
          <div class="pg-bars">${barsHTML}</div>
        </div>
        <div class="pg-footer">${selesai} dari ${total} materi selesai dipelajari</div>
      </div>`;
  } catch(err) {
    el.innerHTML = '<div class="pg-error">Gagal memuat progress</div>';
  }
}
function confirmResetProgress() {
  if (!confirm('Reset semua progress belajar kamu? Data tidak bisa dikembalikan.')) return;
  const u      = appData.currentUser?.username || appData.currentUser?.nama || 'guest';
  const prefix = `mkprogress:${u}:`;
  Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
  showToast('🔄 Progress berhasil direset!');
  loadProgressWidget();
  if (appData.materi.length) renderMateriCards(currentKelas);
}

// =============================================
// MATERI
// =============================================
let currentKelas = 1;

function openMateri(kelas) {
  showSiswaSection('materi');
  filterKelas(kelas);
}

async function filterKelas(kelas) {
  currentKelas = kelas;
  document.querySelectorAll('.kelas-tab').forEach((t, i) => {
    t.classList.toggle('active', i + 1 === kelas);
  });
  document.getElementById('detail-materi').classList.add('hidden');
  document.getElementById('materi-title').textContent    = `📖 Materi Kelas ${kelas}`;
  document.getElementById('materi-subtitle').textContent = `Pilih materi yang ingin kamu pelajari`;

  const grid = document.getElementById('materi-grid');
  grid.innerHTML = '<div class="loading-state">⏳ Memuat materi...</div>';
  try {
    const materi = await apiFetch(`/materi?kelas=${kelas}`);
    appData.materi = materi;
    renderMateriCards(kelas);
  } catch (err) {
    grid.innerHTML = `<div class="error-state">❌ Gagal memuat: ${err.message}</div>`;
  }
}

function renderMateriCards(kelas) {
  const grid  = document.getElementById('materi-grid');
  const items = appData.materi.filter(m => String(m.kelas) === String(kelas) || m.kelas === kelas);
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty-state">Belum ada materi untuk kelas ini.</div>';
    return;
  }
  grid.classList.remove('hidden');
  grid.innerHTML = items.map(m => {
    const pdfCount = m.bahan.filter(b => b.type === 'pdf').length;
    const vidCount = m.bahan.filter(b => b.type === 'video').length;
    const selesai  = isMateriSelesai(m.id);
    const dibuka   = isMateriDibuka(m.id);

    let statusBadge = '';
    if (selesai)     statusBadge = '<span class="mc-status-badge mc-done"><i class="fas fa-check-circle"></i> Selesai</span>';
    else if (dibuka) statusBadge = '<span class="mc-status-badge mc-ongoing"><i class="fas fa-clock"></i> Sedang Dibaca</span>';

    return `
    <div class="materi-card ${selesai ? 'materi-card-done' : ''}" onclick="openDetailMateri(${m.id})">
      <div class="mc-top">
        <div class="mc-icon">${m.icon}</div>
        <div class="mc-kelas-badge">Kelas ${m.kelas}</div>
      </div>
      <div class="mc-title">${m.judul}</div>
      <div class="mc-mapel"><i class="fas fa-tag"></i> ${m.mapel}</div>
      ${statusBadge}
      <div class="mc-bahan">
        ${pdfCount > 0 ? `<span class="bahan-chip pdf"><i class="fas fa-file-pdf"></i> ${pdfCount} PDF</span>` : ''}
        ${vidCount > 0 ? `<span class="bahan-chip video"><i class="fab fa-youtube"></i> ${vidCount} Video</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function openDetailMateri(id) {
  const m = appData.materi.find(x => x.id === id);
  if (!m) return;

  markMateriDibuka(id);   // tandai sudah dibuka

  document.getElementById('materi-grid').classList.add('hidden');
  const d = document.getElementById('detail-materi');
  d.classList.remove('hidden');
  document.getElementById('back-to-kelas').style.display = 'flex';
  document.getElementById('detail-icon').textContent        = m.icon;
  document.getElementById('detail-judul').textContent       = m.judul;
  document.getElementById('detail-kelas-badge').textContent = `Kelas ${m.kelas}`;
  document.getElementById('detail-mapel-badge').textContent = m.mapel;
  document.getElementById('detail-desc').textContent        = m.desc;

  // Progress bar bahan
  _renderDetailProgressBar(m);

  // Daftar bahan dengan status sudah/belum
  const bahanEl = document.getElementById('bahan-list');
  bahanEl.innerHTML = m.bahan.map(b => {
    const icon      = b.type === 'pdf' ? '📄' : '▶️';
    const typeLabel = b.type === 'pdf' ? 'Dokumen PDF' : 'Video YouTube';
    const btnLabel  = b.type === 'pdf' ? 'Buka PDF'   : 'Tonton Video';
    const sudah     = isBahanDibuka(m.id, b.url || '#');
    const safeUrl   = (b.url || '#').replace(/'/g, "\\'");

    return `
    <div class="bahan-item ${sudah ? 'bahan-sudah' : ''}" id="bi-${m.id}-${_safeId(b.url)}">
      <div class="bahan-type-icon">${icon}</div>
      <div class="bahan-info">
        <div class="bahan-name">${b.name}</div>
        <div class="bahan-type">${typeLabel}</div>
      </div>
      ${sudah ? '<span class="bahan-done-badge"><i class="fas fa-check-circle"></i> Sudah dibuka</span>' : ''}
      <button class="bahan-open-btn ${sudah ? 'bahan-open-done' : ''}"
              onclick="openBahan('${safeUrl}','${b.type}','${b.name}',${m.id})">
        <i class="fas fa-${b.type === 'pdf' ? 'file-pdf' : 'play'}"></i> ${btnLabel}
      </button>
    </div>`;
  }).join('');
}

function _safeId(url) {
  return (url || '#').replace(/[^a-zA-Z0-9]/g, '_');
}

function _renderDetailProgressBar(m) {
  const pgBar  = document.getElementById('detail-progress-bar');
  if (!pgBar) return;
  const selesai = isMateriSelesai(m.id);
  const dibuka  = m.bahan.filter(b => isBahanDibuka(m.id, b.url || '#')).length;
  const pct     = m.bahan.length > 0 ? Math.round((dibuka / m.bahan.length) * 100) : 0;
  pgBar.innerHTML = `
    <div class="detail-pg-bar">
      <div class="detail-pg-label">
        <span>${selesai ? '✅ Semua bahan selesai!' : `📂 ${dibuka} dari ${m.bahan.length} bahan dibuka`}</span>
        <span class="detail-pg-pct">${pct}%</span>
      </div>
      <div class="detail-pg-track">
        <div class="detail-pg-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
}

function openBahan(url, type, name, materiId) {
  if (materiId) {
    markBahanDibuka(materiId, url);

    // Update item bahan tanpa reload
    const itemEl = document.getElementById(`bi-${materiId}-${_safeId(url)}`);
    if (itemEl) {
      itemEl.classList.add('bahan-sudah');
      if (!itemEl.querySelector('.bahan-done-badge')) {
        const badge = document.createElement('span');
        badge.className = 'bahan-done-badge';
        badge.innerHTML = '<i class="fas fa-check-circle"></i> Sudah dibuka';
        itemEl.querySelector('.bahan-open-btn').before(badge);
      }
      itemEl.querySelector('.bahan-open-btn').classList.add('bahan-open-done');
    }

    // Refresh progress bar detail
    const m = appData.materi.find(x => x.id === materiId);
    if (m) _renderDetailProgressBar(m);

    // Refresh widget beranda
    loadProgressWidget();
  }
  if (url === '#') {
    showToast(`📄 Membuka: ${name} (Demo - file tidak tersedia)`);
  } else {
    window.open(url, '_blank');
  }
}

function showKelasGrid() {
  document.getElementById('detail-materi').classList.add('hidden');
  document.getElementById('materi-grid').classList.remove('hidden');
  document.getElementById('back-to-kelas').style.display = 'none';
  renderMateriCards(currentKelas);
}

// =============================================
// PRETEST SISWA
// =============================================
async function loadPretestSoal() {
  const kelas = document.getElementById('pt-kelas-sel').value;
  const mapel = document.getElementById('pt-mapel-sel').value;
  const prev  = document.getElementById('pretest-preview');
  prev.innerHTML = '<div class="pretest-loading">⏳ Memuat soal...</div>';
  try {
    const soal = await apiFetch(`/soal?kelas=${kelas}&mapel=${encodeURIComponent(mapel)}`);
    appData.soalPretest = soal;
    if (soal.length === 0) {
      prev.innerHTML = `<div class="pretest-empty"><i class="fas fa-info-circle"></i> Belum ada soal untuk Kelas ${kelas} - ${mapel}</div>`;
    } else {
      prev.innerHTML = `<div class="pretest-ready"><i class="fas fa-check-circle"></i> ${soal.length} soal tersedia. Siap mengerjakan?</div>`;
    }
  } catch (err) {
    prev.innerHTML = `<div class="pretest-error">❌ ${err.message}</div>`;
  }
}

function startPretest() {
  const kelas = document.getElementById('pt-kelas-sel').value;
  const mapel = document.getElementById('pt-mapel-sel').value;
  const soal  = appData.soalPretest.filter(s => s.kelas === kelas && s.mapel === mapel);
  if (soal.length === 0) { showToast('⚠️ Tidak ada soal!'); return; }
  pretestState = { soalList:soal, currentIndex:0, answers:{}, kelas, mapel };
  document.getElementById('pretest-selector').classList.add('hidden');
  document.getElementById('pretest-soal').classList.remove('hidden');
  renderSoal();
}

function renderSoal() {
  const { soalList, currentIndex } = pretestState;
  const s     = soalList[currentIndex];
  const total = soalList.length;

  document.getElementById('pt-soal-counter').textContent = `Soal ${currentIndex + 1} / ${total}`;
  document.getElementById('soal-number').textContent     = `Soal ${currentIndex + 1}`;
  document.getElementById('soal-text').textContent       = s.pertanyaan;
  document.getElementById('pt-progress-fill').style.width = `${((currentIndex + 1) / total) * 100}%`;

  const opts   = ['A','B','C','D'];
  const labels = [s.a, s.b, s.c, s.d];
  document.getElementById('soal-options').innerHTML = opts.map((opt, i) => `
    <button class="option-btn ${pretestState.answers[s.id] === opt ? 'selected' : ''}"
      onclick="pilihJawaban('${opt}', this)">
      <span class="opt-label">${opt}</span> ${labels[i]}
    </button>`).join('');

  document.getElementById('btn-prev').disabled = currentIndex === 0;
  const isLast = currentIndex === total - 1;
  document.getElementById('btn-next').classList.toggle('hidden', isLast);
  document.getElementById('btn-submit').classList.toggle('hidden', !isLast);
}

function pilihJawaban(opt, el) {
  const s = pretestState.soalList[pretestState.currentIndex];
  pretestState.answers[s.id] = opt;
  document.querySelectorAll('#soal-options .option-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function prevSoal() {
  if (pretestState.currentIndex > 0) { pretestState.currentIndex--; renderSoal(); }
}

function nextSoal() {
  const { soalList, currentIndex } = pretestState;
  if (currentIndex < soalList.length - 1) { pretestState.currentIndex++; renderSoal(); }
  else submitPretest();
}

async function submitPretest() {
  const { soalList, answers, kelas, mapel } = pretestState;
  let benar = 0, skip = 0;
  soalList.forEach(s => {
    if (!answers[s.id])                    skip++;
    else if (answers[s.id] === s.jawaban) benar++;
  });
  const salah = soalList.length - benar - skip;
  const nilai  = Math.round((benar / soalList.length) * 100);

  document.getElementById('pretest-soal').classList.add('hidden');
  document.getElementById('pretest-hasil').classList.remove('hidden');

  let icon, title, fb, fbClass;
  if (nilai >= 80) {
    icon='🏆'; title='Luar Biasa!';
    fb='Nilai kamu sangat bagus! Terus belajar ya!'; fbClass='feedback-success';
  } else if (nilai >= 60) {
    icon='⭐'; title='Bagus!';
    fb='Nilai kamu sudah lumayan. Perlu sedikit lagi belajar!'; fbClass='feedback-warning';
  } else {
    icon='💪'; title='Semangat!';
    fb='Nilai kamu perlu ditingkatkan. Baca materi dulu ya!'; fbClass='feedback-danger';
  }

  document.getElementById('hasil-icon').textContent  = icon;
  document.getElementById('hasil-title').textContent = title;
  document.getElementById('hasil-detail').textContent = `${benar} benar dari ${soalList.length} soal`;
  const fbEl = document.getElementById('hasil-feedback');
  fbEl.textContent = fb; fbEl.className = `hasil-feedback ${fbClass}`;

  document.getElementById('hs-benar').textContent = benar;
  document.getElementById('hs-salah').textContent = salah;
  document.getElementById('hs-skip').textContent  = skip;

  animateSkorRing(nilai);
  animateNilai(nilai);

  // Reset state pembahasan
  document.getElementById('pembahasan-list').classList.add('hidden');
  document.getElementById('btn-toggle-pembahasan').innerHTML =
    '<i class="fas fa-book-open"></i> Lihat Pembahasan Soal ' +
    '<i class="fas fa-chevron-down toggle-chevron" id="toggle-chevron"></i>';

  renderPembahasan(soalList, answers);

  try {
    await apiFetch('/hasil', {
      method: 'POST',
      body: JSON.stringify({
        nama_siswa: appData.currentUser?.nama || 'Anonim',
        kelas, mapel, nilai, jumlah_benar:benar, jumlah_soal:soalList.length
      })
    });
  } catch (err) { console.warn('Gagal simpan hasil:', err.message); }
}

function animateSkorRing(nilai) {
  const circle = document.getElementById('ring-fill-circle');
  if (!circle) return;
  const r = 52, circ = 2 * Math.PI * r;
  circle.style.strokeDasharray  = circ;
  circle.style.strokeDashoffset = circ;
  circle.style.stroke = nilai >= 80 ? '#2ED573' : nilai >= 60 ? '#FF8C42' : '#FF4757';
  requestAnimationFrame(() => {
    circle.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)';
    circle.style.strokeDashoffset = circ - (nilai / 100) * circ;
  });
}

function animateNilai(target) {
  const el = document.getElementById('hasil-score');
  if (!el) return;
  let cur = 0;
  const step = Math.ceil(target / 40);
  const t = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(t); }
    el.textContent = cur;
  }, 30);
}

function togglePembahasan() {
  const list  = document.getElementById('pembahasan-list');
  const isHid = list.classList.contains('hidden');
  list.classList.toggle('hidden');
  document.getElementById('btn-toggle-pembahasan').innerHTML = isHid
    ? '<i class="fas fa-book-open"></i> Sembunyikan Pembahasan <i class="fas fa-chevron-down toggle-chevron" id="toggle-chevron" style="transform:rotate(180deg)"></i>'
    : '<i class="fas fa-book-open"></i> Lihat Pembahasan Soal <i class="fas fa-chevron-down toggle-chevron" id="toggle-chevron"></i>';
}

function renderPembahasan(soalList, answers) {
  const container = document.getElementById('pembahasan-list');
  if (!container) return;
  container.innerHTML = soalList.map((s, idx) => {
    const jawabanSiswa = answers[s.id];
    const benar    = jawabanSiswa === s.jawaban;
    const dilewati = !jawabanSiswa;
    let statusClass, statusLabel, statusIcon;
    if (dilewati)      { statusClass='pb-skip';  statusLabel='Dilewati'; statusIcon='fas fa-minus-circle'; }
    else if (benar)    { statusClass='pb-benar'; statusLabel='Benar';    statusIcon='fas fa-check-circle'; }
    else               { statusClass='pb-salah'; statusLabel='Salah';    statusIcon='fas fa-times-circle'; }

    const pilihanHTML = ['A','B','C','D'].map(opt => {
      const text      = s[opt.toLowerCase()];
      const isJawaban = opt === s.jawaban;
      const isDipilih = opt === jawabanSiswa;
      let cls = 'pb-opsi';
      if (isJawaban)           cls += ' pb-opsi-benar';
      if (isDipilih && !benar) cls += ' pb-opsi-salah-dipilih';
      const icon = isJawaban
        ? '<i class="fas fa-check-circle pb-opsi-icon-benar"></i>'
        : (isDipilih && !benar ? '<i class="fas fa-times-circle pb-opsi-icon-salah"></i>' : '');
      return `
        <div class="${cls}">
          <span class="pb-opt-label">${opt}</span>
          <span class="pb-opt-text">${text}</span>
          ${icon}
          ${isDipilih ? '<span class="pb-dipilih-tag">Jawabanmu</span>' : ''}
        </div>`;
    }).join('');

    return `
      <div class="pembahasan-card ${statusClass}-card">
        <div class="pb-card-header">
          <div class="pb-nomor">Soal ${idx + 1}</div>
          <div class="pb-status ${statusClass}"><i class="${statusIcon}"></i> ${statusLabel}</div>
        </div>
        <div class="pb-pertanyaan">${s.pertanyaan}</div>
        <div class="pb-opsi-list">${pilihanHTML}</div>
        <div class="pb-kunci">
          <i class="fas fa-key"></i> Kunci Jawaban: <strong>${s.jawaban}</strong>
          — <span class="pb-kunci-text">${s[s.jawaban.toLowerCase()]}</span>
        </div>
      </div>`;
  }).join('');
}

function retryPretest() {
  pretestState.currentIndex = 0;
  pretestState.answers = {};
  document.getElementById('pretest-hasil').classList.add('hidden');
  document.getElementById('pretest-soal').classList.remove('hidden');
  renderSoal();
}

function backToPretest() {
  document.getElementById('pretest-hasil').classList.add('hidden');
  document.getElementById('pretest-soal').classList.add('hidden');
  document.getElementById('pretest-selector').classList.remove('hidden');
}

// =============================================
// ADMIN NAVIGATION
// =============================================
function showAdminSection(name) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`admin-${name}`).classList.remove('hidden');
  document.querySelectorAll('.sb-item').forEach(s => s.classList.remove('active'));
  const mapping = { 'dashboard':0, 'kelola-materi':1, 'kelola-pretest':2, 'data-siswa':3 };
  const items   = document.querySelectorAll('.sb-item');
  if (items[mapping[name]]) items[mapping[name]].classList.add('active');
  const titles = { 'dashboard':'Dashboard','kelola-materi':'Kelola Materi','kelola-pretest':'Kelola Pretest','data-siswa':'Data Siswa' };
  document.getElementById('admin-page-title').textContent = titles[name] || name;
  if (name === 'kelola-materi')  loadAndRenderMateriTable();
  if (name === 'kelola-pretest') loadAndRenderSoalTable();
  if (name === 'data-siswa')     loadAndRenderSiswaTable();
  if (name === 'dashboard')      loadDashboard();
}

function toggleSidebar() {
  document.getElementById('admin-sidebar').classList.toggle('collapsed');
}

// =============================================
// DASHBOARD
// =============================================
async function loadDashboard() {
  try {
    const [materi, soal, siswa] = await Promise.all([
      apiFetch('/materi'), apiFetch('/soal'), apiFetch('/siswa')
    ]);
    document.getElementById('stat-materi').textContent = materi.length;
    document.getElementById('stat-soal').textContent   = soal.length;
    document.getElementById('stat-siswa').textContent  = siswa.length;
    document.getElementById('stat-kelas').textContent  = new Set(siswa.map(s => s.kelas)).size || 6;
    const el = document.getElementById('recent-materi-list');
    if (el) {
      el.innerHTML = materi.slice(-5).reverse().map(m => `
        <div class="recent-materi-item">
          <div class="rmi-icon">${m.icon}</div>
          <div><div class="rmi-name">${m.judul}</div><div class="rmi-meta">Kelas ${m.kelas} • ${m.mapel}</div></div>
        </div>`).join('');
    }
  } catch (err) { console.error('Dashboard error:', err.message); }
}

// =============================================
// KELOLA MATERI (Admin)
// =============================================
let activeKelasMateri = '0';
let activeMapelMateri = '';

function switchKelasMateri(kelas) {
  activeKelasMateri = kelas;
  document.querySelectorAll('#admin-kelola-materi .pkelas-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.kelas === kelas));
  loadAndRenderMateriTable();
}
function switchMapelMateri(mapel) {
  activeMapelMateri = mapel;
  document.querySelectorAll('#admin-kelola-materi .pmapel-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mapel === mapel));
  loadAndRenderMateriTable();
}
async function loadAndRenderMateriTable() {
  const infoEl = document.getElementById('materi-info-text');
  if (infoEl) infoEl.textContent = '⏳ Memuat materi...';
  let url = '/materi';
  const params = [];
  if (activeKelasMateri && activeKelasMateri !== '0') params.push(`kelas=${activeKelasMateri}`);
  if (activeMapelMateri) params.push(`mapel=${encodeURIComponent(activeMapelMateri)}`);
  if (params.length) url += '?' + params.join('&');
  try {
    const list = await apiFetch(url);
    appData.materi = list;
    renderMateriAdminCards(list);
    const kelasLabel = activeKelasMateri === '0' ? 'Semua Kelas' : `Kelas ${activeKelasMateri}`;
    const mapelLabel = activeMapelMateri || 'Semua Mapel';
    if (infoEl) infoEl.textContent = list.length > 0
      ? `✅ ${list.length} materi ditemukan — ${kelasLabel} • ${mapelLabel}`
      : `📭 Belum ada materi untuk ${kelasLabel} • ${mapelLabel}`;
  } catch (err) { showToast('❌ Gagal memuat materi: ' + err.message); }
}
function renderMateriAdminCards(list) {
  const grid = document.getElementById('materi-admin-grid');
  if (!list || list.length === 0) {
    grid.innerHTML = `<div class="materi-admin-empty"><i class="fas fa-inbox"></i><p>Belum ada materi. Klik "Tambah Materi" untuk menambahkan.</p></div>`;
    return;
  }
  const mapelColors = { 'Matematika':'mc-math','Bahasa Indonesia':'mc-bind','IPA':'mc-ipa','IPS':'mc-ips','PAI':'mc-pai','PJOK':'mc-pjok','SBdP':'mc-sbdp' };
  grid.innerHTML = list.map(m => {
    const pdfC = m.bahan.filter(b => b.type === 'pdf').length;
    const vidC = m.bahan.filter(b => b.type === 'video').length;
    const cc   = mapelColors[m.mapel] || 'mc-default';
    return `
    <div class="materi-admin-card ${cc}">
      <div class="mac-header">
        <div class="mac-icon">${m.icon}</div>
        <div class="mac-badges">
          <span class="mac-kelas">Kelas ${m.kelas}</span>
          <span class="mac-mapel">${m.mapel}</span>
        </div>
      </div>
      <div class="mac-body">
        <div class="mac-judul">${m.judul}</div>
        <div class="mac-desc">${(m.desc||'').substring(0,70)}${(m.desc||'').length>70?'...':''}</div>
      </div>
      <div class="mac-bahan">
        ${pdfC > 0 ? `<span class="bahan-chip pdf"><i class="fas fa-file-pdf"></i> ${pdfC} PDF</span>` : ''}
        ${vidC > 0 ? `<span class="bahan-chip video"><i class="fab fa-youtube"></i> ${vidC} Video</span>` : ''}
        ${pdfC===0&&vidC===0 ? '<span class="mac-no-bahan">Belum ada bahan</span>' : ''}
      </div>
      <div class="mac-actions">
        <button class="mac-btn-edit" onclick="editMateri(${m.id})"><i class="fas fa-edit"></i> Edit</button>
        <button class="mac-btn-del"  onclick="deleteMateri(${m.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}
function openModalMateri() {
  document.getElementById('edit-materi-id').value = '';
  document.getElementById('m-judul').value = '';
  document.getElementById('m-kelas').value = '1';
  document.getElementById('m-mapel').value = 'Matematika';
  document.getElementById('m-desc').value  = '';
  document.getElementById('bahan-items').innerHTML = '';
  document.getElementById('modal-materi-title').innerHTML = '<i class="fas fa-book"></i> Tambah Materi';
  document.getElementById('modal-materi').classList.remove('hidden');
}
function editMateri(id) {
  const m = appData.materi.find(x => x.id === id);
  if (!m) return;
  document.getElementById('edit-materi-id').value = m.id;
  document.getElementById('m-judul').value = m.judul;
  document.getElementById('m-kelas').value = m.kelas;
  document.getElementById('m-mapel').value = m.mapel;
  document.getElementById('m-desc').value  = m.desc || '';
  document.getElementById('bahan-items').innerHTML = '';
  m.bahan.forEach(b => addBahanWithValue(b.type, b.name, b.url));
  document.getElementById('modal-materi-title').innerHTML = '<i class="fas fa-edit"></i> Edit Materi';
  document.getElementById('modal-materi').classList.remove('hidden');
}
function addBahan(type) { addBahanWithValue(type, '', '#'); }
function addBahanWithValue(type, name, url) {
  const c    = document.getElementById('bahan-items');
  const icon = type === 'pdf' ? '📄' : '▶️';
  const ph   = type === 'pdf' ? 'Nama file PDF...' : 'URL YouTube...';
  const div  = document.createElement('div');
  div.className = 'bahan-input-row';
  div.setAttribute('data-type', type);
  div.innerHTML = `
    <span class="bahan-type-tag">${icon}</span>
    <input type="text" class="bahan-name-input" placeholder="${ph}" value="${name}" />
    <input type="text" class="bahan-url-input"  placeholder="URL (opsional)" value="${url === '#' ? '' : url}" />
    <button type="button" class="btn-remove-bahan" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
  c.appendChild(div);
}
async function saveMateri() {
  const judul = document.getElementById('m-judul').value.trim();
  const kelas = parseInt(document.getElementById('m-kelas').value);
  const mapel = document.getElementById('m-mapel').value;
  const desc  = document.getElementById('m-desc').value.trim();
  if (!judul) { showToast('⚠️ Judul materi harus diisi!'); return; }
  const bahanRows = document.querySelectorAll('#bahan-items .bahan-input-row');
  const bahan = [];
  bahanRows.forEach(row => {
    const type = row.getAttribute('data-type');
    const name = row.querySelector('.bahan-name-input').value.trim();
    const url  = row.querySelector('.bahan-url-input').value.trim() || '#';
    if (name) bahan.push({ type, name, url });
  });
  const icons  = { 1:'🌱',2:'🌿',3:'🌳',4:'⭐',5:'🌟',6:'🏆' };
  const editId = document.getElementById('edit-materi-id').value;
  try {
    if (editId) {
      await apiFetch(`/materi/${editId}`, { method:'PUT', body:JSON.stringify({ judul,kelas,mapel,desc,icon:icons[kelas],bahan }) });
      showToast('✅ Materi berhasil diperbarui!');
    } else {
      await apiFetch('/materi', { method:'POST', body:JSON.stringify({ judul,kelas,mapel,desc,icon:icons[kelas],bahan }) });
      showToast('✅ Materi berhasil ditambahkan!');
    }
    closeModal('modal-materi');
    loadAndRenderMateriTable();
  } catch (err) { showToast('❌ ' + err.message); }
}
async function deleteMateri(id) {
  if (!confirm('Yakin ingin menghapus materi ini?')) return;
  try {
    await apiFetch(`/materi/${id}`, { method:'DELETE' });
    showToast('🗑️ Materi berhasil dihapus!');
    loadAndRenderMateriTable();
  } catch (err) { showToast('❌ ' + err.message); }
}

// =============================================
// KELOLA SOAL (Admin)
// =============================================
let activeKelasPretest = '1';
let activeMapelPretest = 'Matematika';

function switchKelasPretest(kelas) {
  activeKelasPretest = kelas;
  document.querySelectorAll('.pkelas-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.kelas === kelas));
  loadAndRenderSoalTable();
}
function switchMapelPretest(mapel) {
  activeMapelPretest = mapel;
  document.querySelectorAll('.pmapel-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mapel === mapel));
  loadAndRenderSoalTable();
}
async function loadAndRenderSoalTable() {
  const infoEl = document.getElementById('pretest-info-text');
  if (infoEl) infoEl.textContent = '⏳ Memuat soal...';
  try {
    const list = await apiFetch(`/soal?kelas=${activeKelasPretest}&mapel=${encodeURIComponent(activeMapelPretest)}`);
    appData.soalPretest = list;
    renderSoalTable(list);
    if (infoEl) infoEl.textContent = list.length > 0
      ? `✅ ${list.length} soal untuk Kelas ${activeKelasPretest} - ${activeMapelPretest}`
      : `📭 Belum ada soal untuk Kelas ${activeKelasPretest} - ${activeMapelPretest}`;
  } catch (err) { showToast('❌ Gagal memuat soal: ' + err.message); }
}
function renderSoalTable(list) {
  if (!list || list.length === 0) {
    document.getElementById('soal-tbody').innerHTML = `
      <tr><td colspan="4" class="tbl-empty">
        <i class="fas fa-inbox tbl-empty-icon"></i> Belum ada soal. Klik "Tambah Soal" untuk menambahkan.
      </td></tr>`;
    return;
  }
  document.getElementById('soal-tbody').innerHTML = list.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div class="tbl-pertanyaan">${s.pertanyaan}</div>
        <div class="tbl-opsi">
          <span class="tbl-opsi-item opsi-a">A: ${s.a}</span>
          <span class="tbl-opsi-item opsi-b">B: ${s.b}</span>
          <span class="tbl-opsi-item opsi-c">C: ${s.c}</span>
          <span class="tbl-opsi-item opsi-d">D: ${s.d}</span>
        </div>
      </td>
      <td><span class="jawaban-badge">${s.jawaban}</span></td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="editSoal(${s.id})"><i class="fas fa-edit"></i> Edit</button>
        <button class="btn-del"  onclick="deleteSoal(${s.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('');
}
function openModalSoal() {
  document.getElementById('edit-soal-id').value = '';
  document.getElementById('s-kelas').value = activeKelasPretest;
  document.getElementById('s-mapel').value = activeMapelPretest;
  document.getElementById('s-pertanyaan').value = '';
  ['a','b','c','d'].forEach(x => document.getElementById(`s-${x}`).value = '');
  document.getElementById('s-jawaban').value = 'A';
  document.getElementById('modal-soal-title').innerHTML = '<i class="fas fa-tasks"></i> Tambah Soal Pretest';
  document.getElementById('modal-soal').classList.remove('hidden');
}
function editSoal(id) {
  const s = appData.soalPretest.find(x => x.id === id);
  if (!s) return;
  document.getElementById('edit-soal-id').value    = s.id;
  document.getElementById('s-kelas').value         = s.kelas;
  document.getElementById('s-mapel').value         = s.mapel;
  document.getElementById('s-pertanyaan').value    = s.pertanyaan;
  ['a','b','c','d'].forEach(x => document.getElementById(`s-${x}`).value = s[x]);
  document.getElementById('s-jawaban').value = s.jawaban;
  document.getElementById('modal-soal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Soal Pretest';
  document.getElementById('modal-soal').classList.remove('hidden');
}
async function saveSoal() {
  const kelas      = document.getElementById('s-kelas').value;
  const mapel      = document.getElementById('s-mapel').value;
  const pertanyaan = document.getElementById('s-pertanyaan').value.trim();
  const a = document.getElementById('s-a').value.trim();
  const b = document.getElementById('s-b').value.trim();
  const c = document.getElementById('s-c').value.trim();
  const d = document.getElementById('s-d').value.trim();
  const jawaban    = document.getElementById('s-jawaban').value;
  if (!pertanyaan || !a || !b || !c || !d) { showToast('⚠️ Semua field harus diisi!'); return; }
  const editId = document.getElementById('edit-soal-id').value;
  try {
    if (editId) {
      await apiFetch(`/soal/${editId}`, { method:'PUT', body:JSON.stringify({kelas,mapel,pertanyaan,a,b,c,d,jawaban}) });
      showToast('✅ Soal berhasil diperbarui!');
    } else {
      await apiFetch('/soal', { method:'POST', body:JSON.stringify({kelas,mapel,pertanyaan,a,b,c,d,jawaban}) });
      showToast('✅ Soal berhasil ditambahkan!');
    }
    closeModal('modal-soal');
    loadAndRenderSoalTable();
  } catch (err) { showToast('❌ ' + err.message); }
}
async function deleteSoal(id) {
  if (!confirm('Yakin ingin menghapus soal ini?')) return;
  try {
    await apiFetch(`/soal/${id}`, { method:'DELETE' });
    showToast('🗑️ Soal berhasil dihapus!');
    loadAndRenderSoalTable();
  } catch (err) { showToast('❌ ' + err.message); }
}

// =============================================
// DATA SISWA (Admin)
// =============================================
async function loadAndRenderSiswaTable() {
  try {
    const list = await apiFetch('/siswa');
    appData.dataSiswa = list;
    document.getElementById('siswa-tbody').innerHTML = list.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><span class="tbl-nama">${s.nama}</span></td>
        <td><span class="badge">Kelas ${s.kelas}</span></td>
        <td>${s.nis}</td>
        <td><span class="status-active">${s.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
      </tr>`).join('');
  } catch (err) { showToast('❌ Gagal memuat data siswa: ' + err.message); }
}

// =============================================
// MODALS & TOAST
// =============================================
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden');
});

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}