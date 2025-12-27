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
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Gradient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#5eead4]/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#5eead4]/50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#0a0a0f]" />
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
              <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 bg-[#5eead4] text-[#0a0a0f] font-semibold rounded-xl hover:bg-[#5eead4]/90 transition-all"
              >
                Start Free Trial
              </Link>
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
                <Link href="/login" className="block text-gray-400 hover:text-white">Log In</Link>
                <Link
                  href="/signup"
                  className="block w-full text-center px-5 py-2.5 bg-[#5eead4] text-[#0a0a0f] font-semibold rounded-xl"
                >
                  Start Free Trial
                </Link>
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5eead4]/10 border border-[#5eead4]/20 mb-8">
              <Sparkles className="w-4 h-4 text-[#5eead4]" />
              <span className="text-sm text-[#5eead4] font-medium">The Sales Rep Operating System</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              Turn Every Rep Into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5eead4] to-cyan-400">
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
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-[#5eead4] text-[#0a0a0f] font-bold rounded-xl hover:bg-[#5eead4]/90 transition-all flex items-center justify-center gap-2 text-lg"
              >
                Start 14-Day Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 border border-white/20 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-lg">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                <span>Setup in 5 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                <span>Works with Zoom, Fathom & more</span>
              </div>
            </div>
          </div>

          {/* Hero Screenshot */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative rounded-2xl border border-white/10 bg-[#001a3d] overflow-hidden shadow-2xl shadow-[#5eead4]/10">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0a0a0f]">
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
              <div className="aspect-[16/9] bg-gradient-to-br from-[#001a3d] to-[#0a0a0f] p-8">
                <div className="grid grid-cols-3 gap-6 h-full">
                  {/* Metrics Cards */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#0a0a0f] border border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[#5eead4]/20 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-[#5eead4]" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">This Week</p>
                          <p className="text-xl font-bold">$47,250</p>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#5eead4] to-cyan-400" />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0a0a0f] border border-white/10">
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
                    <div className="p-4 rounded-xl bg-[#0a0a0f] border border-white/10">
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
                  <div className="col-span-2 p-6 rounded-xl bg-[#0a0a0f] border border-white/10">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-[#5eead4]" />
                      Live Call Coaching
                    </h3>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-[#5eead4]/10 border border-[#5eead4]/30">
                        <p className="text-sm text-[#5eead4]">
                          <span className="font-semibold">AI Coach:</span> They mentioned budget concerns. Try: "I understand budget is a factor. What would the cost of NOT solving this be over the next 12 months?"
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
                                className="w-1 bg-[#5eead4] rounded-full"
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
              Most sales teams are stuck with outdated coaching that doesn't scale
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                problem: "Monthly coaching calls",
                result: "Feedback arrives weeks after the deal is lost",
                color: "red",
              },
              {
                icon: Target,
                problem: "Random call reviews",
                result: "Reps guess what to work on, improvement is accidental",
                color: "red",
              },
              {
                icon: TrendingUp,
                problem: "Motivation rollercoasters",
                result: "Good week, bad week, no consistency",
                color: "red",
              },
              {
                icon: Brain,
                problem: "Training that doesn't stick",
                result: "Great workshop, zero behavior change",
                color: "red",
              },
              {
                icon: Users,
                problem: "Managers stretched thin",
                result: "1:1 coaching doesn't scale with headcount",
                color: "red",
              },
              {
                icon: BarChart3,
                problem: "Invisible performance",
                result: "Reps don't know where they stand until quota deadline",
                color: "red",
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

      {/* Solution Section */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5eead4]/10 border border-[#5eead4]/20 mb-6">
              <Zap className="w-4 h-4 text-[#5eead4]" />
              <span className="text-sm text-[#5eead4] font-medium">The RevPilot Difference</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Four Pillars That Transform Performance
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Not another dashboard. A complete operating system for sales excellence.
            </p>
          </div>

          {/* Feature 1 - Live Coaching */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5eead4]/10 text-[#5eead4] text-sm font-medium mb-6">
                <Phone className="w-4 h-4" />
                Pillar 1
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Coach Them Live, Not After the Deal Is Gone
              </h3>
              <p className="text-lg text-gray-400 mb-8">
                AI overlay inside Zoom that gives reps real-time guidance mid-call. Handle objections, nail discovery questions, and close with confidence—all while the prospect is still on the line.
              </p>
              <ul className="space-y-4">
                {[
                  "Real-time objection handling suggestions",
                  "Live talk/listen ratio monitoring",
                  "Automatic call scoring and feedback",
                  "Integrates with Zoom, Fathom & more",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#5eead4] flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-[#5eead4]/20 rounded-3xl blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-[#001a3d] p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium">Live Call - Enterprise Demo</span>
                  </div>
                  <span className="text-2xl font-mono font-bold">18:42</span>
                </div>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[#5eead4]/10 border border-[#5eead4]/30">
                    <div className="flex items-start gap-3">
                      <Brain className="w-5 h-5 text-[#5eead4] mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[#5eead4] mb-1">AI Coach Suggestion</p>
                        <p className="text-sm text-gray-300">
                          They're asking about competitors. Pivot to: "What's most important to you when evaluating solutions—is it [feature they mentioned] or something else?"
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-400 mb-1">Talk Ratio Alert</p>
                        <p className="text-sm text-gray-300">
                          You're at 68% talk time. Try asking an open-ended question to let them share more.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 - Weekly Visibility */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-[#001a3d] p-6 overflow-hidden">
                <h4 className="text-lg font-semibold mb-4">This Week's Performance</h4>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-[#0a0a0f]">
                    <p className="text-sm text-gray-400 mb-1">Projected</p>
                    <p className="text-3xl font-bold text-[#5eead4]">$52,400</p>
                    <p className="text-xs text-green-400 mt-1">↑ 12% vs last week</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0a0a0f]">
                    <p className="text-sm text-gray-400 mb-1">Commission</p>
                    <p className="text-3xl font-bold">$4,192</p>
                    <p className="text-xs text-gray-400 mt-1">8% rate</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0f]">
                    <span className="text-sm">Calls Made</span>
                    <span className="font-semibold">47 / 60</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0f]">
                    <span className="text-sm">Demos Booked</span>
                    <span className="font-semibold">12 / 15</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0f]">
                    <span className="text-sm">Close Rate</span>
                    <span className="font-semibold text-[#5eead4]">34%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-medium mb-6">
                <BarChart3 className="w-4 h-4" />
                Pillar 2
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Make the Week Visible
              </h3>
              <p className="text-lg text-gray-400 mb-8">
                Reps see their weekly metrics, projections, and commissions in real-time. No more waiting until month-end to know where they stand. They know exactly what to do THIS WEEK to hit goal.
              </p>
              <ul className="space-y-4">
                {[
                  "Real-time commission calculations",
                  "Weekly and monthly projections",
                  "Activity tracking and goal pacing",
                  "Performance trends and insights",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 3 - Practice Arena */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-sm font-medium mb-6">
                <Target className="w-4 h-4" />
                Pillar 3
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Practice On Demand
              </h3>
              <p className="text-lg text-gray-400 mb-8">
                Arena battles with AI prospects. Realistic objections, scored performance, and skill development that transfers to real calls. Reps don't wait for live opportunities to get better.
              </p>
              <ul className="space-y-4">
                {[
                  "AI personas that act like real buyers",
                  "Objective-based challenges with scoring",
                  "XP, levels, and leaderboards",
                  "Practice specific scenarios on demand",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-3xl blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-[#001a3d] p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    Sales Sparring Arena
                  </h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold">2,450 XP</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[#0a0a0f] border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">The Budget Objection</span>
                      <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">Medium</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Handle a CFO who says "we don't have budget"</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span>+150 XP</span>
                      </div>
                      <button className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium">
                        Start Battle
                      </button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0a0a0f] border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">The Hostile Executive</span>
                      <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">Hard</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">Win over a skeptical COO in 10 minutes</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span>+300 XP</span>
                      </div>
                      <button className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-sm font-medium">
                        Start Battle
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4 - Social Coaching */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-orange-500/20 rounded-3xl blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-[#001a3d] p-6 overflow-hidden">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-400" />
                  Team Activity
                </h4>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#0a0a0f]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                        SK
                      </div>
                      <div>
                        <p className="font-medium">Sarah K.</p>
                        <p className="text-xs text-gray-400">2 hours ago</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      Just crushed the "Hostile Executive" challenge with a 92 score! The trick is to acknowledge their time constraint upfront. 🔥
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <span>🎯</span> 12 likes
                      </span>
                      <span className="flex items-center gap-1">
                        <span>💬</span> 4 comments
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0a0a0f]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-sm font-bold">
                        MJ
                      </div>
                      <div>
                        <p className="font-medium">Mike J.</p>
                        <p className="text-xs text-gray-400">4 hours ago</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">
                      Shared a call clip showing how I handled the "we're talking to competitors" objection. Check it out! 📹
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-sm font-medium mb-6">
                <Users className="w-4 h-4" />
                Pillar 4
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Make Adoption Social
              </h3>
              <p className="text-lg text-gray-400 mb-8">
                Profiles, posts, clips, and tags. Coaching becomes culture, not a mandatory meeting. Reps learn from each other and celebrate wins together.
              </p>
              <ul className="space-y-4">
                {[
                  "Share call clips and best practices",
                  "Team leaderboards and competitions",
                  "Comment and learn from top performers",
                  "Badge system and public achievements",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
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
              Not features—results. Here's what teams achieve with RevPilot.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-[#5eead4]/10 to-transparent border border-[#5eead4]/20">
              <div className="text-5xl md:text-6xl font-bold text-[#5eead4] mb-4">50%</div>
              <h3 className="text-xl font-semibold mb-2">Faster Ramp Time</h3>
              <p className="text-gray-400">New reps get better in weeks, not quarters. Live coaching accelerates the learning curve.</p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
              <div className="text-5xl md:text-6xl font-bold text-blue-400 mb-4">23%</div>
              <h3 className="text-xl font-semibold mb-2">Higher Conversion</h3>
              <p className="text-gray-400">Better calls because coaching happens in real-time, not after the deal is lost.</p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
              <div className="text-5xl md:text-6xl font-bold text-purple-400 mb-4">3x</div>
              <h3 className="text-xl font-semibold mb-2">More Consistency</h3>
              <p className="text-gray-400">Habits, metrics, and streaks create "always-on" activity. No more good week / bad week cycles.</p>
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
                description: "Jump into a live call with AI coaching or practice in the arena. Improve immediately.",
                icon: TrendingUp,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-8xl font-bold text-white/5 absolute -top-4 -left-2">{item.step}</div>
                <div className="relative p-6 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-white/10">
                  <div className="w-12 h-12 rounded-xl bg-[#5eead4]/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-[#5eead4]" />
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
                    <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full py-3 text-center border border-white/20 rounded-xl hover:bg-white/5 transition-all font-medium"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Team - Highlighted */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-[#5eead4]/10 to-blue-500/10 border-2 border-[#5eead4]/50 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#5eead4] text-[#0a0a0f] text-sm font-bold rounded-full">
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
                    <CheckCircle className="w-4 h-4 text-[#5eead4]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full py-3 text-center bg-[#5eead4] text-[#0a0a0f] rounded-xl hover:bg-[#5eead4]/90 transition-all font-bold"
              >
                Start 14-Day Team Pilot
              </Link>
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
                    <CheckCircle className="w-4 h-4 text-[#5eead4]" />
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
          <div className="p-12 rounded-3xl bg-gradient-to-br from-[#5eead4]/20 via-blue-500/10 to-purple-500/10 border border-[#5eead4]/30">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Sales Team?
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Start a 14-day team pilot. See real improvement in rep performance without adding manager hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-[#5eead4] text-[#0a0a0f] font-bold rounded-xl hover:bg-[#5eead4]/90 transition-all flex items-center justify-center gap-2 text-lg"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5eead4] to-[#5eead4]/50 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#0a0a0f]" />
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
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
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
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
