import type { AppRole, CommissionStatus, OrderStatus } from './domain'

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string
          name: string
          slug: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          store_id: string | null
          full_name: string | null
          email: string | null
          role: AppRole
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
      }
      store_branding: {
        Row: {
          store_id: string
          store_name: string
          logo_url: string | null
          favicon_url: string | null
          hero_title: string | null
          hero_subtitle: string | null
          primary_color: string
          accent_color: string
          support_email: string | null
          support_phone: string | null
          address: string | null
          footer_text: string | null
          currency_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          store_id: string
          store_name: string
          logo_url?: string | null
          favicon_url?: string | null
          hero_title?: string | null
          hero_subtitle?: string | null
          primary_color?: string
          accent_color?: string
          support_email?: string | null
          support_phone?: string | null
          address?: string | null
          footer_text?: string | null
          receipt_header?: string | null
          receipt_footer?: string | null
          invoice_notes?: string | null
          currency_code?: string
          social_links?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          store_id: string
          name: string
          slug: string
          description: string | null
          is_active: boolean
        }
      }
      products: {
        Row: {
          id: string
          store_id: string
          name: string
          slug: string
          short_description: string | null
          description: string | null
          sku: string
          category_id: string | null
          price: number
          sale_price: number | null
          is_on_sale: boolean
          sale_starts_at: string | null
          sale_ends_at: string | null
          stock_quantity: number
          is_available: boolean
          track_inventory: boolean
          image_urls: string[]
          is_featured: boolean
          created_at: string
          updated_at: string
          archived_at: string | null
        }
      }
      orders: {
        Row: {
          id: string
          store_id: string
          customer_id: string | null
          order_number: string
          source: 'online' | 'pos'
          status: OrderStatus
          subtotal_amount: number
          discount_amount: number
          total_amount: number
          payment_status: 'pending' | 'paid' | 'cancelled' | 'refunded'
          placed_at: string
          idempotency_key: string
        }
      }
      agents: {
        Row: {
          id: string
          store_id: string
          profile_id: string
          referral_code: string
          commission_type: 'fixed' | 'percentage'
          commission_value: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
      }
      commissions: {
        Row: {
          id: string
          store_id: string
          agent_id: string
          order_id: string
          status: CommissionStatus
          commission_type: 'fixed' | 'percentage'
          commission_rate_or_value: number
          commission_amount: number
          payout_id: string | null
          approved_at: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
      }
      commission_payouts: {
        Row: {
          id: string
          store_id: string
          agent_id: string
          payout_reference: string
          total_amount: number
          payout_method: string
          payout_notes: string | null
          processed_by: string
          processed_at: string
          idempotency_key: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      checkout_order_atomic: {
        Args: {
          p_store_id: string
          p_customer_id: string | null
          p_items: unknown
          p_idempotency_key: string
          p_referral_code?: string | null
          p_notes?: string | null
        }
        Returns: {
          order_id: string
          order_number: string
          total_amount: number
        }[]
      }
      complete_pos_sale_atomic: {
        Args: {
          p_store_id: string
          p_cashier_id: string
          p_items: unknown
          p_cash_received: number
          p_idempotency_key: string
          p_customer_id?: string | null
          p_notes?: string | null
        }
        Returns: {
          pos_transaction_id: string
          order_id: string
          receipt_number: string
        }[]
      }
      process_commission_payout: {
        Args: {
          p_store_id: string
          p_agent_id: string
          p_processed_by: string
          p_idempotency_key: string
          p_payout_method: string
          p_payout_notes?: string | null
        }
        Returns: {
          payout_id: string
          payout_reference: string
          total_amount: number
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
