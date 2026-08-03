# SECURITY ROTATION — URGENT

Repo `TlTANPRO/SYAHFALAH` (public) pernah men-track file dengan **Supabase service_role key hardcoded**. Meskipun sudah dihapus dari working tree, **git history lama masih bocor** di GitHub.

---

## Yang Harus Kamu Lakukan Sekarang (5-10 menit)

### 1. Rotate Supabase Keys

- Buka https://supabase.com/dashboard/project/wzwyiasnjzgnlmphqgkj/settings/api
- Klik **"Roll new service_role key"** (generate ulang)
- Klik **"Roll new anon key"** (generate ulang) — semua user yang sedang logged in akan logout
- **JANGAN paste key baru ke file manapun** — langsung set di Vercel env vars

### 2. Cek Vercel Environment Variables

- Buka https://vercel.com/dashboard → pilih project `syahfalah-dashboard`
- Settings → Environment Variables
- Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` (dari anon key baru)
- Update `SUPABASE_SERVICE_ROLE_KEY` (dari service_role key baru) — **JANGAN prefix `NEXT_PUBLIC_`!**
- Update VAPID keys kalau sebelumnya juga di file .env.local yang ke-attach
- Trigger redeploy

### 3. Audit Database Access (10 menit)

- Buka Supabase → Logs → API
- Filter by `service_role` atau `Authorization` mengandung JWT prefix `eyJ...`
- Cari query dari IP yang tidak kamu kenal
- Tanda bahaya: DELETE/UPDATE massal, query ke tabel users (password/PIN), tabel sensitive

### 4. Audit File .env.txt (yang ke-attach di chat tadi)

- Itu sudah compromised — anggap semua key di sana **bocor** juga
- Rotate: Supabase, VAPID, JWT secret, Google API key, semua yang ada di situ
- Update Windows Credential Manager / .env.local (yang di-gitignore) dengan key baru
- Hapus `.env.txt` dari Disk (bukan Recycle Bin, pake `sdel`)

---

## Yang Sudah Aku Kerjakan

| File | Status |
|------|--------|
| `PROGRESS_SUMMARY.md` | ✅ dihapus dari working tree + git tracked |
| `seed_remaining.py` | ✅ key hardcoded diganti `os.environ.get()` |
| `scripts/seed_remaining.py` | ✅ sama, duplikat |
| Scan JWT/credential pattern | ✅ no more leak di tracked files |

## Yang Masih Perlu Kamu

- **Force-push git history rewrite** — bisa hapus commit lama total, atau hapus specific file dari history. tanpa ini, scanner masih bisa ambil dari GitHub. pakai `git filter-repo` atau `bfg`:
  ```bash
  # install git-filter-repo: pip install git-filter-repo
  cd ~/SYAHFALAH
  git filter-repo --path PROGRESS_SUMMARY.md --path seed_remaining.py --path scripts/seed_remaining.py --invert-paths
  git remote add origin https://github.com/TlTANPRO/SYAHFALAH.git  # kalau perlu
  git push origin master --force
  ```
  ⚠️ force-push akan rewrite history — pastikan collaborator lain aware

- **Ganti PIN semua user dari 0000** (lihat DB `users` table — semua 13 user punya PIN default 0000, super mudah ditebak siapapun yang akses DB)

- **Set RLS policy lebih ketat** — `service_role` bypass RLS, jadi walaupun sudah rotate key, kalau attacker punya service_role, dia full access. pertimbangkan: jangan pakai service_role di client, batasi di server-side functions only.

---

## Pertanyaan

Kalau ada hal yang aku perlu pakai untuk verifikasi/fix dashboard, **pakai key BARU** (yang sudah di-rotate). cara aman:
1. Paste key baru **langsung di Vercel env vars** (bukan chat)
2. Atau via Windows Credential Manager:
   ```
   cmdkey /generic:supabase-service /user:default /pass:<paste-di-terminal-bukan-chat>
   ```
3. Beri tahu aku nama entry-nya saja, aku ambil tanpa echo balik

Setelah rotasi selesai, kasih tau — kita lanjut audit source code + fix dashboard.
