# Quick Start Guide

## 1️⃣ Database Setup (Do Once)

```sql
-- In Supabase SQL Editor, paste and run:
-- (full SQL in supabase-migration.sql)
```

## 2️⃣ Create Your Admin Account

```sql
-- After creating a user, make them admin:
INSERT INTO admins (user_id) VALUES ('your-user-uuid');
```

## 3️⃣ Test It Out

1. Start dev server: `npm run dev`
2. Click **Login** (top right)
3. Sign in with admin credentials
4. Play a track
5. Click the **↑ Promote** button
6. Check "Channels" → "Promoted" to see it

## That's It! 🎉

The Promote button now:
- ✅ Only shows for logged-in admins
- ✅ Saves to Supabase (not localStorage)
- ✅ Persists across sessions
- ✅ Syncs across devices

---

**Need Help?** Check `ADMIN_SETUP.md` for detailed instructions.
