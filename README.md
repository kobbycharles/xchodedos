# xchodedos — Hire Purchase Car Management

A mobile-first web app for managing hire purchase vehicles, drivers, leads, and relationship officers.

---

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (no framework, mobile-first)
- **Backend/Auth/DB:** [Supabase](https://supabase.com)
- **Hosting:** [Vercel](https://vercel.com)
- **Source control:** GitHub

---

## User Roles
| Role | Description |
|---|---|
| `lead` | Registered individual going through onboarding |
| `driver` | Approved lead assigned a vehicle |
| `relationship_officer` | Manager monitoring assigned drivers |
| `super_admin` | Full system access |

---

## Project Structure
```
xchodedos/
├── index.html              ← Login page
├── manifest.json           ← PWA manifest
├── vercel.json             ← Vercel routing config
├── supabase_schema.sql     ← Full DB schema + RLS
├── css/
│   └── app.css             ← Global design tokens & styles
├── js/
│   ├── supabase.js         ← Supabase client
│   ├── auth.js             ← Auth helpers & role routing
│   └── toast.js            ← Toast notifications
└── pages/
    ├── driver/             ← Driver module pages
    ├── officer/            ← Relationship Officer pages
    ├── admin/              ← Super Admin pages
    └── lead/               ← Lead status pages
```

---

## Setup Instructions

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full contents of `supabase_schema.sql`
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon / public` key
4. Paste both into `js/supabase.js`

### 2. Create your first Super Admin
In Supabase **SQL Editor**:
```sql
-- After signing up via the app, promote yourself to super_admin:
update profiles
set role = 'super_admin'
where email = 'your@email.com';
```

### 3. GitHub
```bash
git init
git add .
git commit -m "feat: project foundation + auth"
git branch -M main
git remote add origin https://github.com/kobbycharles/xchodedos.git
git push -u origin main
```

### 4. Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `xchodedos` GitHub repo
3. Leave all build settings as default (static site)
4. Click **Deploy**

---

## Modules Roadmap
- [x] Task 1: Foundation — project structure, Supabase schema, auth, login page
- [ ] Task 2: Super Admin dashboard + RO account creation
- [ ] Task 3: Relationship Officer dashboard + lead creation
- [ ] Task 4: Lead pipeline (tests, guarantors, deposit)
- [ ] Task 5: Driver assignment + fleet management
- [ ] Task 6: Driver dashboard + car details
- [ ] Task 7: Payment recording + history
- [ ] Task 8: Daily pre-use check form + RO approval
- [ ] Task 9: PWA polish + push notifications
- [ ] Task 10: RLS audit + production hardening
