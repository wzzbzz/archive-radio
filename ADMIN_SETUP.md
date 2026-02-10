# Admin Authentication & Promoted Tracks Setup

This guide explains how to set up admin authentication and the promoted tracks feature using Supabase.

## Features Added

1. **Admin Authentication**: Login system using Supabase Auth
2. **Admin-Only Promote Button**: Only logged-in admins can promote tracks
3. **Persistent Promotions**: Promoted tracks are stored in Supabase (not localStorage)
4. **Promoted Tracks Channel**: Virtual channel that displays all promoted tracks

## Database Setup

### 1. Run the Migration

Go to your Supabase dashboard:
- Navigate to **SQL Editor**
- Create a new query
- Copy and paste the contents of `supabase-migration.sql`
- Click **Run**

This creates:
- `admins` table: Stores which users are admins
- `promoted_tracks` table: Stores promoted track IDs
- Row Level Security (RLS) policies: Ensures only admins can promote/unpromote
- Indexes for performance

### 2. Create an Admin User

You need to manually create admin accounts:

**Option A: Through Supabase Dashboard**
1. Go to **Authentication > Users**
2. Click **Add User** (or invite via email)
3. Note the user's UUID
4. Go to **SQL Editor** and run:
   ```sql
   INSERT INTO admins (user_id) VALUES ('paste-user-uuid-here');
   ```

**Option B: Sign up through the app first**
1. Temporarily disable email confirmation in Supabase:
   - Go to **Authentication > Settings**
   - Toggle off "Enable email confirmations"
2. Create an account through the app's login modal
3. Go to **Authentication > Users** and find the new user
4. Copy their UUID
5. Run the SQL query above to make them an admin
6. Re-enable email confirmations

### 3. Verify Setup

1. Start your development server: `npm run dev`
2. Click the **Login** button in the top right
3. Sign in with your admin credentials
4. Play a track and verify the Promote button (↑) appears
5. Click Promote and check that it persists after refresh

## How It Works

### Authentication Flow

1. User clicks **Login** button → Opens modal
2. Enters email/password → Supabase Auth validates
3. App checks `admins` table → Sets `isAdmin` flag
4. If admin: Promote button becomes visible

### Promote Flow

1. Admin clicks Promote button on a track
2. App calls `togglePromote()` which:
   - Inserts into `promoted_tracks` table (if promoting)
   - Deletes from `promoted_tracks` table (if unpromoting)
3. Updates UI state immediately
4. Data persists across sessions

### Security

- **RLS Policies**: Only admins can insert/delete from `promoted_tracks`
- **Public Read**: Anyone can see which tracks are promoted
- **Auth Required**: Must be logged in to promote/unpromote

## Files Modified

- `src/store/useAuthStore.ts` - New auth state management
- `src/store/usePlayerStore.ts` - Updated to sync with Supabase
- `src/components/LoginModal.tsx` - New login UI
- `src/App.tsx` - Added login button & conditional Promote button
- `supabase-migration.sql` - Database schema

## Environment Variables

Make sure these are set in your `.env.local`:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Troubleshooting

**"Failed to load promoted tracks"**
- Check that the migration ran successfully
- Verify RLS policies are enabled

**Login button doesn't appear**
- Make sure LoginModal is imported in App.tsx
- Check browser console for errors

**Promote button doesn't show after login**
- Verify user is in the `admins` table
- Check `isAdmin` state in browser dev tools

**Promotions don't persist**
- Check browser console for Supabase errors
- Verify RLS policies allow your admin to insert/delete
