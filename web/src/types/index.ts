export interface Company {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  active: boolean;
  companyId: string;
  _count?: { products: number };
  products?: Product[];
}

export interface ProductExtra {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  active: boolean;
  extras: ProductExtra[];
  categoryId: string;
  companyId: string;
  category?: { id: string; name: string };
}

export interface Table {
  id: string;
  name: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  status: 'FREE' | 'OCCUPIED';
  qrCode: string | null;
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

export interface SessionCheckResult {
  active: boolean;
  sessionToken?: string;
  sessionId?: string;
  table: { id: string; name: string };
  company: Company;
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

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  extras: ProductExtra[];
}

export interface MenuData {
  company: Company;
  categories: (Category & { products: Product[] })[];
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  company: Company;
}
