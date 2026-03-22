import { Table, Order } from '../types';
import { X, Printer, DoorClosed, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';

interface Props {
  table: Table;
  orders: Order[];
  onClose: () => void;
  onStatusChange: (orderId: string, status: string) => void;
  onCloseTable: () => void;
  onReprint: (order: Order) => void;
}

function formatPrice(price: number): string {
  return price.toFixed(2) + ' \u20AC';
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  ACCEPTED: { label: 'Aceptado', color: 'text-blue-600 bg-blue-50', icon: CheckCircle },
  SERVED: { label: 'Servido', color: 'text-green-600 bg-green-50', icon: Truck },
  CANCELLED: { label: 'Cancelado', color: 'text-red-600 bg-red-50', icon: XCircle },
};

export default function TablePanel({ table, orders, onClose, onStatusChange, onCloseTable, onReprint }: Props) {
  const activeOrders = orders.filter(o => o.status !== 'CANCELLED');

  const totalAccumulated = activeOrders.reduce((total, order) => {
    return total + order.items.reduce((sum, item) => {
      const extrasTotal = (item.extras || []).reduce((s, e) => s + e.price, 0);
      return sum + (item.price + extrasTotal) * item.quantity;
    }, 0);
  }, 0);

  return (
    <div className="w-96 bg-white shadow-lg border-l flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{table.name}</h2>
          <span className={`text-sm ${table.status === 'OCCUPIED' ? 'text-red-500' : 'text-green-500'}`}>
            {table.status === 'OCCUPIED' ? 'Ocupada' : 'Libre'}
          </span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X size={20} />
        </button>
      </div>

      {/* Orders */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {orders.length === 0 && (
          <p className="text-center text-gray-400 py-8">No hay pedidos para esta mesa</p>
        )}

        {orders.map((order, idx) => {
          const status = statusConfig[order.status];
          const StatusIcon = status.icon;

          return (
            <div key={order.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Pedido #{orders.length - idx}</span>
                  <span className="text-xs text-gray-400">{formatTime(order.createdAt)}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                  <StatusIcon size={12} />
                  {status.label}
                </span>
              </div>

              <div className="space-y-1 text-sm">
                {order.items.map((item, iIdx) => (
                  <div key={iIdx}>
                    <div className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    {item.extras.map((extra, eIdx) => (
                      <div key={eIdx} className="text-xs text-gray-500 pl-4 flex justify-between">
                        <span>+ {extra.name}</span>
                        <span>{formatPrice(extra.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {order.notes && (
                <p className="text-xs text-gray-600 bg-yellow-50 p-2 rounded mt-2">
                  Notas: {order.notes}
                </p>
              )}

              <div className="flex gap-2 mt-2">
                {order.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => onStatusChange(order.id, 'ACCEPTED')}
                      className="flex-1 text-xs bg-blue-500 text-white py-1.5 rounded hover:bg-blue-600"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => onStatusChange(order.id, 'CANCELLED')}
                      className="text-xs bg-red-100 text-red-600 py-1.5 px-3 rounded hover:bg-red-200"
                    >
                      Cancelar
                    </button>
                  </>
                )}
                {order.status === 'ACCEPTED' && (
                  <button
                    onClick={() => onStatusChange(order.id, 'SERVED')}
                    className="flex-1 text-xs bg-green-500 text-white py-1.5 rounded hover:bg-green-600"
                  >
                    Marcar servido
                  </button>
                )}
                <button
                  onClick={() => onReprint(order)}
                  className="text-xs bg-gray-100 text-gray-600 py-1.5 px-3 rounded hover:bg-gray-200 flex items-center gap-1"
                >
                  <Printer size={12} /> Reimprimir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-lg">Total acumulado</span>
          <span className="font-bold text-lg text-primary-600">{formatPrice(totalAccumulated)}</span>
        </div>
        {table.status === 'OCCUPIED' && (
          <button
            onClick={onCloseTable}
            className="w-full bg-primary-500 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-600 flex items-center justify-center gap-2"
          >
            <DoorClosed size={18} /> Cerrar mesa
          </button>
        )}
      </div>
    </div>
  );
}
