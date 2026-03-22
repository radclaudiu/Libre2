import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { tablesApi, ordersApi, billsApi } from '../lib/api';
import { getApiUrl } from '../lib/api';
import { Table, Order, Bill, TPVSettings } from '../types';
import { printCommand } from '../lib/printer';
import TablePanel from './TablePanel';
import SettingsPanel from './SettingsPanel';
import HistoryPanel from './HistoryPanel';
import {
  Grid3X3,
  Settings,
  History,
  LogOut,
} from 'lucide-react';

interface Props {
  auth: {
    token: string;
    user: Record<string, string>;
    company: Record<string, string>;
  };
  onLogout: () => void;
}

const DEFAULT_SETTINGS: TPVSettings = {
  printerName: '',
  paperWidth: '80mm',
  autoPrint: true,
  soundEnabled: true,
  serverUrl: 'http://localhost:3001',
};

// Notification sound as a simple beep using AudioContext
function playBeep() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

export default function MainScreen({ auth, onLogout }: Props) {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'tables' | 'settings' | 'history'>('tables');
  const [settings, setSettings] = useState<TPVSettings>(DEFAULT_SETTINGS);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      if (window.electronAPI) {
        const stored = await window.electronAPI.storeGet('settings') as TPVSettings | undefined;
        if (stored) setSettings({ ...DEFAULT_SETTINGS, ...stored });
      } else {
        const stored = localStorage.getItem('tpv_settings');
        if (stored) {
          try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }); } catch { /* ignore */ }
        }
      }
    }
    loadSettings();
  }, []);

  // Save settings
  const saveSettings = useCallback(async (newSettings: TPVSettings) => {
    setSettings(newSettings);
    if (window.electronAPI) {
      await window.electronAPI.storeSet('settings', newSettings);
    } else {
      localStorage.setItem('tpv_settings', JSON.stringify(newSettings));
    }
  }, []);

  // Load tables
  const loadTables = useCallback(async () => {
    try {
      const data = await tablesApi.getAll(auth.token) as Table[];
      setTables(data);
    } catch {
      // Silently fail
    }
  }, [auth.token]);

  useEffect(() => { loadTables(); }, [loadTables]);

  // Load orders for selected table
  const loadOrders = useCallback(async (tableId: string) => {
    try {
      const data = await ordersApi.getAll(auth.token, { tableId }) as Order[];
      setOrders(data);
    } catch {
      toast.error('Error al cargar pedidos');
    }
  }, [auth.token]);

  useEffect(() => {
    if (selectedTable) loadOrders(selectedTable.id);
  }, [selectedTable, loadOrders]);

  // Socket.io
  useEffect(() => {
    const wsUrl = getApiUrl();
    const socket = io(wsUrl, { auth: { token: auth.token } });
    socketRef.current = socket;

    socket.on('new_order', (order: Order) => {
      // Play sound
      if (settings.soundEnabled) playBeep();

      // Show notification
      const tableName = order.table?.name || 'Mesa';
      toast.success(`Nuevo pedido - ${tableName}`, { duration: 5000 });

      // Update table status
      setTables(prev => prev.map(t =>
        t.id === order.tableId ? { ...t, status: 'OCCUPIED' as const } : t
      ));

      // If viewing this table, add order
      if (selectedTable?.id === order.tableId) {
        setOrders(prev => [order, ...prev]);
      }

      // Auto print
      if (settings.autoPrint) {
        printCommand(order, tableName, settings).catch(() => {
          toast.error('Error al imprimir comanda');
        });
      }
    });

    socket.on('order_status_changed', (updated: Order) => {
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    });

    socket.on('table_status_changed', (data: { tableId: string; status: 'FREE' | 'OCCUPIED' }) => {
      setTables(prev => prev.map(t =>
        t.id === data.tableId ? { ...t, status: data.status } : t
      ));
      if (data.status === 'FREE' && selectedTable?.id === data.tableId) {
        setSelectedTable(null);
        setOrders([]);
      }
    });

    return () => { socket.disconnect(); };
  }, [auth.token, settings.soundEnabled, settings.autoPrint, selectedTable?.id]);

  // Drag handlers for tables
  const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging(tableId);
    setDragOffset({ x: e.clientX - rect.left - table.posX, y: e.clientY - rect.top - table.posY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const newY = Math.max(0, e.clientY - rect.top - dragOffset.y);
    setTables(prev => prev.map(t => t.id === dragging ? { ...t, posX: newX, posY: newY } : t));
  };

  const handleMouseUp = async () => {
    if (!dragging) return;
    const table = tables.find(t => t.id === dragging);
    if (table) {
      try {
        await tablesApi.updatePosition(auth.token, table.id, { posX: table.posX, posY: table.posY });
      } catch { /* ignore */ }
    }
    setDragging(null);
  };

  const handleTableClick = (table: Table) => {
    if (!dragging) {
      setSelectedTable(table);
      loadOrders(table.id);
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await ordersApi.updateStatus(auth.token, orderId, status);
      if (selectedTable) loadOrders(selectedTable.id);
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const handleCloseTable = async () => {
    if (!selectedTable) return;
    try {
      const bills = await billsApi.getAll(auth.token, { tableId: selectedTable.id, status: 'OPEN' }) as Bill[];
      if (bills.length > 0) {
        await billsApi.close(auth.token, bills[0].id);
        toast.success('Mesa cerrada');
        setSelectedTable(null);
        setOrders([]);
        loadTables();
      } else {
        toast.error('No hay cuenta abierta para esta mesa');
      }
    } catch {
      toast.error('Error al cerrar mesa');
    }
  };

  const handleReprint = async (order: Order) => {
    const tableName = selectedTable?.name || order.table?.name || 'Mesa';
    const result = await printCommand(order, tableName, settings);
    if (result.success) {
      toast.success('Comanda reimpresa');
    } else {
      toast.error('Error al reimprimir');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top bar */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-primary-600">QR Restaurant TPV</h1>
          <span className="text-sm text-gray-500">{auth.company.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('tables')}
            className={`p-2 rounded-lg ${activeTab === 'tables' ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Grid3X3 size={20} />
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`p-2 rounded-lg ${activeTab === 'history' ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <History size={20} />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-lg ${activeTab === 'settings' ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Settings size={20} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button onClick={onLogout} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Cerrar sesión">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'tables' && (
          <>
            {/* Floor plan */}
            <div className="flex-1 p-4 overflow-auto">
              <div
                ref={canvasRef}
                className="relative bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-200"
                style={{ height: '600px', minWidth: '800px' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {tables.map(table => (
                  <div
                    key={table.id}
                    className={`absolute rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer select-none transition-all ${
                      table.status === 'OCCUPIED'
                        ? 'bg-red-100 border-2 border-red-400 hover:border-red-500'
                        : 'bg-green-100 border-2 border-green-400 hover:border-green-500'
                    } ${selectedTable?.id === table.id ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
                    style={{ left: table.posX, top: table.posY, width: table.width, height: table.height }}
                    onMouseDown={e => handleMouseDown(e, table.id)}
                    onClick={() => handleTableClick(table)}
                  >
                    <span className="font-semibold text-sm">{table.name}</span>
                    <span className={`text-xs ${table.status === 'OCCUPIED' ? 'text-red-600' : 'text-green-600'}`}>
                      {table.status === 'OCCUPIED' ? 'Ocupada' : 'Libre'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Table detail panel */}
            {selectedTable && (
              <TablePanel
                table={selectedTable}
                orders={orders}
                onClose={() => { setSelectedTable(null); setOrders([]); }}
                onStatusChange={handleStatusChange}
                onCloseTable={handleCloseTable}
                onReprint={handleReprint}
              />
            )}
          </>
        )}

        {activeTab === 'settings' && (
          <SettingsPanel settings={settings} onSave={saveSettings} />
        )}

        {activeTab === 'history' && (
          <HistoryPanel token={auth.token} />
        )}
      </div>
    </div>
  );
}
