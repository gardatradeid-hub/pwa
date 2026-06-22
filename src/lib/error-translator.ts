/**
 * Garda Error Translator
 *
 * Menerjemahkan error dari Supabase Edge Functions, CCXT, dan Supabase Auth
 * menjadi pesan yang mudah dimengerti user dalam Bahasa Indonesia.
 *
 * Cara pakai:
 *   import { translateError } from '@/lib/error-translator';
 *   toast('error', 'Gagal', translateError(errorMessage));
 */

const EXCHANGE_KEY_PATTERNS: [RegExp, string][] = [
  // --- CCXT / Exchange connection errors ---
  [/invalid api key/i, 'API Key tidak valid. Periksa kembali API Key yang dimasukkan.'],
  [/api key.*invalid/i, 'API Key tidak valid. Periksa kembali API Key yang dimasukkan.'],
  [/api.*key.*format/i, 'Format API Key salah. Pastikan Anda menyalin seluruh API Key.'],
  [/invalid.*secret/i, 'API Secret tidak valid. Periksa kembali API Secret yang dimasukkan.'],
  [/secret.*invalid/i, 'API Secret tidak valid. Periksa kembali API Secret yang dimasukkan.'],
  [/signature.*error/i, 'API Signature salah. API Secret mungkin tidak cocok dengan API Key.'],
  [/incorrect.*sign/i, 'API Signature salah. API Secret mungkin tidak cocok dengan API Key.'],
  [/wrong.*secret/i, 'API Secret yang dimasukkan salah.'],
  [/authentication.*error/i, 'Gagal autentikasi ke exchange. Periksa API Key dan Secret Anda.'],
  [/auth.*fail/i, 'Gagal autentikasi ke exchange. Periksa API Key dan Secret Anda.'],
  [/api key.*permission/i, 'API Key tidak memiliki permission yang cukup. Diperlukan permission "Read" dan "Trade".'],
  [/no.*permission/i, 'API Key tidak memiliki permission yang cukup. Diperlukan permission "Read" dan "Trade".'],
  [/insufficient.*permission/i, 'API Key tidak memiliki permission yang cukup. Diperlukan permission "Read" dan "Trade".'],
  [/read.*only/i, 'API Key hanya Read-only. Izinkan permission "Trade" di dashboard exchange.'],
  [/withdraw.*permission/i, 'Permission Withdraw tidak diperlukan. Jika diaktifkan, nonaktifkan dulu untuk keamanan.'],
  [/ip.*white/i, 'IP Anda tidak terdaftar di whitelist exchange. Tambahkan whitelist IP atau nonaktifkan IP restriction.'],
  [/ip.*restrict/i, 'IP Anda tidak terdaftar di whitelist exchange. Tambahkan whitelist IP atau nonaktifkan IP restriction.'],
  [/network.*error/i, 'Koneksi terputus. Periksa koneksi internet Anda dan coba lagi.'],
  [/timeout/i, 'Koneksi timeout. Kemungkinan server exchange sedang sibuk. Coba beberapa saat lagi.'],
  [/econnrefused/i, 'Koneksi ditolak server exchange. Coba beberapa saat lagi.'],
  [/econnreset/i, 'Koneksi terputus oleh server exchange. Coba beberapa saat lagi.'],
  [/etimedout/i, 'Koneksi timeout. Server exchange tidak merespon. Coba lagi nanti.'],
  [/dns.*error/i, 'Gagal terhubung ke exchange (DNS error). Periksa koneksi internet Anda.'],
  [/no.*exchange/i, 'Anda belum menghubungkan exchange. Selesaikan onboarding terlebih dahulu.'],
  [/exchange.*not.*connect/i, 'Exchange belum terhubung. Selesaikan onboarding dulu.'],
  [/api_key.*decrypt|stored.*credential.*cannot/i, 'Kredensial exchange bermasalah. Silakan hubungkan ulang exchange Anda.'],

  // --- Guardrail errors (from execute-trade) ---
  [/guardrail.*fail/i, 'Salah satu aturan trading tidak terpenuhi. Periksa notifikasi di bawah.'],
  [/max.*position/i, 'Anda sudah memiliki posisi terbuka. Tutup posisi terlebih dahulu.'],
  [/maksimal.*posisi/i, 'Anda sudah memiliki posisi terbuka. Tutup posisi terlebih dahulu.'],
  [/max.*trade.*today/i, 'Anda sudah mencapai batas maksimal trade hari ini. Lanjutkan besok.'],
  [/maksimal.*trade.*hari/i, 'Anda sudah mencapai batas maksimal trade hari ini. Lanjutkan besok.'],
  [/daily.*loss.*limit/i, 'Batas kerugian harian sudah tercapai. Trading dilanjutkan besok.'],
  [/batas.*kerugian.*harian/i, 'Batas kerugian harian sudah tercapai. Trading dilanjutkan besok.'],
  [/total.*drawdown/i, 'Total drawdown sudah mencapai batas. Anda masuk mode evaluasi.'],
  [/account.*lock/i, 'Akun Anda sedang terkunci. Buka halaman Lock untuk detail.'],
  [/akun.*terkunci/i, 'Akun Anda sedang terkunci. Buka halaman Lock untuk detail.'],
  [/cooldown.*active|cooldown.*aktif/i, 'Anda sedang dalam cooldown. Tunggu hingga waktu cooldown selesai.'],
  [/min.*rr|minimal.*rr/i, 'RR ratio terlalu rendah untuk phase Anda saat ini. Pilih ratio yang lebih tinggi.'],
  [/martingale|revenge.*trading.*terdeteksi/i, 'Revenge trading terdeteksi. Tunggu beberapa menit sebelum trading lagi.'],
  [/averaging.*down.*block.*|averaging.*down.*diblokir/i, 'Averaging down tidak diizinkan. Jangan membuka posisi di harga yang lebih buruk.'],
  [/unsupported.*symbol.*tidak.*didukung/i, 'Pair ini tidak didukung. Pilih pair dari daftar yang tersedia.'],

  // --- Execute order errors (from CCXT) ---
  [/insufficient.*balance|insufficient.*margin/i, 'Saldo tidak mencukupi untuk membuka posisi ini.'],
  [/saldo.*tidak.*mencukupi/i, 'Saldo tidak mencukupi untuk membuka posisi.'],
  [/not.*enough.*margin/i, 'Margin tidak mencukupi. Kurangi persentase modal atau tambah saldo.'],
  [/order.*reject/i, 'Order ditolak oleh exchange. Periksa apakah posisi sudah ada yang terbuka.'],
  [/position.*size.*too.*small/i, 'Ukuran posisi terlalu kecil untuk exchange. Atur stop loss lebih rapat.'],
  [/min.*notional/i, 'Nilai posisi terlalu kecil. Perbesar ukuran posisi atau atur SL lebih rapat.'],
  [/market.*order.*fail/i, 'Gagal mengeksekusi market order. Coba lagi.'],
  [/limit.*order.*fail/i, 'Gagal mengeksekusi limit order. Coba lagi.'],
  [/stop.*loss.*fail|sl.*order.*fail/i, 'Gagal memasang Stop Loss. Hubungi dukungan.'],
  [/take.*profit.*fail|tp.*order.*fail/i, 'Gagal memasang Take Profit. Hubungi dukungan.'],
  [/setLeverage.*support.*linear/i, 'Pengaturan leverage tidak didukung untuk pair ini.'],
  [/leverage/i, 'Gagal mengatur leverage. Lanjut dengan leverage default.'],

  // --- Close trade errors ---
  [/trade.*not.*found/i, 'Trade tidak ditemukan. Mungkin sudah ditutup sebelumnya.'],
  [/already.*close/i, 'Trade sudah ditutup sebelumnya.'],
  [/close.*position.*fail/i, 'Gagal menutup posisi di exchange. Coba lagi.'],
  [/cancel.*order.*fail/i, 'Gagal membatalkan order SL/TP. Coba lagi.'],

  // --- Auth errors ---
  [/invalid.*login|invalid.*credential/i, 'Email atau password salah.'],
  [/email.*not.*confirm/i, 'Email belum diverifikasi. Cek inbox email Anda.'],
  [/user.*already.*regist/i, 'Email sudah terdaftar. Silakan login.'],
  [/password.*too.*short/i, 'Password minimal 6 karakter.'],
  [/weak.*password/i, 'Password terlalu lemah. Gunakan kombinasi huruf, angka, dan simbol.'],
  [/rate.*limit/i, 'Terlalu banyak permintaan. Tunggu beberapa saat dan coba lagi.'],
  [/unauthorized|invalid.*token|expired|jwt.*expired/i, 'Sesi Anda telah habis. Silakan login kembali.'],
  [/network.*request.*fail/i, 'Gagal terhubung ke server. Periksa koneksi internet Anda.'],

  // --- JSON / parse errors ---
  [/unexpected.*token.*json|invalid.*json/i, 'Data error dari server. Coba refresh halaman.'],
  [/internal.*server.*error/i, 'Terjadi kesalahan di server. Tim Garda sudah diberitahu. Coba lagi nanti.'],
  [/failed.*to.*fetch/i, 'Gagal terhubung ke server. Periksa koneksi internet Anda.'],
];

