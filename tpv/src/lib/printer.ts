import { Order, OrderItem, TPVSettings } from '../types';

function formatPrice(price: number): string {
  return price.toFixed(2);
}

function formatDate(date: string): string {
  const d = new Date(date);
  return `${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
}

export function generateCommandHtml(order: Order, tableName: string): string {
  const separator = '================================';
  const thinSeparator = '--------------------------------';

  let html = `
    <div class="header">${separator}</div>
    <div class="header">NUEVO PEDIDO - ${escapeHtml(tableName)}</div>
    <div>Fecha: ${formatDate(order.createdAt)}</div>
    <div class="header">${separator}</div>
  `;

  for (const item of order.items) {
    const itemTotal = item.price * item.quantity;
    html += `<div class="item"><span>${item.quantity}x ${escapeHtml(item.name)}</span><span>${formatPrice(itemTotal)}</span></div>`;

    for (const extra of item.extras || []) {
      html += `<div class="extra item"><span>&nbsp;&nbsp;&nbsp;+ ${escapeHtml(extra.name)}</span><span>${formatPrice(extra.price * item.quantity)}</span></div>`;
    }
  }

  if (order.notes) {
    html += `<div>${thinSeparator}</div>`;
    html += `<div class="notes">Notas: ${escapeHtml(order.notes)}</div>`;
  }

  html += `<div class="header">${separator}</div>`;

  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export async function printCommand(
  order: Order,
  tableName: string,
  settings: TPVSettings
): Promise<{ success: boolean; error?: string }> {
  const content = generateCommandHtml(order, tableName);

  if (window.electronAPI) {
    return window.electronAPI.printOrder({
      content,
      printerName: settings.printerName,
      silent: true,
    });
  }

  // Fallback: browser print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html><head>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; width: ${settings.paperWidth}; margin: 0; padding: 5mm; }
          .header { text-align: center; font-weight: bold; }
          .item { display: flex; justify-content: space-between; }
          .extra { font-size: 11px; color: #555; }
          .notes { font-style: italic; margin-top: 5px; }
        </style>
      </head><body>${content}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  }

  return { success: true };
}
