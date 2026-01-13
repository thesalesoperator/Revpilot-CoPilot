# Claude Session Notes

## Primary Working Branch
**Always use this branch:** `claude/primary-revpilot-copilot-mWnQo`

When starting a new Claude session, tell Claude:
```
Pull and continue from branch: claude/primary-revpilot-copilot-mWnQo
```

---

## Project: RevPilot Copilot

### Current State (as of 2026-01-11)
- **Latest Commit:** 4d79e25 - Bump Chrome extension version to v2.2.0
- **Total Commits:** 85+
- **Lines of Code:** ~50,000+

### Core Features
1. **Practice Mode** - AI-powered sales roleplay with gamified challenges
2. **Calls** - Fathom integration, call analysis, AI scenario generation
3. **Live Coaching** - Chrome extension for real-time coaching

### Chrome Extensions
1. **RevPilot Live Coaching** (`chrome-extension/`) - v2.2.0
   - Bot-free tab audio capture
   - Real-time AI coaching overlay
   - Horizontal resizable bar design

2. **Close CRM Co-Pilot** (`close-extension/`)
   - Integration with Close CRM
   - Organization support

### Key Integrations
- Supabase (auth, database)
- Vapi (voice AI for practice)
- Fathom (call recording import)
- Google OAuth (web + extensions)

### Database Migrations Required
- `add_organizations_system.sql`
- `add_close_copilot.sql`
- `add_close_copilot_org_support.sql`
- `add_ai_scenarios_and_scoring.sql`

---

## Branch History (Consolidated)
All work from these branches has been merged into the primary branch:
- `claude/review-session-changes-aP9Ls` - Chrome ext v2.1-2.2, OAuth, Orgs
- `claude/review-project-specs-PJv79` - Design rebrand, Close CRM
- `claude/build-founder-vision-HE8mv` - UI/UX, color palette
- `claude/review-codebase-T9UCN` - AI scenarios, scoring
- `claude/resume-previous-session-mWnQo` - Merged all above

---

## Instructions for New Claude Sessions

1. **First message to Claude:**
   ```
   Pull from branch claude/primary-revpilot-copilot-mWnQo and continue working from there.
   Check CLAUDE_SESSION_NOTES.md for context.
   ```

2. **Before ending a session:**
   - Ensure all changes are committed
   - Push to the primary branch
   - Update this file if major features were added

3. **If session gets stuck:**
   - Note the last commit hash
   - In new session, reference this file and the commit

---

## Deployment
- **URL:** https://revpilot-copilot.netlify.app
- **Platform:** Netlify with Next.js
