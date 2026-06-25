Build the JuriXAI hackathon platform as a full UI scaffold with mock data (no backend yet). Using the **Terminal grid / trading cards** direction — dense data layout, monospace metadata, sharp bordered tiles, sticky judge sidebar with live ticker.

## Design tokens (locked from spec)

- `--background: #0A0A0A`
- `--foreground: #F1F5F9`
- `--muted: #94A3B8`
- `--accent: #00D8C8` (teal — scores, OPEN, CTAs)
- `--ai: #7C3AED` (purple — judge avatars)
- `--warn: #F59E0B` (amber — JUDGING, deadlines)
- `--border-dim: rgba(241,245,249,0.08)`
- Display: Inter Tight (700/800/900). Mono: JetBrains Mono.
- No gradient orbs, blobs, particles, glassmorphism.

## Routes (TanStack file-based)

```
src/routes/
  __root.tsx              global shell, fonts via <link>, sticky terminal nav, footer
  index.tsx               / — hero + stats bar + 6 hackathon cards + judge sidebar + leaderboard preview
  hackathons.tsx          /hackathons — filter pills (All/Open/Judging/Closed) + search + grid
  hackathons.$id.tsx      /hackathons/:id — header, prize pool + wallet, countdown, criteria, judge panel, tabs (Leaderboard | Submissions)
  hackathons.$id.submit.tsx       submission form, confirmation state
  hackathons.$id.project.$projectId.tsx   project detail + scoring breakdown table + judge activity feed + vote button
  create.tsx              /create — organizer wizard (dynamic criteria with weight validation, winner split editor, mock wallet created)
  admin.tsx               /admin — password gate (client-side localStorage check, simple password 'jurixai2026'), hackathon list, distribute prizes button with mock tx hashes
```

Each route gets its own `head()` with route-specific title/description/og tags.

## Shared components (`src/components/`)

- `TerminalNav` — sticky top bar: JuriX**AI** wordmark, system status dot, block number, truncated wallet, Launch CTA
- `StatsBar` — 4-cell grid with mono labels (ACTIVE_HACKATHONS, etc.)
- `HackathonCard` — bordered tile, status pill, prize, deadline countdown, submissions count, numbered (#001)
- `StatusPill` — variants: open (teal), judging (amber), closed (gray)
- `JudgePanel` — 5 judge tiles (Lexi/Mira/Aris/Nova/Sage) with status dot, verdict count, type label; lead judge highlighted in purple
- `JudgeActivityFeed` — timestamped mono log lines
- `ScoreBar` — `9.00 / 10.00` label + teal progress bar with mount animation
- `WalletAddress` — truncated mono `0x71A...3f9c` with copy icon (uses sonner toast)
- `Countdown` — `02D:14H:51M` ticker in amber, mono
- `CriteriaTable` / `ScoringBreakdownTable`
- `Leaderboard` — table with rank/project/wallet/composite/progress bar
- `LeptonBadge` — small footer note about Lepton Agents Hackathon track

## Mock data (`src/lib/mock-data.ts`)

- 6 hackathons: Solana Speedrun, Eth-Berlin Modular, Privacy First Build, Zk-Social Apps (CLOSED), Lepton Agents Showcase, Arc DeFi Sprint — with realistic organizers, USDC prize pools ($25k–$120k), deadlines, statuses
- 5 judges with verdict counts and per-judge `defaultFocus`
- ~8 projects across hackathons with full scoring breakdowns per criterion per judge
- Default criteria (6 from spec) and per-hackathon variations
- Mock Circle wallet addresses + tx hashes for closed hackathons
- Activity feed events

## Admin gate

Simple password gate (`ADMIN_PASSWORD` constant in code for scaffold). Modal/form on `/admin` — on submit, sets `sessionStorage.jurix_admin = '1'`. Real env-var + server check noted as a follow-up. This matches the user's "simple password gate" answer.

## Out of scope (follow-ups)

- Lovable Cloud / Supabase schema and CRUD
- Anthropic judging pipeline (`/api/judge-project`)
- Circle wallet creation + USDC transfers
- Supabase Realtime activity feed
- Server-side admin auth

The UI will look and feel like the real product, all interactions wired to mock state, ready for backend wiring next.

## Files to create/modify

- `src/styles.css` — replace token block with locked JuriXAI palette + JetBrains Mono / Inter Tight via Google Fonts `<link>` in `__root.tsx`
- `src/routes/__root.tsx` — add fonts, update meta, mount shared nav/footer
- `src/routes/index.tsx` — replace placeholder
- 7 new route files (above)
- ~12 component files under `src/components/jurix/`
- `src/lib/mock-data.ts`, `src/lib/format.ts` (truncate wallet, countdown)
