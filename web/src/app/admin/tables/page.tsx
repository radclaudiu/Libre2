'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { tablesApi } from '@/lib/api';
import { Table } from '@/types';
import toast from 'react-hot-toast';
import { Plus, Trash2, QrCode, Download, X } from 'lucide-react';

export default function TablesPage() {
  const { token } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [qrData, setQrData] = useState<{ url: string; qrImage: string; tableName: string } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const loadTables = useCallback(async () => {
    if (!token) return;
    try {
      const data = await tablesApi.getAll(token) as Table[];
      setTables(data);
    } catch {
      toast.error('Error al cargar mesas');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadTables(); }, [loadTables]);

  const handleAddTable = async () => {
    if (!token || !newTableName.trim()) return;
    try {
      await tablesApi.create(token, {
        name: newTableName,
        posX: 50 + Math.random() * 200,
        posY: 50 + Math.random() * 200,
      });
      setNewTableName('');
      setShowAddModal(false);
      loadTables();
      toast.success('Mesa creada');
    } catch {
      toast.error('Error al crear mesa');
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!token || !confirm('¿Eliminar esta mesa?')) return;
    try {
      await tablesApi.delete(token, id);
      loadTables();
      toast.success('Mesa eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleGenerateQR = async (id: string) => {
    if (!token) return;
    try {
      const data = await tablesApi.generateQR(token, id);
      setQrData(data);
    } catch {
      toast.error('Error al generar QR');
    }
  };

  const handleDownloadQR = () => {
    if (!qrData) return;
    const link = document.createElement('a');
    link.download = `qr-${qrData.tableName}.png`;
    link.href = qrData.qrImage;
    link.click();
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setDragging(tableId);
    setDragOffset({
      x: e.clientX - rect.left - table.posX,
      y: e.clientY - rect.top - table.posY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const newY = Math.max(0, e.clientY - rect.top - dragOffset.y);

    setTables(prev =>
      prev.map(t => t.id === dragging ? { ...t, posX: newX, posY: newY } : t)
    );
  };

  const handleMouseUp = async () => {
    if (!dragging || !token) { setDragging(null); return; }
    const table = tables.find(t => t.id === dragging);
    if (table) {
      try {
        await tablesApi.updatePosition(token, table.id, {
          posX: table.posX,
          posY: table.posY,
        });
      } catch {
        // Silently fail position update
      }
    }
    setDragging(null);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mesas</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-600"
        >
          <Plus size={18} /> Nueva mesa
        </button>
      </div>

      {/* Floor plan */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-700 mb-3">Plano del restaurante</h2>
        <p className="text-sm text-gray-500 mb-3">Arrastra las mesas para reorganizarlas</p>
        <div
          ref={canvasRef}
          className="relative bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg"
          style={{ height: '500px' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {tables.map(table => (
            <div
              key={table.id}
              className={`absolute rounded-lg shadow-md flex flex-col items-center justify-center cursor-move select-none transition-shadow ${
                table.status === 'OCCUPIED'
                  ? 'bg-red-100 border-2 border-red-400'
                  : 'bg-green-100 border-2 border-green-400'
              } ${dragging === table.id ? 'shadow-lg z-10' : ''}`}
              style={{
                left: table.posX,
                top: table.posY,
                width: table.width,
                height: table.height,
              }}
              onMouseDown={e => handleMouseDown(e, table.id)}
            >
              <span className="font-semibold text-sm">{table.name}</span>
              <span className={`text-xs ${table.status === 'OCCUPIED' ? 'text-red-600' : 'text-green-600'}`}>
                {table.status === 'OCCUPIED' ? 'Ocupada' : 'Libre'}
              </span>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={e => { e.stopPropagation(); handleGenerateQR(table.id); }}
                  className="p-1 rounded bg-white/80 hover:bg-white"
                  title="Generar QR"
                >
                  <QrCode size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteTable(table.id); }}
                  className="p-1 rounded bg-white/80 hover:bg-white text-red-500"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add table modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Nueva mesa</h3>
              <button onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <input
              value={newTableName}
              onChange={e => setNewTableName(e.target.value)}
              placeholder="Ej: Mesa 7"
              className="w-full px-3 py-2 border rounded-lg mb-3"
              autoFocus
            />
            <button
              onClick={handleAddTable}
              className="w-full bg-primary-500 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-600"
            >
              Crear mesa
            </button>
          </div>
        </div>
      )}

      {/* QR modal */}
      {qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">QR - {qrData.tableName}</h3>
              <button onClick={() => setQrData(null)}><X size={20} /></button>
            </div>
            <img src={qrData.qrImage} alt="QR Code" className="mx-auto mb-4 w-64 h-64" />
            <p className="text-sm text-gray-500 mb-4 break-all">{qrData.url}</p>
            <button
              onClick={handleDownloadQR}
              className="bg-primary-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-600 flex items-center gap-2 mx-auto"
            >
              <Download size={18} /> Descargar PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
