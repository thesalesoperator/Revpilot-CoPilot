# RevPilot Copilot - AI Sales Performance Platform

A comprehensive AI-powered sales enablement platform for sales representatives featuring commission tracking, AI roleplay practice, real-time call coaching, and team performance analytics.

## Features

- **Sales Dashboard**: Track all your sales in one place
  - Add new sales with detailed payment plans
  - Track total cash collected, contracted value, and outstanding payments
  - View guaranteed and potential commissions
  - Mark sales as refunded when necessary
  - Edit and delete sales

- **Payment Tracking**: Manage payment schedules
  - Automatically generated payment schedules
  - Mark individual payments as paid
  - Track remaining payments

- **Sales Projections**: Plan your earnings
  - Add projected sales to calculate potential commissions
  - Quick scenarios for 5 or 10 sales
  - Goal calculations to hit income targets

- **Settings**: Customize your experience
  - Set up commission pay schedules
  - Save products for quick sale entry
  - Manage your profile

## Future Vision: True Real-Time AI Co-Pilot

The current coaching system provides valuable real-time suggestions with ~10-15 second latency. The future vision is to transform this into a true AI co-pilot that is **smarter than a human sales coach, faster, and effortless to use**.

### Current State vs. Future State

| Metric | Current | Future Goal |
|--------|---------|-------------|
| **Latency** | 11-16 seconds | <1 second |
| **Context** | Last 3000 chars + patterns | Full semantic memory |
| **Intelligence** | Reactive (post-hoc) | Predictive (anticipate) |
| **Effort** | Read suggestions | Zero cognitive load |

### Architecture: Four Pillars

#### 1. Streaming Intelligence Pipeline
- **Current:** 8-second transcript batching → GPT-4o (3-5s) → Display
- **Future:** Word-by-word processing → Streaming LLM → Token-by-token rendering
- **Impact:** 11-16s → 2-4s latency

#### 2. Multi-Tier Intelligence
```
┌─────────────────────────────────────────────────────────┐
│  TIER 1: Edge Detection (0-50ms)                        │
│  • Pattern matching in browser                          │
│  • Instant objection/buying signal alerts               │
│  • Real-time talk ratio, silence detection              │
├─────────────────────────────────────────────────────────┤
│  TIER 2: Fast Inference (200-500ms)                     │
│  • Claude Haiku / GPT-4o-mini                           │
│  • Quick contextual suggestions                         │
│  • Section transition guidance                          │
├─────────────────────────────────────────────────────────┤
│  TIER 3: Deep Reasoning (1-3s)                          │
│  • Claude Opus / GPT-4o                                 │
│  • Complex objection strategies                         │
│  • Deal qualification assessment                        │
└─────────────────────────────────────────────────────────┘
```

#### 3. Semantic Memory System
- **Working Memory:** Last 60 seconds of raw transcript
- **Episode Memory:** Key moments (pain reveals, objections, buying signals)
- **Semantic Memory:** Full call vectorized for retrieval
- **Cross-Call Learning:** What worked for this rep historically

**Key capability:** "They mentioned hating complexity earlier. Ask: 'Was it the complexity that frustrated your team with Salesforce?'"

#### 4. Predictive Guidance Engine
- **Conversation state machine** tracking discovery → qualification → presentation → close
- **Anticipation model** predicting what prospect will say next (with confidence scores)
- **Proactive nudges** preventing problems before they happen:
  - Rep talking 30+ seconds → "Pause and ask a question"
  - 5 minutes without budget discussion → "Good time to explore investment"
  - Approaching call end → "Secure commitment before they hang up"

### Ambient UI (Zero Cognitive Load)

Instead of a panel requiring attention, the future UI provides ambient awareness:

- **Glow Ring:** Subtle color around video (green=good, yellow=opportunity, red=objection)
- **Whisper Suggestions:** Small text near video that fades after 5 seconds
- **Heads-Up Display:** `[Pain: Data quality] [Budget: $50k] [Timeline: Q2]`
- **Audio Feedback:** Optional subtle chimes through separate device

### Why This Is Smarter Than a Human Coach

| Human Sales Coach | AI Real-Time System |
|-------------------|---------------------|
| Joins some calls | Every call, all the time |
| Remembers general patterns | Perfect recall of every word |
| Gives feedback after call | Guides during the call |
| One coaching style | Adapts to each rep |
| Processes one signal at a time | Monitors 20+ signals simultaneously |
| Limited to their experience | Learns from thousands of calls |

### Implementation Phases

1. **Streaming Foundation** - Remove batching, add streaming responses
2. **Edge Detection Layer** - Move pattern matching to browser for <100ms alerts
3. **Fast Inference Tier** - Add Haiku for quick suggestions (<500ms)
4. **Semantic Memory** - Vector embeddings + retrieval for perfect context
5. **Predictive Engine** - Anticipation model + proactive nudges

### Technical Requirements

- Edge compute (Cloudflare Workers) for <50ms pattern matching
- Vector database (Pinecone/pgvector) for semantic memory
- WebSocket infrastructure for streaming responses
- Multi-model orchestration (edge → fast → deep)

**Estimated cost:** $0.50-0.85 per call hour

## Tech Stack

- **Frontend**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/revpilot-copilot.git
cd revpilot-copilot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API

### 4. Configure environment variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
revpilot-commission-calculator/
├── chrome-extension/       # RevPilot Sales Coach Chrome Extension
│   ├── manifest.json       # Extension configuration
│   ├── background.js       # Service worker
│   ├── content.js          # Injected UI for coaching overlay
│   ├── offscreen.js        # Audio capture & Deepgram transcription
│   └── popup.js            # Extension popup
│
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # Backend API routes
│   │   │   ├── coaching/   # Real-time coaching endpoints
│   │   │   ├── practice/   # AI roleplay practice
│   │   │   └── community/  # Social features
│   │   ├── dashboard/      # Main sales dashboard
│   │   ├── coaching/       # Coaching sessions page
│   │   ├── practice/       # Roleplay practice page
│   │   └── settings/       # User settings & extension download
│   │
│   ├── components/
│   │   ├── layout/         # Layout components (Sidebar, etc.)
│   │   ├── ui/             # Reusable UI components
│   │   └── practice/       # Practice-specific components
│   │
│   └── lib/
│       ├── coaching/       # Coaching logic & AI prompts
│       ├── supabase/       # Database client setup
│       └── utils.ts        # Utility functions
│
├── public/
│   └── downloads/          # Chrome extension ZIP for download
│
├── docs/                   # Documentation
│   ├── GOOGLE_OAUTH_WEB_SETUP.md
│   ├── COMMUNITY_PLAN.md
│   └── LANDING_PAGE_STANDALONE.md
│
├── supabase/               # Database migrations
│
└── archive/                # Archived/unused code
    └── close-extension/    # Close CRM extension (not active)
```

## Color Scheme

- **Dark Background**: #00102e
- **Teal Accent**: #00ffc1
- **Orange Gradient**: #ff0043 → #ff9855 → #ffbe57

## Deployment

### Deploy on Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## License

MIT License
