# 🛡️ Garda — Production Setup Guide

## Prasyarat

Pastikan sudah terinstall:
```bash
node -v   # harus v20+
npm -v    # harus v10+
npx supabase --version  # harus ada (install: npm i -g supabase)
git -v
```

---

## STEP 1 — Buat Supabase Project

1. Buka **[supabase.com/dashboard](https://supabase.com/dashboard)**
2. Login (GitHub/Google)
3. Klik **"+ New Project"** (tombol hijau kanan atas)
4. Pilih organization (atau buat baru)
5. Isi form:
   ```
   Name:       garda
   Database Password: <generate random 16+ karakter>
   Region:     Southeast Asia (Singapore)
   Pricing:    Free ($0)
   ```
6. Klik **"Create project"** — tunggu ~2 menit sampai status jadi "Active"
7. Buka **Settings → API** (sidebar kiri), catat:
   - `Project URL` → contoh: `https://abcd1234.supabase.co`
   - `anon public` key → contoh: `eyJhbGciOiJIUzI1NiIs...` (pakai yang anon/public)
   - `service_role` key → contoh: `eyJhbGciOiJIUzI1NiIs...` (RAHASIA, jangan commit!)

---

## STEP 2 — Isi `.env.local`

Buka file `.env.local` di root project. Ganti placeholder:

```bash
VITE_SUPABASE_URL=https://abcd1234.supabase.co      # ← ganti dengan Project URL
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...      # ← ganti dengan anon public key
VITE_APP_NAME=Garda
VITE_APP_URL=http://localhost:5173
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...   # ← ganti dengan service_role key
API_KEY_ENCRYPTION_SECRET=_DS0PGjjsqJA4n7BAzzSs5NWUHwlWfWXyFaPyVN3pIw
```

> ⚠️ **PENTING**: `SUPABASE_SERVICE_ROLE_KEY` dan `API_KEY_ENCRYPTION_SECRET` jangan pernah di-commit ke Git. File `.env.local` sudah di `.gitignore`.

---

## STEP 3 — Jalankan SQL Migration

### Option A: Via Supabase Dashboard (paling gampang)

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → project `garda`
2. Sidebar kiri → **SQL Editor**
3. Klik **"+ New Query"**
4. Buka file `supabase/migrations/001_initial_schema.sql` di laptop
5. Copy seluruh isinya
6. Paste ke SQL Editor
7. Klik **"Run"** (tombol hijau kanan bawah)
8. Harus muncul: `Results: Success. No rows returned.`

### Option B: Via Supabase CLI (kalau sudah setup)

```bash
cd /Users/ezra/Documents/workspace/WebApplication/Garda

# Login ke Supabase
supabase login

# Link ke project (ganti xxx dengan project ref dari Dashboard → Settings → General)
supabase link --project-ref xxxxxxxxxxxxxxxx

# Push migration
supabase db push
```

### Verifikasi

Cek di **Table Editor** (sidebar kiri), harus muncul 7 tabel:
- `profiles`
- `trades`
- `lock_events`
- `daily_stats`
- `equity_snapshots`
- `referrals`
- `app_config`

Cek `app_config` harus sudah terisi 7 row default config.

---

## STEP 4 — Setup Google OAuth

### 4.1 — Buat Google Cloud Project

1. Buka **[console.cloud.google.com](https://console.cloud.google.com)**
2. Buat project baru: **"Garda"**
3. Sidebar kiri → **APIs & Services** → **Credentials**
4. Klik **"+ CREATE CREDENTIALS"** → **OAuth client ID**
5. Klik **"Configure Consent Screen"**:
   - User Type: **External**
   - App name: **Garda**
   - User support email: email kamu
   - Developer contact: email kamu
   - Scopes: email, profile, openid (default)
   - Save and continue

6. Kembali ke **Credentials** → **"+ CREATE CREDENTIALS"** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Garda Web`
   - Authorized redirect URIs:
     ```
     https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
     ```
     (ganti YOUR_PROJECT_ID dengan ID dari Supabase Dashboard URL)
   - Klik **Create**
7. Catat **Client ID** dan **Client Secret**

### 4.2 — Konfigurasi di Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → project `garda`
2. Sidebar kiri → **Authentication** → **Providers**
3. Cari **Google** → klik toggle ON
4. Isi:
   - **Client ID**: dari Google Cloud (step 4.1 no 7)
   - **Client Secret**: dari Google Cloud (step 4.1 no 7)
   - **Skip nonce check**: ✅ (centang)
5. Klik **Save**

### 4.3 — Test Google OAuth

1. Jalankan app: `npm run dev`
2. Buka `http://localhost:5173/register`
3. Klik **"Daftar dengan Google"**
4. Pilih akun Google → harus redirect kembali ke app

---

## STEP 5 — Deploy Edge Functions

```bash
cd /Users/ezra/Documents/workspace/WebApplication/Garda

# Login Supabase CLI (sekali)
supabase login

# Link ke project (sekali)
supabase link --project-ref YOUR_PROJECT_REF

# Set environment variables untuk Edge Functions
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
supabase secrets set API_KEY_ENCRYPTION_SECRET=_DS0PGjjsqJA4n7BAzzSs5NWUHwlWfWXyFaPyVN3pIw

# Deploy semua functions
supabase functions deploy ccxt-proxy
supabase functions deploy execute-trade
supabase functions deploy close-trade
```

---

## STEP 6 — Deploy Frontend ke Vercel

1. Push code ke GitHub:
```bash
cd /Users/ezra/Documents/workspace/WebApplication/Garda
git init
git add .
git commit -m "Initial commit: Garda v1.0"

# Buat repo di GitHub, lalu:
git remote add origin https://github.com/YOUR_USERNAME/garda.git
git push -u origin main
```

2. Buka **[vercel.com](https://vercel.com)**
3. Login → **"New Project"**
4. Import repo `garda` dari GitHub
5. Framework: **Vite** (auto-detected)
6. Environment Variables:
   ```
   VITE_SUPABASE_URL       = https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY  = eyJhbGciOiJIUzI1NiIs...
   VITE_APP_NAME           = Garda
   VITE_APP_URL            = https://garda.vercel.app
   ```
7. Klik **Deploy**

---

## Checklist Production Readiness

- [ ] Supabase project running di Singapore
- [ ] `.env.local` semua sudah diisi
- [ ] SQL migration dijalankan (7 tabel + RLS)
- [ ] `app_config` terisi 7 row default
- [ ] Google OAuth working
- [ ] Edge Functions deployed (ccxt-proxy, execute-trade, close-trade)
- [ ] Frontend deployed ke Vercel
- [ ] PWA icons branded (ganti dari placeholder hitam polos)
- [ ] Domain custom (opsional)
- [ ] SSL enabled (auto dari Vercel + Supabase)

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Gagal konek ke Supabase | Cek `VITE_SUPABASE_URL` dan anon key di `.env.local` |
| Google OAuth "redirect_uri_mismatch" | Cek authorized redirect URI di Google Cloud Console, harus persis `https://[project-id].supabase.co/auth/v1/callback` |
| Edge Function timeout | Cek billing Supabase (free tier limited 500K invocations/bulan) |
| RLS error "new row violates row-level security" | Pastikan trigger `handle_new_user` sudah di-create dan jalan |
| `supabase link` gagal | Generate access token: Dashboard → Settings → Access Tokens → Generate new token |

---

## Kontak

- Supabase docs: https://supabase.com/docs
- Supabase support: https://github.com/supabase/supabase/discussions
- Garda issues: buka issue di repo GitHub
