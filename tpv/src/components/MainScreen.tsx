import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { tablesApi, ordersApi, sessionsApi } from '../lib/api';
import { getApiUrl } from '../lib/api';
import { Table, Order, TableSession, TPVSettings } from '../types';
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
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'tables' | 'settings' | 'history'>('tables');
  const [settings, setSettings] = useState<TPVSettings>(DEFAULT_SETTINGS);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

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
    } catch { /* silent */ }
  }, [auth.token]);

  // Load active sessions
  const loadSessions = useCallback(async () => {
    try {
      const data = await sessionsApi.getActive(auth.token) as TableSession[];
      setSessions(data);
    } catch { /* silent */ }
  }, [auth.token]);

  useEffect(() => {
    loadTables();
    loadSessions();
  }, [loadTables, loadSessions]);

  // Load orders for selected session
  const loadOrders = useCallback(async (sessionId: string) => {
    try {
      const data = await ordersApi.getAll(auth.token, { sessionId }) as Order[];
      setOrders(data);
    } catch {
      toast.error('Error al cargar pedidos');
    }
  }, [auth.token]);

  useEffect(() => {
    if (selectedSession) loadOrders(selectedSession.id);
  }, [selectedSession, loadOrders]);

  // Get session for a table
  const getTableSession = useCallback((tableId: string) => {
    return sessions.find(s => s.tableId === tableId && s.status === 'ACTIVE');
  }, [sessions]);

  // Check if table has pending orders
  const hasPendingOrders = useCallback((tableId: string) => {
    const session = getTableSession(tableId);
    if (!session || !session.orders) return false;
    return session.orders.some(o => o.status === 'PENDING');
  }, [getTableSession]);

  // Get table color: green=free, yellow=occupied no pending, red=occupied with pending
  const getTableColor = useCallback((table: Table) => {
    const session = getTableSession(table.id);
    if (!session) return { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-600', label: 'Libre' };
    if (hasPendingOrders(table.id)) {
      return { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-600', label: 'Pedidos pendientes' };
    }
    return { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-600', label: 'Sesión activa' };
  }, [getTableSession, hasPendingOrders]);

  // Socket.io
  useEffect(() => {
    const wsUrl = getApiUrl();
    const socket: Socket = io(wsUrl, { auth: { token: auth.token } });

    socket.on('new_order', (order: Order) => {
      if (settings.soundEnabled) playBeep();
      const tableName = order.table?.name || 'Mesa';
      toast.success(`Nuevo pedido - ${tableName}`, { duration: 5000 });

      // Refresh sessions to update pending order counts
      loadSessions();

      if (selectedSession?.id === order.sessionId) {
        setOrders(prev => [order, ...prev]);
      }

      if (settings.autoPrint) {
        printCommand(order, tableName, settings).catch(() => {
          toast.error('Error al imprimir comanda');
        });
      }
    });

    socket.on('order_status_changed', (updated: Order) => {
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      loadSessions();
    });

    socket.on('session_opened', () => {
      loadTables();
      loadSessions();
    });

    socket.on('session_closed', (data: { tableId: string }) => {
      loadTables();
      loadSessions();
      if (selectedTable?.id === data.tableId) {
        setSelectedTable(null);
        setSelectedSession(null);
        setOrders([]);
      }
    });

    socket.on('table_status_changed', () => {
      loadTables();
    });

    return () => { socket.disconnect(); };
  }, [auth.token, settings.soundEnabled, settings.autoPrint, selectedSession?.id, selectedTable?.id]);

  // Open session
  const handleOpenSession = async (tableId: string) => {
    try {
      await sessionsApi.open(auth.token, tableId);
      toast.success('Mesa abierta');
      loadTables();
      loadSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al abrir mesa';
      toast.error(msg);
    }
  };

  // Close session
  const handleCloseSession = async () => {
    if (!selectedSession) return;
    try {
      const result = await sessionsApi.close(auth.token, selectedSession.id);
      toast.success(`Mesa cerrada - Total: ${result.total.toFixed(2)} €`);
      setSelectedTable(null);
      setSelectedSession(null);
      setOrders([]);
      loadTables();
      loadSessions();
    } catch {
      toast.error('Error al cerrar mesa');
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await ordersApi.updateStatus(auth.token, orderId, status);
      if (selectedSession) loadOrders(selectedSession.id);
      loadSessions();
    } catch {
      toast.error('Error al actualizar estado');
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

  const handleTableClick = (table: Table) => {
    if (dragging) return;
    setSelectedTable(table);
    const session = getTableSession(table.id);
    setSelectedSession(session || null);
    if (session) {
      loadOrders(session.id);
    } else {
      setOrders([]);
    }
  };

  // Drag handlers
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
              <div className="flex items-center gap-4 mb-3 text-sm">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400" /> Libre</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400" /> Sesión activa</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> Pedidos pendientes</span>
              </div>
              <div
                ref={canvasRef}
                className="relative bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-200"
                style={{ height: '600px', minWidth: '800px' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {tables.map(table => {
                  const color = getTableColor(table);
                  const session = getTableSession(table.id);
                  return (
                    <div
                      key={table.id}
                      className={`absolute rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer select-none transition-all ${color.bg} border-2 ${color.border} ${
                        selectedTable?.id === table.id ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                      }`}
                      style={{ left: table.posX, top: table.posY, width: table.width, height: table.height }}
                      onMouseDown={e => handleMouseDown(e, table.id)}
                      onClick={() => handleTableClick(table)}
                    >
                      <span className="font-semibold text-sm">{table.name}</span>
                      <span className={`text-xs ${color.text}`}>{color.label}</span>
                      {session && (
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(session.openedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table detail panel */}
            {selectedTable && (
              <TablePanel
                table={selectedTable}
                session={selectedSession}
                orders={orders}
                onClose={() => { setSelectedTable(null); setSelectedSession(null); setOrders([]); }}
                onStatusChange={handleStatusChange}
                onOpenSession={() => handleOpenSession(selectedTable.id)}
                onCloseSession={handleCloseSession}
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
