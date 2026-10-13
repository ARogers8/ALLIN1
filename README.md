# ALLIN1

All-in-one fitness tracker: food, workouts, steps and daily weigh-ins, turned into one number for today — how much to eat to cut, maintain or bulk.

- **Accounts** — anyone can sign up with email and password; every user's data is separate.
- **Food logging** — type what you ate ("Philly cheesesteak from Subway") or snap a photo. Claude estimates the nutrition and asks follow-up questions (6-inch or footlong? which bread? sauces?) when the answer would change the calories. Anything you've logged before is remembered, so typing it again is instant, and you can copy yesterday's meals.
- **Workouts** — log sets × reps × weight for strength work and minutes/distance for cardio. Every exercise remembers your last sets, and any past workout can be repeated in one tap.
- **Steps** — enter your daily step count.
- **Weight** — weigh in daily; a smoothed trend line filters out water weight.
- **Calorie target** — built bottom-up from what you actually do, no subjective "activity level", then calibrated against your real weight trend.

## How the calorie target works

All the math lives in [`src/lib/energy.ts`](src/lib/energy.ts) and is unit tested in [`tests/energy.test.ts`](tests/energy.test.ts).

```
burn  = BMR (Mifflin-St Jeor: weight, height, age, sex)
      + 15% of BMR (digestion and non-step daily movement)
      + steps × body weight × 0.00045 kcal
      + workouts: (MET − 1) × body weight × hours, per exercise
target = burn × calibration + goal (± weekly rate × 7700 kcal/kg ÷ 7)
```

**Calibration.** Once there are 10+ days of food logs and 14+ days of weigh-ins in the last 4 weeks, ALLIN1 compares what you ate with how your trend weight moved: `real burn = average intake − weight slope × 7700`. The ratio between that and the formula becomes a correction factor (clamped to ±25%, blended in as more days are logged). If your weight drops faster than the formula predicts, your target goes up, and vice versa.

Protein is set to 2.0 g/kg when cutting and 1.8 g/kg otherwise, fat to 25% of calories, carbs fill the rest. Targets never go below 1,500 kcal (men) / 1,200 kcal (women).

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · Postgres + Prisma · Claude API (`claude-opus-5-5`) for food text and photo analysis · Recharts · Vitest.

## Running it locally

You need Node 20+ and Docker (for Postgres).

```bash
cp .env.example .env          # then fill in AUTH_SECRET and ANTHROPIC_API_KEY
docker compose up -d          # starts Postgres on localhost:5432
npm install
npm run db:migrate            # creates the tables
npm run db:seed               # optional: demo account with 5 weeks of history
npm run dev
```

Open http://localhost:3000. The demo account is `demo@allin1.app` / `demo1234`.

Food analysis needs an `ANTHROPIC_API_KEY` from https://console.anthropic.com. Everything else (manual food entry, saved foods, workouts, steps, weight) works without it.

## Deploying

### Vercel (easiest)

1. Go to https://vercel.com/new and import the `ALLIN1` repo. Don't deploy yet.
2. In the new project, open **Storage → Create Database → Neon (Postgres)** and connect it. This sets `DATABASE_URL` for you.
3. In **Settings → Environment Variables**, add `AUTH_SECRET` (any long random string) and `ANTHROPIC_API_KEY`.
4. Deploy. The `vercel-build` script applies database migrations before building, so tables are created automatically. Every pull request also gets its own preview URL.

### Anywhere else

Any Node host works (Vercel, Railway, Render, Fly). You need:

1. A Postgres database (Neon, Supabase, Railway, etc.) — set `DATABASE_URL`.
2. `AUTH_SECRET` — a long random string (`openssl rand -base64 32`).
3. `ANTHROPIC_API_KEY`.
4. Run `npm run db:deploy` once per release to apply migrations, then `npm run build && npm start`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit tests for the energy engine |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run db:migrate` | Create and apply a migration in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Create the demo account |

Nutrition and calorie numbers are estimates for guidance, not medical advice.
