import { useState, useEffect } from 'react';
import { TPVSettings } from '../types';
import toast from 'react-hot-toast';
import { Save, Printer } from 'lucide-react';

interface Props {
  settings: TPVSettings;
  onSave: (settings: TPVSettings) => void;
}

export default function SettingsPanel({ settings, onSave }: Props) {
  const [form, setForm] = useState<TPVSettings>(settings);
  const [printers, setPrinters] = useState<Array<{ name: string; isDefault: boolean }>>([]);

  useEffect(() => {
    async function loadPrinters() {
      if (window.electronAPI) {
        const list = await window.electronAPI.getPrinters();
        setPrinters(list);
      }
    }
    loadPrinters();
  }, []);

  const handleSave = () => {
    onSave(form);
    toast.success('Configuración guardada');
  };

  const handleTestPrint = async () => {
    if (!window.electronAPI) {
      toast.error('Función disponible solo en la app de escritorio');
      return;
    }

    const content = `
      <div class="header">================================</div>
      <div class="header">PRUEBA DE IMPRESION</div>
      <div>Fecha: ${new Date().toLocaleString('es-ES')}</div>
      <div class="header">================================</div>
      <div>La impresora funciona correctamente</div>
      <div class="header">================================</div>
    `;

    const result = await window.electronAPI.printOrder({
      content,
      printerName: form.printerName,
      silent: true,
    });

    if (result.success) {
      toast.success('Impresión de prueba enviada');
    } else {
      toast.error(`Error: ${result.error}`);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <h2 className="text-2xl font-bold mb-6">Configuración</h2>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg space-y-4">
        {/* Printer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Impresora</label>
          {printers.length > 0 ? (
            <select
              value={form.printerName}
              onChange={e => setForm(f => ({ ...f, printerName: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">-- Impresora por defecto --</option>
              {printers.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name} {p.isDefault ? '(predeterminada)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={form.printerName}
              onChange={e => setForm(f => ({ ...f, printerName: e.target.value }))}
              placeholder="Nombre de la impresora"
              className="w-full px-3 py-2 border rounded-lg"
            />
          )}
        </div>

        {/* Paper width */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ancho de papel</label>
          <select
            value={form.paperWidth}
            onChange={e => setForm(f => ({ ...f, paperWidth: e.target.value as '80mm' | '58mm' }))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="80mm">80mm (estándar)</option>
            <option value="58mm">58mm (pequeño)</option>
          </select>
        </div>

        {/* Auto print */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.autoPrint}
            onChange={e => setForm(f => ({ ...f, autoPrint: e.target.checked }))}
            id="autoPrint"
            className="w-4 h-4"
          />
          <label htmlFor="autoPrint" className="text-sm font-medium">
            Imprimir automáticamente al recibir pedido
          </label>
        </div>

        {/* Sound */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.soundEnabled}
            onChange={e => setForm(f => ({ ...f, soundEnabled: e.target.checked }))}
            id="sound"
            className="w-4 h-4"
          />
          <label htmlFor="sound" className="text-sm font-medium">
            Sonido de notificación
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-primary-500 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-600 flex items-center justify-center gap-2"
          >
            <Save size={18} /> Guardar
          </button>
          <button
            onClick={handleTestPrint}
            className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Printer size={18} /> Probar impresión
          </button>
        </div>
      </div>
    </div>
  );
}
