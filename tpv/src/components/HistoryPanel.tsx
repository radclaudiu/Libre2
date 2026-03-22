import { useState, useEffect, useCallback } from 'react';
import { billsApi } from '../lib/api';
import { Bill } from '../types';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  token: string;
}

function formatPrice(price: number): string {
  return price.toFixed(2) + ' \u20AC';
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryPanel({ token }: Props) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

  const loadBills = useCallback(async () => {
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

  const filteredBills = dateFilter
    ? bills.filter(b => b.closedAt && b.closedAt.startsWith(dateFilter))
    : bills;

  const dayTotal = filteredBills.reduce((sum, b) => sum + Number(b.total), 0);

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Historial</h2>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
          <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-semibold">
            Total: {formatPrice(dayTotal)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredBills.map(bill => (
          <div key={bill.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
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

        {filteredBills.length === 0 && (
          <div className="text-center py-12 text-gray-500">No hay cuentas cerradas para esta fecha</div>
        )}
      </div>
    </div>
  );
}
