// =============================================
// server.js - Backend Aplikasi Pembelajaran SD
// =============================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// =============================================
// GANTI DENGAN NILAI ASLI ANDA
// =============================================
const SUPABASE_URL = 'https://xxedhgsrelrzqukgwajm.supabase.co';      // ganti ini
const SUPABASE_KEY = 'sb_publishable_6oAKljBLU2yq9m5neq8-NA_-d4_oAb3';  // ganti ini
const JWT_SECRET   = '5d6a1edb5aaf0ef7e25d1fce7eed477e48e5769dcd8e021d5e99c12f0780d755';
const PORT         = 3000;
// =============================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================
// RESET PASSWORD — in-memory token store
// { token -> { userId, expiry } }
// Di produksi: simpan ke tabel supabase agar
// tidak hilang saat server restart
// =============================================
const resetTokens = new Map();

const app = express();
app.use(cors());
app.use(express.json());

// Test koneksi Supabase saat server start
supabase.from('materi').select('id').limit(1).then(({ data, error }) => {
  if (error) console.log('❌ Supabase error:', error.message);
  else console.log('✅ Supabase terhubung, materi count:', data.length);
});

// =============================================
// MIDDLEWARE AUTH
// =============================================
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token tidak ada' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token tidak valid' });
  }
}

function guruOnly(req, res, next) {
  if (req.user.role !== 'guru') return res.status(403).json({ error: 'Akses ditolak, hanya untuk guru' });
  next();
}

// =============================================
// AUTH ROUTES
// =============================================

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username dan password harus diisi' });

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user)
    return res.status(401).json({ error: 'Username atau password salah' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Username atau password salah' });

  const token = jwt.sign(
    { id: user.id, nama: user.nama, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: user.id, nama: user.nama, role: user.role } });
});

// POST /api/auth/lupa-password
app.post('/api/auth/lupa-password', async (req, res) => {
  const { username } = req.body;
  if (!username)
    return res.status(400).json({ error: 'Username harus diisi' });

  const { data: user, error } = await supabase
    .from('users')
    .select('id, nama, role')
    .eq('username', username)
    .single();

  if (error || !user)
    return res.status(404).json({ error: 'Username tidak ditemukan' });

  // Hapus token lama milik user ini (jika ada)
  for (const [tok, val] of resetTokens.entries()) {
    if (val.userId === user.id) resetTokens.delete(tok);
  }

  // Buat token baru, berlaku 1 jam
  const token  = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + 60 * 60 * 1000;
  resetTokens.set(token, { userId: user.id, expiry });

  // URL reset — ganti BASE_URL di produksi dengan domain asli
  const BASE_URL  = process.env.BASE_URL || 'http://localhost:5500';
  const resetUrl  = `${BASE_URL}/index.html?token=${token}`;

  // Di produksi: kirim resetUrl via email/WhatsApp ke guru/orang tua
  // Untuk development: kembalikan URL di response supaya mudah di-test
  console.log(`[RESET] ${username} (${user.nama}) → ${resetUrl}`);

  res.json({
    message : `Permintaan berhasil. Link reset telah dibuat.`,
    nama    : user.nama,
    resetUrl,          // HAPUS baris ini di produksi!
    expiresIn: '1 jam'
  });
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ error: 'Token dan password baru harus diisi' });

  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Password minimal 6 karakter' });

  const data = resetTokens.get(token);
  if (!data)
    return res.status(400).json({ error: 'Token tidak valid atau sudah digunakan' });

  if (Date.now() > data.expiry)
    return res.status(400).json({ error: 'Token sudah kadaluarsa. Minta reset ulang.' });

  const hash = await bcrypt.hash(newPassword, 10);

  const { error } = await supabase
    .from('users')
    .update({ password_hash: hash })
    .eq('id', data.userId);

  if (error)
    return res.status(500).json({ error: 'Gagal memperbarui password: ' + error.message });

  // Token one-time-use — hapus setelah berhasil
  resetTokens.delete(token);

  res.json({ message: 'Kata sandi berhasil diubah. Silakan login.' });
});

// =============================================
// MATERI ROUTES
// =============================================

