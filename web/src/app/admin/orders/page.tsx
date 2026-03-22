'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ordersApi } from '@/lib/api';
import { Order } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { Clock, CheckCircle, Truck, XCircle } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ACCEPTED: { label: 'Aceptado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  SERVED: { label: 'Servido', color: 'bg-green-100 text-green-700', icon: Truck },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function OrdersPage() {
  const { token, company } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const data = await ordersApi.getAll(token, filter ? { status: filter } : undefined) as Order[];
      setOrders(data);
    } catch {
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Socket.io connection
  useEffect(() => {
    if (!token || !company) return;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket: Socket = io(wsUrl, { auth: { token } });

    socket.on('new_order', (order: Order) => {
      setOrders(prev => [order, ...prev]);
      toast.success(`Nuevo pedido - ${order.table?.name || 'Mesa'}`);
    });

    socket.on('order_status_changed', (updated: Order) => {
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    });

    return () => { socket.disconnect(); };
  }, [token, company]);

  const handleStatusChange = async (orderId: string, status: string) => {
    if (!token) return;
    try {
      await ordersApi.updateStatus(token, orderId, status);
      loadOrders();
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const calculateOrderTotal = (order: Order) => {
    return order.items.reduce((sum, item) => {
      const extrasTotal = (item.extras || []).reduce((s, e) => s + e.price, 0);
      return sum + (item.price + extrasTotal) * item.quantity;
    }, 0);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">Todos</option>
          <option value="PENDING">Pendientes</option>
          <option value="ACCEPTED">Aceptados</option>
          <option value="SERVED">Servidos</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
      </div>

      <div className="space-y-4">
        {orders.map(order => {
          const status = statusConfig[order.status];
          const StatusIcon = status.icon;
          return (
            <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{order.table?.name || 'Mesa'}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                    <StatusIcon size={14} />
                    {status.label}
                  </span>
                </div>
                <span className="text-sm text-gray-500">{formatDate(order.createdAt)}</span>
              </div>

              <div className="space-y-1 mb-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.name}
                      {item.extras.length > 0 && (
                        <span className="text-gray-400 ml-1">
                          (+{item.extras.map(e => e.name).join(', ')})
                        </span>
                      )}
                    </span>
                    <span className="font-medium">
                      {formatPrice((item.price + (item.extras || []).reduce((s, e) => s + e.price, 0)) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded mb-3">
                  Notas: {order.notes}
                </p>
              )}

              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-bold text-primary-600">
                  Total: {formatPrice(calculateOrderTotal(order))}
                </span>
                <div className="flex gap-2">
                  {order.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id, 'ACCEPTED')}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  {order.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'SERVED')}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                    >
                      Marcar servido
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500">No hay pedidos</div>
        )}
      </div>
    </div>
  );
}