/**
 * Terjemahkan pesan error dari API/CCXT ke Bahasa Indonesia yang mudah
 * dimengerti. Jika tidak ada pattern yang cocok, kembalikan pesan asli
 * dengan fallback generic.
 */
export function translateError(message: string | null | undefined): string {
  if (!message || typeof message !== 'string') {
    return 'Terjadi kesalahan yang tidak diketahui. Coba lagi.';
  }

  // Coba semua pattern
  for (const [pattern, translation] of EXCHANGE_KEY_PATTERNS) {
    if (pattern.test(message)) {
      return translation;
    }
  }

  // Jika tidak ada pattern yang cocok, cari keyword umum
  const lower = message.toLowerCase();

  if (lower.includes('error') || lower.includes('fail') || lower.includes('error')) {
    return `Terjadi kesalahan: ${message.length > 80 ? message.slice(0, 80) + '...' : message}`;
  }

  // Fallback — kembalikan pesan asli (terpotong jika terlalu panjang)
  return message.length > 120
    ? message.slice(0, 120) + '...\nJika masih bermasalah, hubungi dukungan Garda.'
    : message;
}

/**
 * Format error dari edge function response.
 * Edge function bisa return `{ error: string }` atau `{ error: string, detail: string }`.
 */
export function formatEdgeError(err: any): string {
  if (!err) return 'Terjadi kesalahan yang tidak diketahui. Coba lagi.';

  if (typeof err === 'string') return translateError(err);

  if (err.error) {
    const base = translateError(err.error);
    // Jika ada detail teknis, append dalam parentheses pendek
    if (err.detail && typeof err.detail === 'string' && err.detail !== err.error) {
      return `${base}\n(${err.detail.slice(0, 60)}${err.detail.length > 60 ? '...' : ''})`;
    }
    return base;
  }

  if (err.message) return translateError(err.message);

  return 'Terjadi kesalahan yang tidak diketahui. Coba lagi.';
}
