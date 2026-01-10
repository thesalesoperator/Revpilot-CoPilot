export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company_name: string | null
          practice_company_description: string | null
          practice_product_description: string | null
          practice_value_proposition: string | null
          practice_target_customers: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          practice_company_description?: string | null
          practice_product_description?: string | null
          practice_value_proposition?: string | null
          practice_target_customers?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          practice_company_description?: string | null
          practice_product_description?: string | null
          practice_value_proposition?: string | null
          practice_target_customers?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          default_price: number
          default_commission_percent: number
          default_payment_count: number
          default_payment_cycle: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          default_price?: number
          default_commission_percent?: number
          default_payment_count?: number
          default_payment_cycle?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          default_price?: number
          default_commission_percent?: number
          default_payment_count?: number
          default_payment_cycle?: string
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          user_id: string
          product_id: string | null
          product_name: string
          client_name: string
          total_package_price: number
          cash_collected_upfront: number
          commission_percent: number
          payment_count: number
          payment_cycle: string
          sale_date: string
          status: string
          refund_date: string | null
          refund_amount: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id?: string | null
          product_name: string
          client_name: string
          total_package_price: number
          cash_collected_upfront: number
          commission_percent: number
          payment_count: number
          payment_cycle: string
          sale_date?: string
          status?: string
          refund_date?: string | null
          refund_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string | null
          product_name?: string
          client_name?: string
          total_package_price?: number
          cash_collected_upfront?: number
          commission_percent?: number
          payment_count?: number
          payment_cycle?: string
          sale_date?: string
          status?: string
          refund_date?: string | null
          refund_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payment_records: {
        Row: {
          id: string
          sale_id: string
          payment_number: number
          amount: number
          due_date: string
          paid_date: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          payment_number: number
          amount: number
          due_date: string
          paid_date?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          payment_number?: number
          amount?: number
          due_date?: string
          paid_date?: string | null
          status?: string
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          user_id: string
          commission_pay_day: number
          commission_pay_frequency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          commission_pay_day?: number
          commission_pay_frequency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          commission_pay_day?: number
          commission_pay_frequency?: string
          created_at?: string
          updated_at?: string
        }
      }
      tracked_metrics: {
        Row: {
          id: string
          user_id: string
          metric_name: string
          metric_type: string
          tracking_frequency: string
          reminder_enabled: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          metric_name: string
          metric_type?: string
          tracking_frequency?: string
          reminder_enabled?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          metric_name?: string
          metric_type?: string
          tracking_frequency?: string
          reminder_enabled?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      metric_entries: {
        Row: {
          id: string
          user_id: string
          metric_id: string
          value: number
          period_start: string
          period_end: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          metric_id: string
          value: number
          period_start: string
          period_end: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          metric_id?: string
          value?: number
          period_start?: string
          period_end?: string
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Sale = Database['public']['Tables']['sales']['Row']
export type PaymentRecord = Database['public']['Tables']['payment_records']['Row']
export type Settings = Database['public']['Tables']['settings']['Row']
export type TrackedMetric = Database['public']['Tables']['tracked_metrics']['Row']
export type MetricEntry = Database['public']['Tables']['metric_entries']['Row']

// Journal types
export interface JournalEntry {
  id: string
  user_id: string
  entry_date: string
  what_went_well: string | null
  what_didnt_go_well: string | null
  what_to_improve: string | null
  where_need_support: string | null
  additional_notes: string | null
  mood_rating: number | null
  created_at: string
  updated_at: string
}

// Habit types
export interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  category: 'personal' | 'professional'
  frequency: 'daily' | 'weekly'
  target_days: number[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HabitCompletion {
  id: string
  habit_id: string
  user_id: string
  completed_date: string
  created_at: string
}

// Streak types
export interface UserStreak {
  id: string
  user_id: string
  streak_type: 'journal' | 'metrics' | 'habits' | 'login'
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  created_at: string
  updated_at: string
}

// Badge types
export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
}

// Badge definitions
export interface BadgeDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: 'streak' | 'achievement' | 'milestone'
  requirement: string
}

// Call Recording types
export interface CallAnalysis {
  opening_rapport: {
    score: number
    feedback: string
    highlights: string[]
  }
  discovery_questions: {
    score: number
    feedback: string
    highlights: string[]
  }
  pain_identification: {
    score: number
    feedback: string
    highlights: string[]
  }
  value_proposition: {
    score: number
    feedback: string
    highlights: string[]
  }
  objection_handling: {
    score: number
    feedback: string
    highlights: string[]
  }
  closing_techniques: {
    score: number
    feedback: string
    highlights: string[]
  }
  talk_listen_ratio: {
    rep_percentage: number
    prospect_percentage: number
    feedback: string
  }
  key_improvements: string[]
  strengths: string[]
  summary: string
}

export interface CallRecording {
  id: string
  user_id: string
  title: string
  file_name: string
  file_url: string
  file_size: number | null
  duration_seconds: number | null
  status: 'uploading' | 'transcribing' | 'analyzing' | 'completed' | 'failed'
  error_message: string | null
  transcript: string | null
  analysis: CallAnalysis | null
  overall_score: number | null
  created_at: string
  updated_at: string
}

// Organization types
export type OrganizationBillingType = 'org_pays' | 'user_pays'
export type OrganizationSubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'incomplete'
export type OrganizationSubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise'
export type OrganizationMemberRole = 'owner' | 'admin' | 'member'
export type OrganizationMemberStatus = 'active' | 'suspended' | 'pending'
export type OrganizationInviteStatus = 'active' | 'revoked' | 'expired'

export interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  billing_type: OrganizationBillingType
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: OrganizationSubscriptionStatus
  subscription_plan: OrganizationSubscriptionPlan
  max_seats: number
  used_seats: number
  settings: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationMemberRole
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: OrganizationSubscriptionStatus | 'none'
  status: OrganizationMemberStatus
  invited_at: string | null
  joined_at: string
  created_at: string
  updated_at: string
  // Joined fields
  user?: {
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface OrganizationInvite {
  id: string
  organization_id: string
  invite_code: string
  invite_token: string
  email: string | null
  role: 'admin' | 'member'
  max_uses: number | null
  use_count: number
  expires_at: string | null
  status: OrganizationInviteStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface OrganizationActivityLog {
  id: string
  organization_id: string
  user_id: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
  // Joined fields
  user?: {
    email: string
    full_name: string | null
  }
}

// Organization with member info (for user's org list)
export interface UserOrganization {
  organization_id: string
  organization_name: string
  organization_slug: string
  organization_logo: string | null
  user_role: OrganizationMemberRole
  member_count: number
  billing_type: OrganizationBillingType
  subscription_status: OrganizationSubscriptionStatus
}