// GET /api/materi?kelas=1&mapel=Matematika
app.get('/api/materi', async (req, res) => {
  const { kelas, mapel } = req.query;
  let query = supabase
    .from('materi')
    .select('*, bahan_materi(*)')
    .order('id');

  if (kelas) query = query.eq('kelas', kelas);
  if (mapel) query = query.eq('mapel', mapel);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const formatted = data.map(m => ({
    id: m.id,
    kelas: m.kelas,
    mapel: m.mapel,
    judul: m.judul,
    desc: m.deskripsi,
    icon: m.icon,
    bahan: (m.bahan_materi || []).map(b => ({
      type: b.type,
      name: b.nama,
      url: b.url
    }))
  }));

  res.json(formatted);
});

// GET /api/materi/:id
app.get('/api/materi/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('materi')
    .select('*, bahan_materi(*)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Materi tidak ditemukan' });

  res.json({
    id: data.id,
    kelas: data.kelas,
    mapel: data.mapel,
    judul: data.judul,
    desc: data.deskripsi,
    icon: data.icon,
    bahan: (data.bahan_materi || []).map(b => ({
      type: b.type,
      name: b.nama,
      url: b.url
    }))
  });
});

// POST /api/materi (guru only)
app.post('/api/materi', authMiddleware, guruOnly, async (req, res) => {
  const { judul, kelas, mapel, desc, icon, bahan } = req.body;
  if (!judul || !kelas || !mapel)
    return res.status(400).json({ error: 'judul, kelas, mapel wajib diisi' });

  const { data: newMateri, error } = await supabase
    .from('materi')
    .insert({ judul, kelas, mapel, deskripsi: desc, icon: icon || '📘' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (bahan && bahan.length > 0) {
    const bahanData = bahan.map((b, i) => ({
      materi_id: newMateri.id,
      type: b.type,
      nama: b.name,
      url: b.url || '#',
      urutan: i
    }));
    await supabase.from('bahan_materi').insert(bahanData);
  }

  res.status(201).json({ message: 'Materi berhasil ditambahkan', id: newMateri.id });
});

// PUT /api/materi/:id (guru only)
app.put('/api/materi/:id', authMiddleware, guruOnly, async (req, res) => {
  const { judul, kelas, mapel, desc, icon, bahan } = req.body;

  const { error } = await supabase
    .from('materi')
    .update({ judul, kelas, mapel, deskripsi: desc, icon, updated_at: new Date() })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('bahan_materi').delete().eq('materi_id', req.params.id);
  if (bahan && bahan.length > 0) {
    const bahanData = bahan.map((b, i) => ({
      materi_id: parseInt(req.params.id),
      type: b.type,
      nama: b.name,
      url: b.url || '#',
      urutan: i
    }));
    await supabase.from('bahan_materi').insert(bahanData);
  }

  res.json({ message: 'Materi berhasil diperbarui' });
});

// DELETE /api/materi/:id (guru only)
app.delete('/api/materi/:id', authMiddleware, guruOnly, async (req, res) => {
  const { error } = await supabase.from('materi').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Materi berhasil dihapus' });
});

// =============================================
// SOAL PRETEST ROUTES
// =============================================

// GET /api/soal?kelas=1&mapel=Matematika
app.get('/api/soal', async (req, res) => {
  const { kelas, mapel } = req.query;
  let query = supabase.from('soal_pretest').select('*').order('id');
  if (kelas) query = query.eq('kelas', kelas);
  if (mapel) query = query.eq('mapel', mapel);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const formatted = data.map(s => ({
    id: s.id,
    kelas: s.kelas,
    mapel: s.mapel,
    pertanyaan: s.pertanyaan,
    a: s.opsi_a,
    b: s.opsi_b,
    c: s.opsi_c,
    d: s.opsi_d,
    jawaban: s.jawaban
  }));

  res.json(formatted);
});

// POST /api/soal (guru only)
app.post('/api/soal', authMiddleware, guruOnly, async (req, res) => {
  const { kelas, mapel, pertanyaan, a, b, c, d, jawaban } = req.body;
  if (!kelas || !mapel || !pertanyaan || !a || !b || !c || !d || !jawaban)
    return res.status(400).json({ error: 'Semua field harus diisi' });

  const { data, error } = await supabase
    .from('soal_pretest')
    .insert({ kelas, mapel, pertanyaan, opsi_a: a, opsi_b: b, opsi_c: c, opsi_d: d, jawaban })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: 'Soal berhasil ditambahkan', id: data.id });
});

