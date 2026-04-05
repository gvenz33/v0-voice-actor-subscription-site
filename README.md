# v0-voice-actor-subscription-site

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_SCtTRxRpYsTIcJSn6RkryhAt68Nc)

## One-time Supabase setup (email + calendar)

The app expects two tables: `public.email_accounts` and `public.calendar_sources`. You create them once in your Supabase project.

**You are not typing a filename into SQL.** Supabase only runs SQL text. You copy the **contents** of a file from this repo and paste them into the editor.

### Steps (about two minutes)

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** and select **your project** (the one whose URL matches `NEXT_PUBLIC_SUPABASE_URL` in Vercel / `.env.local`).
2. In the left sidebar, click **SQL Editor**.
3. Click **New query** (empty editor).
4. On your computer, open this file in the repo: **`scripts/email-accounts-and-calendar-sources.sql`**.
5. Select **everything** in that file (`Cmd+A` / `Ctrl+A`), **Copy** (`Cmd+C` / `Ctrl+C`).
6. Click in the Supabase SQL editor and **Paste** (`Cmd+V` / `Ctrl+V`). You should see SQL starting with `create table if not exists public.email_accounts`.
7. Click **Run** (or press the shortcut shown in the editor). Wait until it finishes with **Success** (no red error).

### How to know it worked

- In the left sidebar, open **Table Editor**.
- You should see tables **`email_accounts`** and **`calendar_sources`** under schema **`public`**.
- Refresh your live app’s **Settings → Email** page; the “run SQL migration” warning should go away.

If Run shows an error, copy the **full error message** (and which line it mentions) into an issue or chat—do not paste your database password or service role key.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/gvenz33/v0-voice-actor-subscription-site" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
