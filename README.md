# RevPilot CoPilot

**AI Sales Coach That Never Sleeps**

Practice sales calls with AI prospects. Get real-time coaching during live calls. Track your commissions. Level up your skills.

---

## The Problem

Sales training is broken.

- **$20B+** spent annually on sales training in the US alone
- **87%** of sales training content is forgotten within 30 days
- **70%** of sales reps don't hit quota
- New reps take **10+ months** to reach full productivity

The current approach: expensive workshops, role-plays with colleagues (who are also learning), and throwing reps into live calls to "figure it out." When they fail, deals are lost forever.

**There's no safe place for sales reps to practice, fail, and improve—and no coach available when they need help most: during the actual call.**

---

## The Solution

RevPilot CoPilot is the AI-powered sales performance platform that combines **practice**, **real-time coaching**, and **performance tracking** into one system.

### 1. AI Roleplay Practice

Practice sales conversations against AI prospects that talk back—literally. Using voice AI (Vapi + OpenAI + 11Labs), reps can:

- **Call AI prospects** with distinct personalities: Skeptical CFOs, Budget-Conscious SMBs, Technical Gatekeepers, Enterprise Decision Makers
- **Face realistic objections**: "We're happy with our current solution," "That's too expensive," "I need to talk to my team"
- **Get scored on objectives**: Did you uncover the pain? Did you handle the objection? Did you get the next step?
- **Scale difficulty**: Easy → Medium → Hard → Expert as skills improve

**No more awkward role-plays with colleagues. Practice anytime, anywhere, as many times as needed.**

### 2. Real-Time Live Coaching

A Chrome extension that acts as a silent coach during actual sales calls:

- **Works with**: Zoom, Google Meet, Microsoft Teams
- **No bot joins**: Captures tab audio directly—prospects never know
- **Live suggestions**: "They mentioned budget concerns—try asking about ROI"
- **Objection detection**: Instant alerts when price, competition, or timing objections surface
- **Talk ratio monitoring**: "You've been talking for 3 minutes—pause for questions"

**The sales manager in your ear, but powered by AI and always available.**

### 3. Commission Tracking

Full visibility into earnings:

- Track contracted value, cash collected, and outstanding payments
- Calculate guaranteed vs. potential commissions
- Manage payment schedules and statuses
- Project earnings for future deals

### 4. Gamification & Skill Progression

Sales improvement that feels like a game:

- **XP & Levels**: Earn points for practice calls and completing objectives
- **60+ Achievements**: Milestones, streaks, persona mastery, difficulty progression
- **Skill Trees**: Unlock advanced techniques by mastering fundamentals
- **Leaderboards**: Compete with teammates

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REVPILOT COPILOT                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PRACTICE                          LIVE CALLS                      │
│   ────────                          ──────────                      │
│                                                                     │
│   You ──speak──► Vapi (Voice AI)    You ──speak──► Zoom/Meet/Teams │
│         │                                  │                        │
│         ▼                                  ▼                        │
│   AI Prospect responds              Chrome Extension captures audio │
│         │                                  │                        │
│         ▼                                  ▼                        │
│   Real-time objective              Deepgram transcribes in          │
│   tracking + coaching tips         real-time                        │
│         │                                  │                        │
│         ▼                                  ▼                        │
│   Post-call analysis               GPT-4o generates live            │
│   + XP earned                      coaching suggestions             │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     SHARED INTELLIGENCE LAYER                       │
│                                                                     │
│   • Objection detection (price, competition, timing, authority)     │
│   • Buying signal recognition                                       │
│   • Conversation stage tracking                                     │
│   • Key info extraction (BANT: Budget, Authority, Need, Timeline)   │
│   • Skill progression tracking                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why RevPilot Wins

| Challenge | Traditional Training | RevPilot CoPilot |
|-----------|---------------------|------------------|
| Practice availability | Schedule with manager | 24/7, unlimited |
| Realistic scenarios | Colleagues pretending | AI personas with real objections |
| Feedback timing | Days/weeks later | Real-time, during the call |
| Personalization | One-size-fits-all | Adaptive difficulty, targets weaknesses |
| Cost per rep | $1,500+/year | $50-100/month |
| Coaching during calls | Impossible at scale | Every call, every rep |

---

## The AI Personas

Practice against diverse buyer types:

