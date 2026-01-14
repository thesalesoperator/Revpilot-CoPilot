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

The current platform has two AI-powered features that will share the same architectural evolution:
1. **Live Coaching** (Chrome Extension) - Real-time guidance during actual sales calls
2. **AI Roleplay Practice** (Vapi-powered) - Practice with AI prospects before real calls

Both features will be transformed into a true AI co-pilot that is **smarter than a human sales coach, faster, and effortless to use**.

---

### Current State Analysis

#### Live Coaching (Chrome Extension)

| Component | Current Implementation | Bottleneck |
|-----------|----------------------|------------|
| Audio Capture | Tab capture → Deepgram | 8-second batching delay |
| Transcription | Deepgram WebSocket (nova-2) | Near real-time ✓ |
| Analysis | GPT-4o inference | 2-5 second response time |
| Context | Last 3000 chars + regex patterns | Limited semantic understanding |
| Suggestions | Reactive (post-hoc) | 11-16 second total latency |

#### AI Roleplay Practice

| Component | Current Implementation | Bottleneck |
|-----------|----------------------|------------|
| Voice | Vapi (STT) → OpenAI → 11Labs (TTS) | 2-4 second round-trip |
| Analysis | GPT-4o-mini every 10 seconds | Only objective checking |
| Context | Per-turn transcript only | No semantic accumulation |
| Feedback | Batch analysis after call ends | No real-time coaching |
| Persona | Static personality | No adaptive difficulty |

---

### Unified Architecture: Four Pillars

Both features will share the same core infrastructure:

#### 1. Streaming Intelligence Pipeline

**Live Coaching:**
```
Current:  Audio → 8s buffer → GPT-4o (3-5s) → Display
Future:   Audio → Utterance-based → Streaming LLM → Token-by-token
Impact:   11-16s → 2-4s latency
```

**Practice:**
```
Current:  Speech → Vapi → OpenAI (batch) → TTS → Audio
Future:   Speech → Streaming STT → Streaming LLM → Streaming TTS
Impact:   2-4s → <1s perceived latency (first token)
```

#### 2. Multi-Tier Intelligence

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1: Edge Detection (0-50ms)                                │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │     LIVE COACHING       │  │      PRACTICE               │  │
│  │  • Objection detection  │  │  • Objective completion     │  │
│  │  • Buying signal alerts │  │  • Rapport indicators       │  │
│  │  • Talk ratio monitor   │  │  • Silence detection        │  │
│  │  • Silence detection    │  │  • Persona mood tracking    │  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  TIER 2: Fast Inference (200-500ms) - Claude Haiku/GPT-4o-mini  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │     LIVE COACHING       │  │      PRACTICE               │  │
│  │  • Quick suggestions    │  │  • Real-time technique tips │  │
│  │  • Section transitions  │  │  • "Try asking about..."    │  │
│  │  • Follow-up questions  │  │  • Course corrections       │  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  TIER 3: Deep Reasoning (1-3s) - Claude Opus/GPT-4o             │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │     LIVE COACHING       │  │      PRACTICE               │  │
│  │  • Complex objections   │  │  • Adaptive persona         │  │
│  │  • Deal qualification   │  │  • Dynamic difficulty       │  │
│  │  • Closing strategy     │  │  • Post-call deep analysis  │  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. Semantic Memory System

**Shared Infrastructure:**
```
┌────────────────────────────────────────────────────────────────┐
│                    SEMANTIC MEMORY LAYER                        │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  WORKING MEMORY  │  │  EPISODE MEMORY  │  │ SKILL MEMORY │ │
│  │   (Last 60 sec)  │  │  (Key moments)   │  │ (Cross-call) │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│          ↓                      ↓                    ↓         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              RETRIEVAL-AUGMENTED COACHING               │  │
│  │                                                         │  │
│  │  Live Coaching:                                         │  │
│  │  "They mentioned hating complexity earlier. Ask:        │  │
│  │   'Was complexity the main issue with Salesforce?'"     │  │
│  │                                                         │  │
│  │  Practice:                                              │  │
│  │  "Last 3 calls, you struggled with price objections.    │  │
│  │   This persona will test that - practice your reframe." │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

**Live Coaching Memory:**
- Full call transcript (vectorized)
- Key info extracted (pain, budget, timeline, decision makers)
- Script progress and section coverage
- Previous suggestions (avoid repetition)

**Practice Memory:**
- Skill progression per competency
- Weakness identification (which objections they struggle with)
- Persona performance history
- Technique effectiveness (what worked before)

#### 4. Predictive Guidance Engine

**Live Coaching:**
- Conversation state machine (discovery → qualification → presentation → close)
- Anticipation of prospect responses
- Proactive nudges (talk ratio, missing qualification, approaching close)

**Practice:**
- Adaptive persona difficulty (gets harder as you improve)
- Dynamic objection injection (targets your weak spots)
- Skill-based challenge selection
- Real-time technique coaching (not just objective tracking)

---

### Practice-Specific Enhancements

#### Real-Time Coaching During Practice

**Current:** Only tracks objective completion every 10 seconds
**Future:** Full coaching experience during practice calls

```
┌────────────────────────────────────────────────────────────────┐
│               PRACTICE CALL COACHING OVERLAY                    │
│                                                                 │
│  ┌─────────────┐  ┌─────────────────────────┐  ┌────────────┐ │
│  │  TECHNIQUE  │  │      LIVE TRANSCRIPT     │  │  PERSONA   │ │
│  │    TIPS     │  │                          │  │   STATE    │ │
│  │             │  │  Rep: "What challenges   │  │            │ │
│  │  💡 Good    │  │   are you facing?"       │  │  😐 Neutral│ │
│  │  discovery  │  │                          │  │            │ │
│  │  question!  │  │  AI: "Well, honestly     │  │  Interest: │ │
│  │             │  │   things are fine..."    │  │  ████░░ 60%│ │
│  │  Try:       │  │                          │  │            │ │
│  │  "What would│  │                          │  │  Resistance│ │
│  │  need to    │  │                          │  │  ██░░░░ 30%│ │
│  │  change?"   │  │                          │  │            │ │
│  └─────────────┘  └─────────────────────────┘  └────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OBJECTIVES                    │  SKILLS BEING TESTED    │  │
│  │  ☑ Build rapport              │  Discovery: ████████░░  │  │
│  │  ☐ Establish value            │  Objection: ██████░░░░  │  │
│  │  ☐ Handle objection           │  Closing:   ████░░░░░░  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

