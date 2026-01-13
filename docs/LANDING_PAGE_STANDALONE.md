# RevPilot Landing Page - Standalone Setup

## Quick Start

```bash
# Create new Next.js project
npx create-next-app@latest revpilot-landing --typescript --tailwind --app --src-dir --no-eslint

cd revpilot-landing

# Install lucide-react for icons
npm install lucide-react
```

## File 1: `src/app/globals.css`

Replace the entire contents with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## File 2: `src/app/layout.tsx`

Replace with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RevPilot - The Sales Rep Operating System",
  description: "Turn every rep into their own top-performing manager. Live AI coaching, real-time metrics, and practice that translates to results.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

## File 3: `src/app/page.tsx`

Replace with the landing page code (see below).

## Run

```bash
npm run dev
```

Visit http://localhost:3000

## Deploy to Netlify/Vercel

```bash
# For Netlify
npm run build
# Deploy the .next folder or connect your repo

# For Vercel
npx vercel
```

---

# LANDING PAGE CODE (`src/app/page.tsx`)

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Zap,
  Target,
  TrendingUp,
  Users,
  Play,
  CheckCircle,
  ArrowRight,
  Phone,
  BarChart3,
  Trophy,
  Flame,
  Star,
  Clock,
  Brain,
  MessageSquare,
  Shield,
  Sparkles,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#00102e] text-white overflow-x-hidden">
      {/* Gradient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#00ffc1]/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ffc1] to-[#00ffc1]/50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#00102e]" />
              </div>
              <span className="text-xl font-bold">RevPilot</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Log In
              </a>
              <a
                href="#"
                className="px-5 py-2.5 bg-[#00ffc1] text-[#00102e] font-semibold rounded-xl hover:bg-[#00ffc1]/90 transition-all"
              >
                Start Free Trial
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <div className="md:hidden pt-4 pb-6 space-y-4">
              <a href="#features" className="block text-gray-400 hover:text-white">Features</a>
              <a href="#how-it-works" className="block text-gray-400 hover:text-white">How It Works</a>
              <a href="#pricing" className="block text-gray-400 hover:text-white">Pricing</a>
              <div className="pt-4 space-y-3">
                <a href="#" className="block text-gray-400 hover:text-white">Log In</a>
                <a
                  href="#"
                  className="block w-full text-center px-5 py-2.5 bg-[#00ffc1] text-[#00102e] font-semibold rounded-xl"
                >
                  Start Free Trial
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ffc1]/10 border border-[#00ffc1]/20 mb-8">
              <Sparkles className="w-4 h-4 text-[#00ffc1]" />
              <span className="text-sm text-[#00ffc1] font-medium">The Sales Rep Operating System</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              Turn Every Rep Into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ffc1] to-cyan-400">
                Their Own Top-Performing Manager
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              Live AI coaching on calls. Real-time performance visibility. Skill practice that actually translates to results.
              <span className="text-white font-medium"> Stop hoping reps improve. Make it inevitable.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a
                href="#"
                className="w-full sm:w-auto px-8 py-4 bg-[#00ffc1] text-[#00102e] font-bold rounded-xl hover:bg-[#00ffc1]/90 transition-all flex items-center justify-center gap-2 text-lg"
              >
                Start 14-Day Free Trial
                <ArrowRight className="w-5 h-5" />
              </a>
              <button className="w-full sm:w-auto px-8 py-4 border border-white/20 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-lg">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#00ffc1]" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#00ffc1]" />
                <span>Setup in 5 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#00ffc1]" />
                <span>Works with Zoom, Fathom & more</span>
              </div>
            </div>
          </div>

          {/* Hero Screenshot */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#00102e] via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative rounded-2xl border border-white/10 bg-[#001a3d] overflow-hidden shadow-2xl shadow-[#00ffc1]/10">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#00102e]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-lg bg-white/5 text-xs text-gray-500">app.revpilot.io/dashboard</div>
                </div>
              </div>
              {/* App Screenshot Placeholder */}
              <div className="aspect-[16/9] bg-gradient-to-br from-[#001a3d] to-[#00102e] p-8">
                <div className="grid grid-cols-3 gap-6 h-full">
                  {/* Metrics Cards */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#00102e] border border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[#00ffc1]/20 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-[#00ffc1]" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">This Week</p>
                          <p className="text-xl font-bold">$47,250</p>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#00ffc1] to-cyan-400" />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#00102e] border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <Flame className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Streak</p>
                          <p className="text-xl font-bold">12 Days</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#00102e] border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Rank</p>
                          <p className="text-xl font-bold">#3 / 24</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Main Content */}
                  <div className="col-span-2 p-6 rounded-xl bg-[#00102e] border border-white/10">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-[#00ffc1]" />
                      Live Call Coaching
                    </h3>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-[#00ffc1]/10 border border-[#00ffc1]/30">
                        <p className="text-sm text-[#00ffc1]">
                          <span className="font-semibold">AI Coach:</span> They mentioned budget concerns. Try: &quot;I understand budget is a factor. What would the cost of NOT solving this be over the next 12 months?&quot;
                        </p>
                      </div>
                      <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs text-gray-400">LIVE</span>
                            <span className="text-sm font-medium">Discovery Call - Acme Corp</span>
                          </div>
                          <div className="flex gap-1">
                            {[...Array(20)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-[#00ffc1] rounded-full"
                                style={{ height: `${Math.random() * 20 + 5}px` }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-2xl font-mono font-bold">12:34</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="relative z-10 py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Your Reps Are Flying Blind
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Most sales teams are stuck with outdated coaching that doesn&apos;t scale
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                problem: "Monthly coaching calls",
                result: "Feedback arrives weeks after the deal is lost",
              },
              {
                icon: Target,
                problem: "Random call reviews",
                result: "Reps guess what to work on, improvement is accidental",
              },
              {
                icon: TrendingUp,
                problem: "Motivation rollercoasters",
                result: "Good week, bad week, no consistency",
              },
              {
                icon: Brain,
                problem: "Training that doesn't stick",
                result: "Great workshop, zero behavior change",
              },
              {
                icon: Users,
                problem: "Managers stretched thin",
                result: "1:1 coaching doesn't scale with headcount",
              },
              {
                icon: BarChart3,
                problem: "Invisible performance",
                result: "Reps don't know where they stand until quota deadline",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-gradient-to-br from-red-500/5 to-transparent border border-red-500/20"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-red-400">{item.problem}</h3>
                <p className="text-gray-400">{item.result}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ffc1]/10 border border-[#00ffc1]/20 mb-6">
              <Zap className="w-4 h-4 text-[#00ffc1]" />
              <span className="text-sm text-[#00ffc1] font-medium">The RevPilot Difference</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Four Pillars That Transform Performance
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Not another dashboard. A complete operating system for sales excellence.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: Phone,
                title: "Coach Them Live",
                description: "AI overlay inside Zoom that gives reps real-time guidance mid-call. Handle objections while the prospect is still on the line.",
                color: "#00ffc1",
              },
              {
                icon: BarChart3,
                title: "Make the Week Visible",
                description: "Reps see their weekly metrics, projections, and commissions in real-time. They know exactly what to do THIS WEEK to hit goal.",
                color: "#3b82f6",
              },
              {
                icon: Target,
                title: "Practice On Demand",
                description: "Arena battles with AI prospects. Realistic objections, scored performance, and skill development that transfers to real calls.",
                color: "#a855f7",
              },
              {
                icon: Users,
                title: "Make Adoption Social",
                description: "Profiles, posts, clips, and tags. Coaching becomes culture, not a mandatory meeting. Reps learn from each other.",
                color: "#f97316",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-white/10 hover:border-white/20 transition-all"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${feature.color}20` }}
                >
                  <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                </div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-lg">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="relative z-10 py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              The Outcomes That Matter
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Not features—results. Here&apos;s what teams achieve with RevPilot.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-[#00ffc1]/10 to-transparent border border-[#00ffc1]/20">
              <div className="text-5xl md:text-6xl font-bold text-[#00ffc1] mb-4">50%</div>
              <h3 className="text-xl font-semibold mb-2">Faster Ramp Time</h3>
              <p className="text-gray-400">New reps get better in weeks, not quarters.</p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
              <div className="text-5xl md:text-6xl font-bold text-blue-400 mb-4">23%</div>
              <h3 className="text-xl font-semibold mb-2">Higher Conversion</h3>
              <p className="text-gray-400">Better calls because coaching happens in real-time.</p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
              <div className="text-5xl md:text-6xl font-bold text-purple-400 mb-4">3x</div>
              <h3 className="text-xl font-semibold mb-2">More Consistency</h3>
              <p className="text-gray-400">No more good week / bad week cycles.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Get Started in Minutes
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              No complex setup. No IT involvement. Start improving today.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect Your Tools",
                description: "Link Zoom, import from Fathom, or use our native dialer. Takes 5 minutes.",
                icon: Zap,
              },
              {
                step: "02",
                title: "Set Your Goals",
                description: "Define quotas, commission rates, and weekly targets. RevPilot tracks the rest.",
                icon: Target,
              },
              {
                step: "03",
                title: "Start Coaching",
                description: "Jump into a live call with AI coaching or practice in the arena.",
                icon: TrendingUp,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-8xl font-bold text-white/5 absolute -top-4 -left-2">{item.step}</div>
                <div className="relative p-6 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-white/10">
                  <div className="w-12 h-12 rounded-xl bg-[#00ffc1]/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-[#00ffc1]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Start free. Scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Individual */}
            <div className="p-8 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-white/10">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Individual</h3>
                <p className="text-gray-400 text-sm">For reps who want to level up solo</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">$49</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Performance metrics dashboard",
                  "Daily habits & journaling",
                  "Arena practice (unlimited)",
                  "Basic call review",
                  "Mobile app access",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-[#00ffc1]" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className="block w-full py-3 text-center border border-white/20 rounded-xl hover:bg-white/5 transition-all font-medium"
              >
                Start Free Trial
              </a>
            </div>

            {/* Team - Highlighted */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-[#00ffc1]/10 to-blue-500/10 border-2 border-[#00ffc1]/50 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#00ffc1] text-[#00102e] text-sm font-bold rounded-full">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Team</h3>
                <p className="text-gray-400 text-sm">For sales teams that want to dominate</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-gray-400">/rep/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Everything in Individual",
                  "Live AI call coaching",
                  "Zoom integration",
                  "Fathom import & analysis",
                  "Team leaderboards",
                  "Manager dashboard",
                  "Custom methodologies",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-[#00ffc1]" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className="block w-full py-3 text-center bg-[#00ffc1] text-[#00102e] rounded-xl hover:bg-[#00ffc1]/90 transition-all font-bold"
              >
                Start 14-Day Team Pilot
              </a>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-white/10">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <p className="text-gray-400 text-sm">For large teams with custom needs</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Everything in Team",
                  "SSO & advanced security",
                  "Custom scorecards",
                  "Role-based permissions",
                  "API access",
                  "Dedicated success manager",
                  "Custom integrations",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-[#00ffc1]" />
                    {item}
                  </li>
                ))}
              </ul>
              <button className="block w-full py-3 text-center border border-white/20 rounded-xl hover:bg-white/5 transition-all font-medium">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-[#00ffc1]/20 via-blue-500/10 to-purple-500/10 border border-[#00ffc1]/30">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Sales Team?
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Start a 14-day team pilot. See real improvement in rep performance without adding manager hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#"
                className="w-full sm:w-auto px-8 py-4 bg-[#00ffc1] text-[#00102e] font-bold rounded-xl hover:bg-[#00ffc1]/90 transition-all flex items-center justify-center gap-2 text-lg"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </a>
              <button className="w-full sm:w-auto px-8 py-4 border border-white/20 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-lg">
                Book a Demo
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ffc1] to-[#00ffc1]/50 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#00102e]" />
                </div>
                <span className="text-xl font-bold">RevPilot</span>
              </div>
              <p className="text-gray-400 text-sm">
                The Sales Rep Operating System. Turn every rep into their own top-performing manager.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">© 2025 RevPilot. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
```

---

## Deploy Commands

### Netlify
```bash
npm run build
# Then drag & drop the `out` folder to Netlify, or connect your GitHub repo
```

### Vercel
```bash
npx vercel
```

### Static Export (for any host)
Add to `next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
}
module.exports = nextConfig
```

Then:
```bash
npm run build
# Upload the `out` folder to any static host
```