// PUT /api/soal/:id (guru only)
app.put('/api/soal/:id', authMiddleware, guruOnly, async (req, res) => {
  const { kelas, mapel, pertanyaan, a, b, c, d, jawaban } = req.body;
  const { error } = await supabase
    .from('soal_pretest')
    .update({ kelas, mapel, pertanyaan, opsi_a: a, opsi_b: b, opsi_c: c, opsi_d: d, jawaban })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Soal berhasil diperbarui' });
});

// DELETE /api/soal/:id (guru only)
app.delete('/api/soal/:id', authMiddleware, guruOnly, async (req, res) => {
  const { error } = await supabase.from('soal_pretest').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Soal berhasil dihapus' });
});

// =============================================
// SISWA ROUTES
// =============================================

// GET /api/siswa?kelas=1
app.get('/api/siswa', authMiddleware, async (req, res) => {
  const { kelas } = req.query;
  let query = supabase.from('siswa').select('*').order('nis');
  if (kelas) query = query.eq('kelas', kelas);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/siswa (guru only)
app.post('/api/siswa', authMiddleware, guruOnly, async (req, res) => {
  const { nama, nis, kelas } = req.body;
  if (!nama || !nis || !kelas)
    return res.status(400).json({ error: 'nama, nis, kelas wajib diisi' });

  const { data, error } = await supabase
    .from('siswa')
    .insert({ nama, nis, kelas })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: 'Siswa berhasil ditambahkan', id: data.id });
});

// DELETE /api/siswa/:id (guru only)
app.delete('/api/siswa/:id', authMiddleware, guruOnly, async (req, res) => {
  const { error } = await supabase.from('siswa').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Siswa berhasil dihapus' });
});

// =============================================
// HASIL PRETEST ROUTES
// =============================================

// POST /api/hasil (simpan hasil pretest)
app.post('/api/hasil', authMiddleware, async (req, res) => {
  const { siswa_id, nama_siswa, kelas, mapel, nilai, jumlah_benar, jumlah_soal } = req.body;

  const { data, error } = await supabase
    .from('hasil_pretest')
    .insert({ siswa_id, nama_siswa, kelas, mapel, nilai, jumlah_benar, jumlah_soal })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: 'Hasil disimpan', id: data.id });
});

// GET /api/hasil?kelas=1&mapel=Matematika (guru only)
app.get('/api/hasil', authMiddleware, guruOnly, async (req, res) => {
  const { kelas, mapel } = req.query;
  let query = supabase
    .from('hasil_pretest')
    .select('*')
    .order('created_at', { ascending: false });
  if (kelas) query = query.eq('kelas', kelas);
  if (mapel) query = query.eq('mapel', mapel);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================
// PROFIL SEKOLAH ROUTES
// =============================================

// GET /api/profil (publik, tidak perlu auth)
app.get('/api/profil', async (req, res) => {
  const { data, error } = await supabase
    .from('profil_sekolah')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Profil sekolah belum diisi' });

  // Ubah field misi dari string (pisah newline) jadi array
  const result = {
    ...data,
    misi: data.misi ? data.misi.split('\n').filter(Boolean) : [],
    fasilitas: data.fasilitas ? data.fasilitas.split(',').map(f => f.trim()) : []
  };

  res.json(result);
});

// PUT /api/profil (guru only — untuk edit profil sekolah)
app.put('/api/profil', authMiddleware, guruOnly, async (req, res) => {
  const {
    nama, npsn, status, akreditasi, tahun_berdiri, kepala_sekolah,
    alamat, kelurahan, kecamatan, kota, telepon, email,
    tagline, sub, visi, misi, jumlah_siswa, jumlah_guru,
    jumlah_kelas, prestasi, fasilitas
  } = req.body;

  // Ubah array misi & fasilitas kembali ke string untuk disimpan
  const misiStr = Array.isArray(misi) ? misi.join('\n') : misi;
  const fasilitasStr = Array.isArray(fasilitas) ? fasilitas.join(',') : fasilitas;

  const { error } = await supabase
    .from('profil_sekolah')
    .upsert({
      id: 1,
      nama, npsn, status, akreditasi, tahun_berdiri, kepala_sekolah,
      alamat, kelurahan, kecamatan, kota, telepon, email,
      tagline, sub, visi,
      misi: misiStr,
      jumlah_siswa, jumlah_guru, jumlah_kelas, prestasi,
      fasilitas: fasilitasStr,
      updated_at: new Date()
    });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Profil sekolah berhasil diperbarui' });
});

// =============================================
// START SERVER
// =============================================
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});