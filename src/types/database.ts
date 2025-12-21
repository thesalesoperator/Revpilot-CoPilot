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
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
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
