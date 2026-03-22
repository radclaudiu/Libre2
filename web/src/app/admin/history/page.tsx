'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { billsApi } from '@/lib/api';
import { Bill } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function HistoryPage() {
  const { token } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);

  const loadBills = useCallback(async () => {
    if (!token) return;
    try {
      const data = await billsApi.getAll(token, { status: 'CLOSED' }) as Bill[];
      setBills(data);
    } catch {
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadBills(); }, [loadBills]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Historial de cuentas</h1>

      <div className="space-y-3">
        {bills.map(bill => (
          <div key={bill.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-4">
                <span className="font-bold">{bill.table?.name || 'Mesa'}</span>
                <span className="text-sm text-gray-500">
                  {bill.closedAt ? formatDate(bill.closedAt) : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-primary-600">{formatPrice(Number(bill.total))}</span>
                {expandedBill === bill.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {expandedBill === bill.id && (
              <div className="px-4 pb-4 border-t">
                {bill.orders.map((order, oIdx) => (
                  <div key={order.id} className="mt-3">
                    <p className="text-xs text-gray-400 mb-1">
                      Pedido #{oIdx + 1} - {formatDate(order.createdAt)}
                      {order.status === 'CANCELLED' && (
                        <span className="ml-2 text-red-500">(Cancelado)</span>
                      )}
                    </p>
                    {order.items.map((item, iIdx) => (
                      <div key={iIdx} className="flex justify-between text-sm py-0.5">
                        <span>
                          {item.quantity}x {item.name}
                          {item.extras.length > 0 && (
                            <span className="text-gray-400 ml-1">
                              (+{item.extras.map(e => e.name).join(', ')})
                            </span>
                          )}
                        </span>
                        <span>{formatPrice((item.price + item.extras.reduce((s, e) => s + e.price, 0)) * item.quantity)}</span>
                      </div>
                    ))}
                    {order.notes && (
                      <p className="text-xs text-gray-500 mt-1">Notas: {order.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {bills.length === 0 && (
          <div className="text-center py-12 text-gray-500">No hay cuentas cerradas</div>
        )}
      </div>
    </div>
  );
}
