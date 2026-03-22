'use client';

import { useState, useCallback } from 'react';
import { CartItem, ProductExtra } from '@/types';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const extrasKey = JSON.stringify(item.extras.sort((a, b) => a.name.localeCompare(b.name)));
      const existing = prev.findIndex(
        i => i.productId === item.productId && JSON.stringify(i.extras.sort((a, b) => a.name.localeCompare(b.name))) === extrasKey
      );

      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          quantity: updated[existing].quantity + item.quantity,
        };
        return updated;
      }

      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter((_, i) => i !== index));
      return;
    }
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity };
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const totalPrice = items.reduce((sum, item) => {
    const itemPrice = item.price * item.quantity;
    const extrasPrice = item.extras.reduce((s: number, e: ProductExtra) => s + e.price, 0) * item.quantity;
    return sum + itemPrice + extrasPrice;
  }, 0);

  return { items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice };
}