#### Adaptive AI Personas

**Current:** Static personality, same difficulty every time
**Future:** Personas that learn and adapt

```
Persona Adaptation:

1. DIFFICULTY SCALING
   • Rep aced last 3 calls → Persona becomes more skeptical
   • Rep struggling with objections → More objections thrown
   • Rep strong on discovery → Skip to advanced challenges

2. TARGETED WEAKNESS TRAINING
   • System detects: "Rep struggles with price objections"
   • Next persona emphasizes: Budget concerns, competitor comparisons
   • Real-time: Harder objections when rep is doing well

3. DYNAMIC PERSONALITY SHIFTS
   • Persona starts neutral
   • If rep builds rapport → Persona warms up (new win paths open)
   • If rep pushes too hard → Persona gets defensive
   • Creates realistic sales dynamics
```

#### Skill-Based Progression

**Current:** Simple XP + level system
**Future:** Competency-based mastery

```
┌────────────────────────────────────────────────────────────────┐
│                    SKILL PROGRESSION SYSTEM                     │
│                                                                 │
│  DISCOVERY                    OBJECTION HANDLING                │
│  ████████████░░░░ 75%        ██████░░░░░░░░░░ 40%              │
│  ✓ Pain identification       ✓ Price reframe                   │
│  ✓ Quantifying impact        ✗ Competition handling            │
│  ✓ Timeline exploration      ✗ Authority concerns              │
│  ✗ Decision process          ✗ Status quo defense              │
│                                                                 │
│  VALUE ARTICULATION          CLOSING                           │
│  ██████████░░░░░░ 65%        ████░░░░░░░░░░░░ 25%              │
│  ✓ Feature → Benefit         ✗ Commitment securing             │
│  ✓ ROI quantification        ✗ Next steps clarity              │
│  ✗ Competitive positioning   ✗ Urgency creation                │
│                                                                 │
│  RECOMMENDED NEXT CHALLENGE:                                    │
│  "Skeptical CFO" - Focuses on objection handling + closing     │
└────────────────────────────────────────────────────────────────┘
```

---

### Unified Implementation Roadmap

#### Phase 1: Shared Streaming Foundation (Week 1-2)
- [ ] Remove 8-second batching in coaching
- [ ] Add streaming OpenAI responses to both features
- [ ] Implement utterance-based processing
- **Impact:** 11-16s → 3-5s (coaching), 2-4s → <1s perceived (practice)

#### Phase 2: Edge Detection Layer (Week 2-3)
- [ ] Move pattern matching to browser (coaching)
- [ ] Add real-time technique detection (practice)
- [ ] Instant objective completion feedback
- [ ] Persona mood/interest tracking
- **Impact:** Critical events surface in <100ms

#### Phase 3: Fast Inference Tier (Week 3-4)
- [ ] Add Haiku/GPT-4o-mini for quick suggestions (both)
- [ ] Real-time coaching tips during practice
- [ ] Parallel processing: fast + deep tiers
- **Impact:** Most suggestions in <500ms

#### Phase 4: Semantic Memory (Week 4-6)
- [ ] Shared vector embedding infrastructure
- [ ] Cross-call learning for both features
- [ ] Skill tracking and weakness identification (practice)
- [ ] Key info persistence (coaching)
- **Impact:** Never loses context, learns over time

#### Phase 5: Adaptive Intelligence (Week 6-8)
- [ ] Predictive guidance engine (coaching)
- [ ] Adaptive persona difficulty (practice)
- [ ] Skill-based challenge selection
- [ ] Targeted weakness training
- **Impact:** AI that's ahead of the conversation

#### Phase 6: Ambient UI (Week 8-10)
- [ ] Glow ring / color coding (both)
- [ ] Whisper suggestions
- [ ] Audio feedback option
- [ ] Zero cognitive load interface
- **Impact:** Effortless to use

---

### Technical Requirements (Shared)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Edge Compute | Cloudflare Workers | <50ms pattern matching |
| Vector DB | Pinecone / pgvector | Semantic memory storage |
| Streaming | WebSocket / SSE | Real-time responses |
| Fast Model | Claude Haiku / GPT-4o-mini | Quick suggestions |
| Deep Model | Claude Opus / GPT-4o | Complex reasoning |
| Embeddings | text-embedding-3-small | Semantic search |

**Estimated Costs:**
- Live Coaching: $0.50-0.85 per call hour
- Practice Session: $0.15-0.25 per 10-minute session
- Shared infrastructure: Amortized across both features

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
