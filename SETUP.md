# Setup Guide - Alwahaa Technical Services

## Quick Start (5 minutes)

### Step 1: Create Supabase Project

1. Go to [database.new](https://database.new) or [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. **Organization**: Your account
4. **Project name**: `alwahaa-pools`
5. **Database Password**: Create a strong password (save this!)
6. **Region**: `Southeast Asia (Singapore)` - closest to UAE
7. Click "Create new project" (wait ~2 minutes)

### Step 2: Get Your API Keys

1. In your Supabase Dashboard, click **Project Settings** (gear icon)
2. Go to **API** in the sidebar
3. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public** API key: `eyJhbGciOiJIUzI1NiIs...`

### Step 3: Run Database Schema

1. In Supabase Dashboard, click **SQL Editor**
2. Click **New query**
3. Copy entire contents of `supabase/schema.sql` from this project
4. Paste into SQL Editor
5. Click **Run** (you'll see green checkmarks)

### Step 4: Configure Your App

**Option A - Using the setup script:**
```bash
cd /Users/riyazurrahman/Desktop/alwahaa-pools
./setup-env.sh
# Enter your Supabase URL and Anon Key when prompted
```

**Option B - Manual:**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Step 5: Create First Admin User

1. In Supabase Dashboard, go to **Authentication > Users**
2. Click **Add User**
3. Enter:
   - Email: your admin email
   - Password: secure password
4. Click **Create User**
5. Go to **SQL Editor** and run:

```sql
INSERT INTO app_users (id, email, full_name, role)
SELECT id, email, 'Administrator', 'admin'
FROM auth.users
WHERE email = 'your-email@example.com';
```

### Step 6: Run the App

```bash
cd /Users/riyazurrahman/Desktop/alwahaa-pools
npm run dev
```

Open http://localhost:3001 and login with your credentials!

---

## Adding Sample Data (Optional)

After setup, you can add sample clients/vendors by running in SQL Editor:

```sql
-- Copy contents from supabase/seed.sql
```

---

## Troubleshooting

### "Failed to connect to Supabase"
- Check your `.env.local` has correct URL and key
- Ensure URL starts with `https://` and has no trailing slash

### "relation does not exist" errors
- Schema wasn't run properly - re-run `supabase/schema.sql` in SQL Editor

### Can't login
- Ensure user exists in **Authentication > Users**
- Ensure user also exists in `app_users` table (check via Table Editor)

### Permission denied errors
- RLS policies are set to allow all for development
- In production, tighten policies based on roles

---

## Production Checklist

Before deploying to production:

- [ ] Change RLS policies to restrict by role
- [ ] Enable Row Level Security on all tables
- [ ] Set up proper redirect URLs in Auth settings
- [ ] Configure SMTP for email confirmations
- [ ] Enable database backups
- [ ] Set up separate staging environment

---

## Support

- Next.js docs: https://nextjs.org/docs
- Supabase docs: https://supabase.com/docs
- Tailwind docs: https://tailwindcss.com/docs
