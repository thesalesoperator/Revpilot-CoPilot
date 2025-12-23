/**
 * Shared configuration and utilities for coaching API routes
 */

// Environment variables
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const RECALL_API_KEY = process.env.RECALL_API_KEY
export const RECALL_API_REGION = process.env.RECALL_API_REGION || 'us-east-1'
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://revpilot-commission-calculator.netlify.app'

// Recall.ai regional API endpoints
const RECALL_REGION_MAP: Record<string, string> = {
  'us-east-1': 'https://us-east-1.recall.ai/api/v1',
  'us-west-2': 'https://us-west-2.recall.ai/api/v1',
  'eu-central-1': 'https://eu-central-1.recall.ai/api/v1',
  'ap-northeast-1': 'https://api.recall.ai/api/v1',
}

export const RECALL_API_BASE = RECALL_REGION_MAP[RECALL_API_REGION] || RECALL_REGION_MAP['us-east-1']

// CORS headers for Chrome extension requests
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/**
 * Extract meeting ID from various Zoom URL formats
 */
export function extractZoomMeetingId(url: string): string | null {
  const patterns = [
    /zoom\.us\/j\/(\d+)/,
    /zoom\.us\/wc\/(\d+)/,
    /zoom\.us\/my\/([^/?]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

/**
 * Normalize Zoom URL to standard format for Recall.ai
 */
export function normalizeZoomUrl(url: string): string {
  const meetingIdMatch = url.match(/\/(?:j|wc)\/(\d+)/)
  if (!meetingIdMatch) return url

  const meetingId = meetingIdMatch[1]
  const pwdMatch = url.match(/pwd=([^&]+)/)
  const password = pwdMatch ? pwdMatch[1] : null

  let normalizedUrl = `https://zoom.us/j/${meetingId}`
  if (password) {
    normalizedUrl += `?pwd=${password}`
  }

  return normalizedUrl
}
