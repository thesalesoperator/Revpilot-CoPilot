'use client'

import { CheckCircle, Circle, ChevronRight } from 'lucide-react'

// RevPilot script sections in order
export const SCRIPT_SECTIONS = [
  { id: 'set_expectations', name: 'Set Expectations', shortName: 'Intro' },
  { id: 'isolate_problem', name: 'Isolate Problem', shortName: 'Problem' },
  { id: 'background_questions', name: 'Background Questions', shortName: 'Background' },
  { id: 'current_situation', name: 'Current Situation', shortName: 'Current' },
  { id: 'assess_efforts', name: 'Assess Efforts', shortName: 'Efforts' },
  { id: 'chunking_down', name: 'Chunking Down', shortName: 'Deep Dive' },
  { id: 'financial_qualifier', name: 'Financial Qualifier', shortName: 'Budget' },
  { id: 'doubt_questions', name: 'Doubt Questions', shortName: 'Doubt' },
  { id: 'solution_questions', name: 'Solution Questions', shortName: 'Solution' },
  { id: 'why_now', name: 'Why Now?', shortName: 'Urgency' },
  { id: 'support_questions', name: 'Support Questions', shortName: 'Support' },
  { id: 'desired_situation', name: 'Desired Situation', shortName: 'Goals' },
  { id: 'transition', name: 'Transition', shortName: 'Transition' },
  { id: 'pitch', name: 'Pitch', shortName: 'Pitch' },
  { id: 'commitment', name: 'Commitment', shortName: 'Close' },
]

interface ScriptProgressProps {
  currentSection: string
  sectionsCovered?: string[]
  progress?: number // 0-100
  compact?: boolean
}

export default function ScriptProgress({
  currentSection,
  sectionsCovered = [],
  progress = 0,
  compact = false,
}: ScriptProgressProps) {
  const currentIndex = SCRIPT_SECTIONS.findIndex(s => s.id === currentSection)

  // Calculate progress if not provided
  const calculatedProgress = progress > 0 ? progress :
    currentIndex >= 0 ? Math.round((currentIndex / SCRIPT_SECTIONS.length) * 100) : 0

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#5eead4] to-[#5eead4]/70 rounded-full transition-all duration-500"
              style={{ width: `${calculatedProgress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 font-medium w-10 text-right">
            {calculatedProgress}%
          </span>
        </div>

        {/* Current section indicator */}
        {currentSection && currentIndex >= 0 && (
          <div className="flex items-center gap-2 text-sm">
            <ChevronRight className="w-4 h-4 text-[#5eead4]" />
            <span className="text-gray-400">Current:</span>
            <span className="text-white font-medium">
              {SCRIPT_SECTIONS[currentIndex]?.name}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Script Progress</span>
          <span className="text-[#5eead4] font-medium">{calculatedProgress}%</span>
        </div>
        <div className="h-2 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#5eead4] to-[#5eead4]/70 rounded-full transition-all duration-500"
            style={{ width: `${calculatedProgress}%` }}
          />
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
        {SCRIPT_SECTIONS.map((section, index) => {
          const isCurrent = section.id === currentSection
          const isCovered = sectionsCovered.includes(section.id) || index < currentIndex
          const isPast = index < currentIndex

          return (
            <div
              key={section.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-[#5eead4]/10 border border-[#5eead4]/30'
                  : isPast
                  ? 'opacity-60'
                  : 'opacity-40'
              }`}
            >
              {/* Status indicator */}
              {isCovered || isPast ? (
                <CheckCircle className={`w-4 h-4 flex-shrink-0 ${
                  isCurrent ? 'text-[#5eead4]' : 'text-[#5eead4]/60'
                }`} />
              ) : isCurrent ? (
                <div className="w-4 h-4 rounded-full border-2 border-[#5eead4] flex-shrink-0 animate-pulse" />
              ) : (
                <Circle className="w-4 h-4 text-gray-600 flex-shrink-0" />
              )}

              {/* Section name */}
              <span className={`text-sm flex-1 ${
                isCurrent ? 'text-white font-medium' : isPast ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {section.name}
              </span>

              {/* Current indicator */}
              {isCurrent && (
                <span className="text-xs bg-[#5eead4]/20 text-[#5eead4] px-2 py-0.5 rounded-full">
                  Now
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Helper function to calculate progress from section
export function calculateScriptProgress(currentSection: string): number {
  const index = SCRIPT_SECTIONS.findIndex(s => s.id === currentSection)
  return index >= 0 ? Math.round(((index + 1) / SCRIPT_SECTIONS.length) * 100) : 0
}
