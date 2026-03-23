export interface ProductExtra {
  name: string;
  price: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  extras: ProductExtra[];
}

export interface Order {
  id: string;
  tableId: string;
  companyId: string;
  sessionId: string;
  items: OrderItem[];
  status: 'PENDING' | 'ACCEPTED' | 'SERVED' | 'CANCELLED';
  notes: string | null;
  createdAt: string;
  table?: { id: string; name: string };
}

export interface Table {
  id: string;
  name: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  status: 'FREE' | 'OCCUPIED';
  companyId: string;
}

export interface TableSession {
  id: string;
  tableId: string;
  companyId: string;
  sessionToken: string;
  status: 'ACTIVE' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  table?: { id: string; name: string };
  orders?: Array<{ id: string; status: string; createdAt: string }>;
}

export interface Bill {
  id: string;
  tableId: string;
  companyId: string;
  sessionId: string;
  orders: Order[];
  total: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  table?: { id: string; name: string };
  session?: { id: string; openedAt: string; closedAt: string | null; status: string };
}

export interface TPVSettings {
  printerName: string;
  paperWidth: '80mm' | '58mm';
  autoPrint: boolean;
  soundEnabled: boolean;
  serverUrl: string;
}