| Persona | Difficulty | Focus Areas |
|---------|------------|-------------|
| Sarah Chen (Startup Founder) | Medium | Discovery, urgency, budget |
| Michael Torres (Skeptical CFO) | Hard | ROI, competition, proof |
| Jennifer Walsh (Technical Gatekeeper) | Hard | Technical depth, security |
| David Park (Enterprise Decision Maker) | Expert | Multi-stakeholder, procurement |
| Amanda Foster (Budget-Conscious SMB) | Medium | Value, payment terms |
| Robert Kim (Status Quo Defender) | Expert | Change management, risk |

Each persona has unique objection patterns, communication styles, and win conditions.

---

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **Voice AI**: Vapi.ai (orchestrating Deepgram STT + OpenAI LLM + 11Labs TTS)
- **Live Coaching**: Chrome Extension + Deepgram WebSocket + GPT-4o
- **Testing**: Vitest

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase account
- OpenAI API key
- Vapi.ai account (for practice calls)
- Deepgram API key (for live coaching)

### Installation

```bash
# Clone the repository
git clone https://github.com/thesalesoperator/Revpilot-CoPilot.git
cd Revpilot-CoPilot

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Vapi (Practice Calls)
VAPI_API_KEY=your_vapi_key
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key

# Deepgram (Live Coaching)
DEEPGRAM_API_KEY=your_deepgram_key
```

### Chrome Extension Setup

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. Grant microphone permissions when prompted

---

## Product Roadmap

### Shipped

- [x] AI roleplay practice with voice
- [x] 15+ AI personas with unique personalities
- [x] Real-time objective tracking during practice
- [x] Live coaching Chrome extension
- [x] Objection and buying signal detection
- [x] Commission tracking dashboard
- [x] Gamification (XP, levels, achievements)
- [x] Skill progression system
- [x] Light/dark mode themes

### In Development

- [ ] Semantic memory (AI remembers across sessions)
- [ ] Adaptive persona difficulty (gets harder as you improve)
- [ ] Team analytics and leaderboards
- [ ] Custom scenario builder from real call recordings
- [ ] CRM integrations (Salesforce, HubSpot)

### Future Vision

**Universal Meeting Intelligence**: Extend beyond sales to any meeting type—live recaps, auto-detected action items, meeting health monitoring. The Fathom/Otter killer that provides value *during* the call, not after.

---

## Market Opportunity

- **Sales Training Market**: $5.7B globally, growing 8% YoY
- **Sales Enablement Software**: $3.4B, growing 15% YoY
- **Conversation Intelligence**: $1.8B, growing 20% YoY

RevPilot sits at the intersection of all three—a unified platform for practice, coaching, and performance tracking.

**TAM**: Every B2B sales team in the world
**SAM**: 5.7M B2B sales reps in the US alone
**SOM**: SMB/Mid-market sales teams (1-100 reps) looking for affordable, scalable training

---

## Why Now

1. **Voice AI matured**: Vapi, ElevenLabs, and Deepgram make real-time voice conversations possible at low cost
2. **LLMs reached critical capability**: GPT-4o can genuinely coach sales conversations
3. **Remote work created the opening**: No more "manager listening in"—reps need digital coaching
4. **Sales hiring costs exploding**: Companies need to ramp reps faster with less human training

---

## Architecture Highlights

### Multi-Tier Intelligence

```
TIER 1: Edge Detection (<50ms)
├── Pattern matching for objections
├── Keyword spotting for buying signals
└── Talk ratio calculation

TIER 2: Fast Inference (200-500ms)
├── GPT-4o-mini for quick suggestions
├── Objective completion checking
└── Section transition detection

TIER 3: Deep Reasoning (1-3s)
├── GPT-4o for complex analysis
├── Post-call comprehensive scoring
└── Strategic coaching recommendations
```

### Bot-Free Architecture

Unlike Gong, Chorus, or Fathom, RevPilot's Chrome extension **never joins calls as a bot**:

- Direct tab audio capture via Chrome APIs
- No "Recording" warnings for prospects
- Works on any web-based meeting platform
- Privacy-first: audio is processed, not stored

---

## Contributing

We welcome contributions! See our development setup above to get started.

```bash
# Run tests
npm run test

# Run linting
npm run lint

# Build for production
npm run build
```

---

## License

MIT License - see LICENSE file for details.

---

**RevPilot CoPilot**: Practice like a pro. Coach in real-time. Close more deals.
