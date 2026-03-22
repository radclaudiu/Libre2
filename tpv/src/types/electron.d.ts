interface ElectronAPI {
  getPrinters: () => Promise<Array<{ name: string; isDefault: boolean }>>;
  printOrder: (options: {
    content: string;
    printerName?: string;
    silent?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  storeGet: (key: string) => Promise<unknown>;
  storeSet: (key: string, value: unknown) => Promise<boolean>;
  storeDelete: (key: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
