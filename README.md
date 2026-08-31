# Vaultra — Secure File Storage Service

A production-grade secure file storage and sharing service built with TanStack Start, Firebase, and React. Users can upload files up to 1 GB, keep them private by default, and share them through expiring signed links.

## Live Demo

https://vaultra-one.vercel.app/

## Repository

https://github.com/Kenny01-code/Vaultra

## Tech Stack

- **Frontend**: React 19, TanStack Start (SSR), TanStack Router, TanStack Query
- **Auth**: Firebase Authentication (Email/Password, Google, GitHub, Apple)
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage
- **Styling**: Tailwind CSS v4, Radix UI
- **Language**: TypeScript (strict)

---

## Local Development

### Prerequisites

- Node.js v18+ (v26 works fine)
- npm v9+

### 1. Clone and install

```sh
git clone https://github.com/Kenny01-code/Vaultra.git
cd Vaultra
npm install
```

### 2. Set up environment variables

Copy `.env` and fill in the values:

```sh
copy .env .env.local
```

The `.env` file already has the Firebase client config. You only need to add `FIREBASE_SERVICE_ACCOUNT` for server functions.

**Getting the service account key:**
1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Project Settings → Service Accounts
3. Click **Generate new private key** → Download JSON
4. Minify the JSON to one line (use https://jsonformatter.org/json-minify)
5. Paste it as the value: `FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'`

### 3. Run the dev server

```sh
npm run dev
```

Open http://localhost:3000

---

## Firebase Setup

### Enable Authentication Providers

Go to [Firebase Console](https://console.firebase.google.com) → Authentication → Sign-in method:

#### Email/Password
- Click **Email/Password** → Enable → Save

#### Google
- Click **Google** → Enable
- Set your project support email
- Save

#### GitHub OAuth — Step by Step

1. **Create a GitHub OAuth App:**
   - Go to https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
   - Application name: `Vaultra`
   - Homepage URL: `https://vaultra-1a74a.firebaseapp.com` (or your custom domain)
   - Authorization callback URL: `https://vaultra-1a74a.firebaseapp.com/__/auth/handler`
   - Click **Register application**
   - Copy the **Client ID**
   - Click **Generate a new client secret** → Copy the **Client Secret**

2. **Add to Firebase:**
   - Firebase Console → Authentication → Sign-in method → GitHub
   - Enable it
   - Paste the **Client ID** and **Client Secret** from GitHub
   - Save

#### Apple Sign-In
- Requires an Apple Developer account ($99/year)
- Firebase Console → Authentication → Apple → follow the setup wizard
- You need: Service ID, Team ID, Key ID, and a private key from Apple Developer portal

### Deploy Firestore Rules

```sh
npm install -g firebase-tools
firebase login
firebase use vaultra-1a74a
firebase deploy --only firestore:rules,firestore:indexes
```

### Deploy Storage Rules

```sh
firebase deploy --only storage
```

### Create Firestore Indexes

The `firestore.indexes.json` file defines the required composite indexes. Deploy them:

```sh
firebase deploy --only firestore:indexes
```

Or create them manually in Firebase Console → Firestore → Indexes:
- Collection: `files` | Fields: `owner_id ASC`, `created_at DESC`
- Collection: `files` | Fields: `share_token ASC`, `is_public ASC`

### Firebase Storage Bucket

Make sure your storage bucket is set up:
1. Firebase Console → Storage → Get Started
2. Choose a region close to your users
3. Start in **production mode** (rules are deployed separately)

---

## Deploying to GitHub + Hosting

### Push to GitHub

```sh
# Install Git first if not installed
choco install git -y
# Restart terminal, then:

git init
git add .
git commit -m "Initial commit — Vaultra secure file vault"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### Deploy Options

#### Option A: Firebase Hosting (recommended — free tier)

```sh
npm run build
firebase deploy --only hosting
```

Your app will be live at `https://vaultra-1a74a.web.app`

#### Option B: Vercel

1. Push to GitHub
2. Go to https://vercel.com → New Project → Import your repo
3. Add all environment variables from `.env` in Vercel's dashboard
4. Deploy

**Important:** Add `FIREBASE_SERVICE_ACCOUNT` as an environment variable in Vercel — paste the minified JSON.

#### Option C: Netlify

1. Push to GitHub
2. Go to https://netlify.com → Add new site → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist/public`
5. Add environment variables in Site Settings → Environment Variables

### Connecting Frontend + Backend

This app uses **TanStack Start server functions** — the frontend and backend are the same Node.js process. There is no separate backend server to deploy. When you deploy to Vercel/Netlify/Firebase Hosting with SSR, the server functions run as serverless functions automatically.

The only connection needed is:
- `VITE_FIREBASE_*` vars → used by the browser (client)
- `FIREBASE_SERVICE_ACCOUNT` → used by server functions (Admin SDK)

---

## Security Rules

### Firestore (`firestore.rules`)

Key rules:
- Users can only read/write their own files (`owner_id == request.auth.uid`)
- Public files (`is_public == true`) are readable by anyone — needed for share links
- File size validated server-side (Admin SDK bypasses rules, but client writes are blocked over 1 GB)
- User roles can only be written by the Admin SDK (server) — never by clients
- All other paths are denied

### Storage (`storage.rules`)

Key rules:
- Files must be under `vault/{userId}/` — enforces ownership at path level
- Max 1 GB per file
- Blocked MIME types: executables, PHP, HTML, SVG, shell scripts (OWASP)
- No public reads — all downloads go through server-issued signed URLs

---

## Architecture

```
Browser
  └── TanStack Router (client-side navigation)
       └── TanStack Start (SSR + server functions)
            ├── Firebase Auth (client SDK) — session management
            ├── Firestore (client SDK) — file metadata queries
            └── Server Functions (Admin SDK)
                 ├── createUploadTicket — validates quota, issues signed PUT URL
                 ├── finalizeUpload — verifies file exists, creates Firestore record
                 ├── getOwnedFileUrl — issues signed GET URL (5 min TTL)
                 ├── setFileVisibility — toggle public/private
                 ├── renameFile — sanitized rename
                 ├── deleteFile — removes from Storage + Firestore
                 └── getSharedFile — public share endpoint (no auth required)
```

### Upload Flow

1. Browser calls `createUploadTicket` server fn → validates file type/size/quota → returns Firebase Storage signed PUT URL
2. Browser PUTs file directly to Firebase Storage (bypasses server — no bandwidth cost)
3. Browser calls `finalizeUpload` server fn → Admin SDK verifies file exists → creates Firestore record
4. File appears in vault

### Share Link Flow

1. User toggles file to public → `setFileVisibility` updates Firestore
2. Share link: `https://yourapp.com/s/<share_token>`
3. Share page calls `getSharedFile` → Admin SDK fetches file → issues 10-min signed URL
4. Visitor downloads directly from Firebase Storage

---

## Performance Optimizations

- **Self-hosted fonts** — Sora, Inter Tight, JetBrains Mono served from `/public/fonts/` — eliminates render-blocking Google Fonts request (~300ms saved on first load)
- **Lazy loading** — CinematicVault, IPhoneFrame, FilePreviewDialog loaded on demand
- **content-visibility: auto** — below-fold sections skip rendering until scrolled into view
- **TanStack Query** — aggressive caching (staleTime 20s, gcTime 5min), no refetch on window focus
- **Route preloading** — links preload on hover/focus (`defaultPreload: "intent"`)
- **GPU layers** — animated elements promoted to compositor with `translateZ(0)`
- **DNS prefetch** — Firebase endpoints prefetched on page load

---

## Assignment Checklist

| Requirement | Status |
|---|---|
| User registration + login | ✅ Email/password + Google/GitHub/Apple OAuth |
| File upload (100 MB+, up to 1 GB) | ✅ Signed URL direct-to-storage upload |
| Upload progress | ✅ XHR progress events |
| File validation | ✅ Type, size, MIME, extension (OWASP) |
| Private files (owner-only) | ✅ Firestore rules + Storage rules + server auth |
| Public files via share link | ✅ Expiring signed URLs via share token |
| File management (rename, delete, toggle) | ✅ Full CRUD |
| Quota tracking | ✅ Per-user quota with live storage meter |
| Responsive design | ✅ Mobile-first, xs/sm/md/lg/xl breakpoints |
| Error handling | ✅ Toast notifications, server error boundaries |
| TypeScript | ✅ Strict mode, zero errors |
| Security rules | ✅ Firestore + Storage production rules |
| Documentation | ✅ This README |
