const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================
// DEBUG: Test koneksi dulu
// =============================================
async function testFetch() {
  console.log('🔍 Mulai test koneksi...\n');

  // Test 1: Internet biasa
  try {
    const res = await fetch('https://supabase.com');
    console.log('✅ Internet OK, status:', res.status);
  } catch (e) {
    console.log('❌ Tidak bisa akses internet:', e.message);
  }

  // Test 2: Akses tabel materi langsung via REST
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/materi?select=id`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const json = await res.json();
    console.log('✅ Akses tabel materi OK:', json);
  } catch (e) {
    console.log('❌ Tidak bisa akses tabel materi:', e.message);
    console.log('   Cause:', e.cause);
  }

  // Test 3: Supabase SDK langsung
  try {
    const { data, error } = await supabase.from('materi').select('id').limit(1);
    if (error) console.log('❌ SDK error:', error.message);
    else console.log('✅ SDK OK:', data);
  } catch (e) {
    console.log('❌ SDK exception:', e.message);
  }

  console.log('\n--- Test selesai, lanjut seed ---\n');
}

// =============================================
// SEED DATA
// =============================================
async function seed() {
  // Jalankan test dulu
  await testFetch();

  console.log('🌱 Mulai seeding database...\n');

  // ---- 1. USERS ----
  console.log('👤 Seeding users...');
  const guruHash = await bcrypt.hash('guru123', 10);
  const siswaHash = await bcrypt.hash('siswa123', 10);

  const { error: usersErr } = await supabase.from('users').upsert([
    { username: 'guru', password_hash: guruHash, nama: 'Bapak Fauzi', role: 'guru' },
    { username: 'siswa', password_hash: siswaHash, nama: 'Ahmad Rizky', role: 'siswa' }
  ], { onConflict: 'username' });
  if (usersErr) console.error('  ❌ Error users:', usersErr.message);
  else console.log('  ✅ Users selesai\n');

  // ---- 2. SISWA ----
  console.log('🧒 Seeding data siswa...');
  const { error: siswaErr } = await supabase.from('siswa').upsert([
    { nama: 'Ahmad Rizky', nis: '2024001', kelas: 1 },
    { nama: 'Siti Fatimah', nis: '2024002', kelas: 1 },
    { nama: 'Budi Santoso', nis: '2024003', kelas: 2 },
    { nama: 'Nur Indah', nis: '2024004', kelas: 2 },
    { nama: 'Farhan Maulana', nis: '2024005', kelas: 3 },
    { nama: 'Anisa Rahmawati', nis: '2024006', kelas: 3 },
    { nama: 'Dimas Pratama', nis: '2024007', kelas: 4 },
    { nama: 'Putri Handayani', nis: '2024008', kelas: 4 },
    { nama: 'Rizal Fadilah', nis: '2024009', kelas: 5 },
    { nama: 'Dewi Lestari', nis: '2024010', kelas: 5 },
    { nama: 'Fauzan Azhar', nis: '2024011', kelas: 6 },
    { nama: 'Maya Sari', nis: '2024012', kelas: 6 }
  ], { onConflict: 'nis' });
  if (siswaErr) console.error('  ❌ Error siswa:', siswaErr.message);
  else console.log('  ✅ Data siswa selesai\n');

  // ---- 3. MATERI ----
  console.log('📚 Seeding materi...');
  const materiData = [
    { id: 1,  kelas: 1, mapel: 'Matematika',       judul: 'Mengenal Bilangan 1-10',       deskripsi: 'Belajar mengenal dan menulis angka 1 sampai 10 dengan menyenangkan.', icon: '🔢' },
    { id: 2,  kelas: 1, mapel: 'Bahasa Indonesia',  judul: 'Mengenal Huruf Abjad',          deskripsi: 'Mengenal 26 huruf alfabet dari A sampai Z beserta pengucapannya.', icon: '🔤' },
    { id: 3,  kelas: 2, mapel: 'Matematika',        judul: 'Penjumlahan dan Pengurangan',   deskripsi: 'Belajar operasi hitung penjumlahan dan pengurangan bilangan 1-100.', icon: '➕' },
    { id: 4,  kelas: 2, mapel: 'IPA',               judul: 'Bagian-Bagian Tumbuhan',        deskripsi: 'Mengenal bagian-bagian tumbuhan: akar, batang, daun, bunga, dan buah.', icon: '🌿' },
    { id: 5,  kelas: 3, mapel: 'IPA',               judul: 'Siklus Air',                    deskripsi: 'Mempelajari proses siklus air: evaporasi, kondensasi, dan presipitasi.', icon: '💧' },
    { id: 6,  kelas: 3, mapel: 'Matematika',        judul: 'Perkalian dan Pembagian',       deskripsi: 'Belajar operasi perkalian dan pembagian bilangan 1-10.', icon: '✖️' },
    { id: 7,  kelas: 4, mapel: 'IPS',               judul: 'Peta dan Atlas Indonesia',      deskripsi: 'Mengenal peta, atlas, dan wilayah Indonesia beserta batas-batasnya.', icon: '🗺️' },
    { id: 8,  kelas: 4, mapel: 'PAI',               judul: 'Asmaul Husna',                  deskripsi: 'Mempelajari 99 Asmaul Husna beserta arti dan kandungannya.', icon: '☪️' },
    { id: 9,  kelas: 5, mapel: 'IPA',               judul: 'Sistem Tata Surya',             deskripsi: 'Mengenal planet-planet dalam tata surya dan posisi Bumi di antaranya.', icon: '🪐' },
    { id: 10, kelas: 5, mapel: 'Matematika',        judul: 'Pecahan dan Desimal',           deskripsi: 'Belajar konsep pecahan biasa, campuran, dan bilangan desimal.', icon: '🔢' },
    { id: 11, kelas: 6, mapel: 'Matematika',        judul: 'Bangun Ruang',                  deskripsi: 'Mengenal jenis-jenis bangun ruang dan rumus luas serta volumenya.', icon: '📦' },
    { id: 12, kelas: 6, mapel: 'IPS',               judul: 'Sejarah Kemerdekaan Indonesia', deskripsi: 'Mempelajari perjuangan bangsa Indonesia meraih kemerdekaan 17 Agustus 1945.', icon: '🇮🇩' }
  ];

  const { data: insertedMateri, error: materiErr } = await supabase
    .from('materi').upsert(materiData, { onConflict: 'id' }).select();

  if (materiErr) {
    console.error('  ❌ Error materi:', materiErr.message);
    console.error('  Detail:', JSON.stringify(materiErr, null, 2));
  } else {
    console.log(`  ✅ ${insertedMateri.length} materi berhasil\n`);

    // ---- 4. BAHAN MATERI ----
    console.log('📎 Seeding bahan materi...');
    const bahanData = [
      { materi_id: insertedMateri[0].id,  type: 'pdf',   nama: 'Modul Bilangan 1-10.pdf',      url: '#', urutan: 0 },
      { materi_id: insertedMateri[0].id,  type: 'video', nama: 'Video Belajar Angka - YouTube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', urutan: 1 },
      { materi_id: insertedMateri[1].id,  type: 'pdf',   nama: 'Buku Huruf Abjad.pdf',          url: '#', urutan: 0 },
      { materi_id: insertedMateri[2].id,  type: 'pdf',   nama: 'Latihan Penjumlahan.pdf',       url: '#', urutan: 0 },
      { materi_id: insertedMateri[2].id,  type: 'video', nama: 'Video Tutorial Penjumlahan',    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', urutan: 1 },
      { materi_id: insertedMateri[3].id,  type: 'pdf',   nama: 'Materi Tumbuhan.pdf',           url: '#', urutan: 0 },
      { materi_id: insertedMateri[4].id,  type: 'pdf',   nama: 'Siklus Air.pdf',                url: '#', urutan: 0 },
      { materi_id: insertedMateri[4].id,  type: 'video', nama: 'Animasi Siklus Air',            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', urutan: 1 },
      { materi_id: insertedMateri[5].id,  type: 'pdf',   nama: 'Tabel Perkalian.pdf',           url: '#', urutan: 0 },
      { materi_id: insertedMateri[6].id,  type: 'pdf',   nama: 'Atlas Indonesia.pdf',           url: '#', urutan: 0 },
      { materi_id: insertedMateri[6].id,  type: 'video', nama: 'Video Geografi Indonesia',      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', urutan: 1 },
      { materi_id: insertedMateri[7].id,  type: 'pdf',   nama: 'Asmaul Husna Lengkap.pdf',      url: '#', urutan: 0 },
      { materi_id: insertedMateri[8].id,  type: 'pdf',   nama: 'Materi Tata Surya.pdf',         url: '#', urutan: 0 },
      { materi_id: insertedMateri[8].id,  type: 'video', nama: 'Video 3D Tata Surya',           url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', urutan: 1 },
      { materi_id: insertedMateri[9].id,  type: 'pdf',   nama: 'Modul Pecahan.pdf',             url: '#', urutan: 0 },
      { materi_id: insertedMateri[10].id, type: 'pdf',   nama: 'Bangun Ruang Lengkap.pdf',      url: '#', urutan: 0 },
      { materi_id: insertedMateri[10].id, type: 'video', nama: 'Video Bangun Ruang 3D',         url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', urutan: 1 },
      { materi_id: insertedMateri[11].id, type: 'pdf',   nama: 'Sejarah Kemerdekaan.pdf',       url: '#', urutan: 0 },
    ];
    const { error: bahanErr } = await supabase.from('bahan_materi').insert(bahanData);
    if (bahanErr) console.error('  ❌ Error bahan:', bahanErr.message);
    else console.log('  ✅ Bahan materi selesai\n');
  }

  // ---- 5. SOAL PRETEST ----
  console.log('📝 Seeding soal pretest...');
  const soalData = [
    { kelas: '1', mapel: 'Matematika',       pertanyaan: 'Berapa hasil dari 3 + 4?',                                                    opsi_a: '6',          opsi_b: '7',          opsi_c: '8',          opsi_d: '9',          jawaban: 'B' },
    { kelas: '1', mapel: 'Matematika',       pertanyaan: 'Angka manakah yang lebih besar, 5 atau 8?',                                   opsi_a: '5',          opsi_b: '8',          opsi_c: 'Sama',       opsi_d: 'Tidak tahu', jawaban: 'B' },
    { kelas: '1', mapel: 'Matematika',       pertanyaan: 'Berapa hasil dari 10 - 3?',                                                   opsi_a: '6',          opsi_b: '8',          opsi_c: '7',          opsi_d: '5',          jawaban: 'C' },
    { kelas: '1', mapel: 'Matematika',       pertanyaan: 'Ibu membeli 4 apel dan 2 jeruk. Berapa total buah?',                          opsi_a: '5',          opsi_b: '7',          opsi_c: '6',          opsi_d: '8',          jawaban: 'C' },
    { kelas: '1', mapel: 'Matematika',       pertanyaan: 'Bilangan ganjil di antara berikut adalah...',                                 opsi_a: '2',          opsi_b: '4',          opsi_c: '6',          opsi_d: '7',          jawaban: 'D' },
    { kelas: '2', mapel: 'Matematika',       pertanyaan: 'Berapa hasil dari 12 + 15?',                                                  opsi_a: '25',         opsi_b: '27',         opsi_c: '26',         opsi_d: '28',         jawaban: 'B' },
    { kelas: '2', mapel: 'Matematika',       pertanyaan: 'Berapa hasil dari 30 - 14?',                                                  opsi_a: '15',         opsi_b: '16',         opsi_c: '17',         opsi_d: '14',         jawaban: 'B' },
    { kelas: '2', mapel: 'Matematika',       pertanyaan: '5 × 3 = ...',                                                                 opsi_a: '12',         opsi_b: '15',         opsi_c: '18',         opsi_d: '20',         jawaban: 'B' },
    { kelas: '2', mapel: 'Matematika',       pertanyaan: '20 ÷ 4 = ...',                                                                opsi_a: '4',          opsi_b: '6',          opsi_c: '5',          opsi_d: '8',          jawaban: 'C' },
    { kelas: '3', mapel: 'IPA',              pertanyaan: 'Bagian tumbuhan yang berfungsi menyerap air dan mineral dari tanah adalah...', opsi_a: 'Batang',     opsi_b: 'Daun',       opsi_c: 'Bunga',      opsi_d: 'Akar',       jawaban: 'D' },
    { kelas: '3', mapel: 'IPA',              pertanyaan: 'Proses penguapan air dari permukaan bumi disebut...',                         opsi_a: 'Kondensasi', opsi_b: 'Evaporasi',  opsi_c: 'Presipitasi', opsi_d: 'Infiltrasi', jawaban: 'B' },
    { kelas: '4', mapel: 'IPS',              pertanyaan: 'Ibu kota negara Indonesia adalah...',                                         opsi_a: 'Bandung',    opsi_b: 'Surabaya',   opsi_c: 'Jakarta',    opsi_d: 'Nusantara',  jawaban: 'C' },
    { kelas: '5', mapel: 'IPA',              pertanyaan: 'Planet yang paling dekat dengan Matahari adalah...',                          opsi_a: 'Venus',      opsi_b: 'Bumi',       opsi_c: 'Merkurius',  opsi_d: 'Mars',       jawaban: 'C' },
    { kelas: '6', mapel: 'Matematika',       pertanyaan: 'Volume kubus dengan panjang sisi 4 cm adalah...',                             opsi_a: '16 cm³',     opsi_b: '32 cm³',     opsi_c: '64 cm³',     opsi_d: '48 cm³',     jawaban: 'C' },
    { kelas: '1', mapel: 'Bahasa Indonesia', pertanyaan: 'Huruf pertama dalam alfabet adalah...',                                       opsi_a: 'B',          opsi_b: 'A',          opsi_c: 'C',          opsi_d: 'D',          jawaban: 'B' },
    { kelas: '1', mapel: 'PAI',              pertanyaan: 'Surat pertama dalam Al-Quran adalah...',                                      opsi_a: 'Al-Baqarah', opsi_b: 'Al-Fatihah', opsi_c: 'An-Nas',     opsi_d: 'Al-Ikhlas',  jawaban: 'B' },
  ];

  const { data: insertedSoal, error: soalErr } = await supabase
    .from('soal_pretest').insert(soalData).select();
  if (soalErr) {
    console.error('  ❌ Error soal:', soalErr.message);
    console.error('  Detail:', JSON.stringify(soalErr, null, 2));
  } else {
    console.log(`  ✅ ${insertedSoal.length} soal berhasil\n`);
  }

  console.log('🎉 Seeding selesai!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed gagal:', err);
  process.exit(1);
});