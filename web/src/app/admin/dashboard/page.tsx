'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ordersApi, tablesApi, billsApi, sessionsApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { ClipboardList, Grid3X3, Euro, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    todayOrders: 0,
    occupiedTables: 0,
    totalTables: 0,
    activeSessions: 0,
    todayRevenue: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const [orders, tables, bills, activeSessions] = await Promise.all([
          ordersApi.getAll(token!) as Promise<Array<{ createdAt: string; status: string }>>,
          tablesApi.getAll(token!) as Promise<Array<{ status: string }>>,
          billsApi.getAll(token!, { status: 'CLOSED' }) as Promise<Array<{ closedAt: string; total: number }>>,
          sessionsApi.getActive(token!) as Promise<Array<Record<string, unknown>>>,
        ]);

        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(
          (o) => o.createdAt.startsWith(today)
        );
        const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
        const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length;
        const todayBills = bills.filter(
          (b) => b.closedAt && b.closedAt.startsWith(today)
        );
        const todayRevenue = todayBills.reduce((sum, b) => sum + Number(b.total), 0);

        setStats({
          todayOrders: todayOrders.length,
          occupiedTables,
          totalTables: tables.length,
          activeSessions: activeSessions.length,
          todayRevenue,
          pendingOrders,
        });
      } catch {
        // Stats failed to load
      }
    }
    load();
  }, [token]);

  const cards = [
    {
      label: 'Pedidos hoy',
      value: stats.todayOrders,
      icon: ClipboardList,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Pedidos pendientes',
      value: stats.pendingOrders,
      icon: TrendingUp,
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      label: 'Sesiones activas',
      value: `${stats.activeSessions}/${stats.totalTables}`,
      icon: Grid3X3,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Facturación hoy',
      value: formatPrice(stats.todayRevenue),
      icon: Euro,
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
