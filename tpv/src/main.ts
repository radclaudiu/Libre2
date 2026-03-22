import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import Store from 'electron-store';

const store = new Store();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    title: 'QR Restaurant TPV',
    autoHideMenuBar: true,
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

// IPC Handlers

// Get available printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  const printers = mainWindow.webContents.getPrintersAsync
    ? await mainWindow.webContents.getPrintersAsync()
    : [];
  return printers.map((p: { name: string; isDefault: boolean }) => ({
    name: p.name,
    isDefault: p.isDefault,
  }));
});

// Print order command
ipcMain.handle('print-order', async (_event, { content, printerName, silent }) => {
  if (!mainWindow) return { success: false, error: 'No window' };

  try {
    // Create a hidden window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @page { margin: 0; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              margin: 0;
              padding: 5mm;
              width: 80mm;
            }
            .header { text-align: center; font-weight: bold; font-size: 14px; }
            .line { border-top: 1px dashed #000; margin: 4px 0; }
            .item { display: flex; justify-content: space-between; }
            .extra { padding-left: 15px; font-size: 11px; color: #555; }
            .notes { margin-top: 8px; font-style: italic; }
            .total { font-weight: bold; font-size: 14px; text-align: right; margin-top: 8px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `;

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    return new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: silent !== false,
          printBackground: true,
          deviceName: printerName || undefined,
        },
        (success, failureReason) => {
          printWindow.close();
          resolve({ success, error: failureReason });
        }
      );
    });
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// Store operations
ipcMain.handle('store-get', (_event, key: string) => {
  return store.get(key);
});

ipcMain.handle('store-set', (_event, key: string, value: unknown) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store-delete', (_event, key: string) => {
  store.delete(key);
  return true;
});
