# Supabase setup (Day 1)

About 15 minutes in the Supabase dashboard. Nothing here needs code.

## 1. Create the tables

1. Open your project at supabase.com → **SQL Editor** → **New query**.
2. Paste the whole of [`supabase/schema.sql`](../supabase/schema.sql) and click **Run**. You should see "Success. No rows returned".
3. Check **Table Editor**: you should see `profiles`, `contacts`, `events`, `notes`, `ai_usage`, each marked with a shield (Row Level Security on).

## 2. Turn on email + password sign-in without confirmation emails

Supabase's built-in email sender only reaches your own project team (about 2 emails an hour), so classmates would never receive a confirmation email. For the class launch we skip confirmation:

1. **Authentication → Sign In / Providers → Email**: make sure **Email** is enabled.
2. Turn **Confirm email** **off**. Save.
3. **Authentication → URL Configuration**: set **Site URL** to your Vercel link (e.g. `https://nextcup-xxxx.vercel.app`) and add `http://localhost:5173` under **Redirect URLs**.

Password-reset emails will only reach team members until we add a custom email sender (e.g. Resend). Fine for the class demo.

## 3. Copy two values

**Project Settings → API Keys** (tab "Publishable and secret API keys"):

| Name in our app | Where to find it | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL, like `https://abcd1234.supabase.co` (also under **Connect**) | No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key, starts with `sb_publishable_` | No, it is meant for the browser; RLS protects the data |

Never use the **secret** key (`sb_secret_…`) in this app.

## 4. Put them in two places

- **Local:** add both lines to `.env.local` (see `.env.example`), then restart `npm run dev`.
- **Vercel:** Project → Settings → Environment Variables → add both (Production, Preview, Development), then redeploy.

## 5. Test

1. Open the app → **Launch workspace** → **Create account** with your email and a password.
2. Fill in your profile, add a contact, reload the page: the contact is still there.
3. Open the app on your phone, sign in with the same account: the same contact appears.
4. In Supabase **Table Editor → contacts** you'll see your row (the details are in the `data` column).

## For analysis later

`data` holds each record as JSON, so queries look like:

```sql
select data->>'name' as name, data->>'company' as company
from contacts
order by updated_at desc;
```

The `chat_funnel` view gives contacts added → chats scheduled → completed → followed up per user.
