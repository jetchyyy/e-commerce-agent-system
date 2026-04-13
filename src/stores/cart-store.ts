import { create } from 'zustand'

import type { Product } from '../types/domain'

export interface CartLine {
  productId: string
  storeId: string
  name: string
  sku: string
  price: number
  quantity: number
  imageUrl: string | null
}

interface CartState {
  items: CartLine[]
  addItem: (product: Product, quantity?: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clear: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (product, quantity = 1) =>
    set((state) => {
      const existing = state.items.find((item) => item.productId === product.id)

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          ),
        }
      }

      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            storeId: product.store_id,
            name: product.name,
            sku: product.sku,
            price: product.sale_price ?? product.price,
            quantity,
            imageUrl: product.image_urls[0] ?? null,
          },
        ],
      }
    }),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        )
        .filter((item) => item.quantity > 0),
    })),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    })),
  clear: () => set({ items: [] }),
}))
