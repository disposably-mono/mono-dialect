# mono—dialect

A word-guessing web game built under the Mono project brand. Extends the classic daily word format with a configurable roguelike run mode, a scoring system weighted by difficulty, and a social layer with global and friends leaderboards.

## Features

- **Daily Challenge** — one word per day, shared globally, standard Wordle rules
- **Roguelike Run Mode** — progressive session-based gameplay with scaling difficulty
  - Timed sub-mode — solve each word before the clock runs out
  - Lives sub-mode — limited lives across the run
- **Weighted Scoring** — multipliers tied to difficulty, time limits, and streak
- **Leaderboards** — global top 100 and friends-only filtered view
- **Auth** — anonymous play or sign in with Google for persistent stats and streaks
- **Dark / Light theme** — ships with both from day one

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Auth.js v5 (Google OAuth) |
| ORM | Prisma 7 |
| Database (local) | PostgreSQL 16 via Docker |
| Database (prod) | Supabase |
| Hosting | Vercel |

## Prerequisites

- Node.js 20+
- Docker Desktop
- A Google Cloud project with OAuth credentials (for auth)

## Local Development

**1. Clone the repo**
```bash
git clone git@github.com:disposably-mono/mono-dialect.git
cd mono-dialect
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**

Create a `.env` and `.env.local` at the project root:

**4. Start the database**
```bash
docker compose up -d
```

**5. Run migrations**
```bash
npx prisma migrate dev
```

**6. Start the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Prisma Studio — visual database browser:
```bash
npx prisma studio
# opens at http://localhost:5555
```

After any schema change:
```bash
npx prisma migrate dev --name <description>
npx prisma generate
```

## Project Structure

```
mono-dialect/
├── src/
│   ├── app/
│   │   ├── (game)/          # Daily challenge and roguelike pages
│   │   ├── leaderboard/
│   │   ├── profile/
│   │   └── api/             # All API routes
│   ├── components/
│   │   ├── game/            # Board, Keyboard, Tile, Timer
│   │   ├── ui/              # Modal, Toast, ThemeToggle
│   │   └── leaderboard/
│   └── lib/                 # db, auth, scoring, wordBank
├── prisma/
│   └── schema.prisma
├── public/
│   └── words/
│       └── en.json          # Curated word bank
├── prisma.config.ts
└── docker-compose.yml
```

## Scoring Formula

```
roundScore = (baseScore + lengthBonus) × difficultyMultiplier × subModeMultiplier × streakMultiplier

baseScore       = 100 × (guessesAllowed - guessesTaken + 1)
lengthBonus     = (wordLength - minLength) × 15
streakMultiplier = 1 + (consecutiveRounds × 0.05), capped at 2.00×
```

| Modifier | Range |
|----------|-------|
| Difficulty | Easy 1.00× / Hard 1.75× |
| Timed sub-mode | 1.25× – 2.00× |
| Lives sub-mode | 1.10× – 2.50× |

## Roadmap

- [x] Project scaffold + design tokens
- [x] Docker + PostgreSQL + Prisma schema
- [ ] Auth.js v5 Google OAuth
- [ ] Daily Challenge mode
- [ ] Roguelike Run mode
- [ ] Leaderboard + friends system
- [ ] Profile + stats panels
- [ ] Vercel production deployment

---

*A Mono project by Mikel Taopa*