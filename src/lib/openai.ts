/**
 * OpenAI Client Singleton
 *
 * Centralized OpenAI client management to:
 * 1. Reduce instantiation overhead (was creating 14+ instances)
 * 2. Provide consistent configuration across the codebase
 * 3. Enable easier monitoring and debugging
 *
 * Usage:
 *   import { getOpenAI } from '@/lib/openai'
 *   const openai = getOpenAI()
 */

import OpenAI from 'openai'

// Singleton instance
let openaiInstance: OpenAI | null = null

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

/**
 * Get the singleton OpenAI client instance.
 * Creates the instance on first call, reuses on subsequent calls.
 */
export function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    openaiInstance = new OpenAI({
      apiKey: OPENAI_API_KEY,
    })
  }

  return openaiInstance
}

/**
 * Reset the singleton instance.
 * Useful for testing or when API key changes.
 */
export function resetOpenAI(): void {
  openaiInstance = null
}

/**
 * Model constants for consistent usage across the codebase.
 *
 * Guidelines:
 * - FAST: Use for real-time suggestions, quick checks (cost-efficient)
 * - STANDARD: Use for comprehensive analysis, scoring, scenario generation (quality)
 */
export const OPENAI_MODELS = {
  // Fast model for real-time operations (100x cheaper than standard)
  FAST: 'gpt-4o-mini',

  // Standard model for comprehensive analysis (higher quality)
  STANDARD: 'gpt-4o',
} as const

export type OpenAIModel = typeof OPENAI_MODELS[keyof typeof OPENAI_MODELS]

/**
 * Token limits for different use cases
 */
export const TOKEN_LIMITS = {
  // Real-time suggestions should be concise
  SUGGESTION: 200,

  // Objective checking - returns array of numbers but needs context
  OBJECTIVE_CHECK: 500,

  // Comprehensive analysis needs more room
  ANALYSIS: 2000,

  // Scenario generation is detailed
  SCENARIO: 3000,

  // Summary generation
  SUMMARY: 1000,

  // Coaching webhook responses
  WEBHOOK: 300,
} as const
