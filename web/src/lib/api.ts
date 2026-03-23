const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(res.status, error.message || 'Request failed');
  }

  if (res.status === 204) return null as T;
  return res.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: Record<string, string>; company: Record<string, string> }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { email: string; password: string; name: string; companyName: string }) =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Menu (public)
export const menuApi = {
  getMenu: (companySlug: string) =>
    apiFetch<{ company: Record<string, string>; categories: Record<string, unknown>[] }>(`/api/menu/${encodeURIComponent(companySlug)}`),
};

// Sessions (public check, auth for others)
export const sessionsApi = {
  check: (tableId: string) =>
    apiFetch<{ active: boolean; sessionToken?: string; sessionId?: string; table: { id: string; name: string }; company: { id: string; name: string; slug: string } }>(
      `/api/sessions/check/${encodeURIComponent(tableId)}`
    ),
  open: (token: string, tableId: string) =>
    apiFetch<{ session: Record<string, unknown>; bill: Record<string, unknown> }>('/api/sessions/open', {
      method: 'POST',
      token,
      body: JSON.stringify({ tableId }),
    }),
  close: (token: string, sessionId: string) =>
    apiFetch<{ session: Record<string, unknown>; bill: Record<string, unknown>; total: number }>(
      `/api/sessions/close/${encodeURIComponent(sessionId)}`,
      { method: 'PUT', token }
    ),
  getActive: (token: string) =>
    apiFetch<Record<string, unknown>[]>('/api/sessions/active', { token }),
};

// Orders (public create with sessionToken, auth for others)
export const ordersApi = {
  create: (data: { tableId: string; sessionToken: string; items: Record<string, unknown>[]; notes?: string }) =>
    apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAll: (token: string, params?: { tableId?: string; sessionId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.tableId) query.set('tableId', params.tableId);
    if (params?.sessionId) query.set('sessionId', params.sessionId);
    if (params?.status) query.set('status', params.status);
    return apiFetch<Record<string, unknown>[]>(`/api/orders?${query.toString()}`, { token });
  },
  updateStatus: (token: string, id: string, status: string) =>
    apiFetch(`/api/orders/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ status }),
    }),
};

// Categories (admin)
export const categoriesApi = {
  getAll: (token: string) => apiFetch<Record<string, unknown>[]>('/api/categories', { token }),
  create: (token: string, data: { name: string; order?: number }) =>
    apiFetch('/api/categories', { method: 'POST', token, body: JSON.stringify(data) }),
  update: (token: string, id: string, data: Partial<{ name: string; order: number; active: boolean }>) =>
    apiFetch(`/api/categories/${encodeURIComponent(id)}`, { method: 'PUT', token, body: JSON.stringify(data) }),
  delete: (token: string, id: string) =>
    apiFetch(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
};

// Products (admin)
export const productsApi = {
  getAll: (token: string, categoryId?: string) => {
    const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
    return apiFetch<Record<string, unknown>[]>(`/api/products${query}`, { token });
  },
  create: (token: string, data: Record<string, unknown>) =>
    apiFetch('/api/products', { method: 'POST', token, body: JSON.stringify(data) }),
  update: (token: string, id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/products/${encodeURIComponent(id)}`, { method: 'PUT', token, body: JSON.stringify(data) }),
  delete: (token: string, id: string) =>
    apiFetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
  uploadImage: (token: string, id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch(`/api/products/${encodeURIComponent(id)}/image`, {
      method: 'POST',
      token,
      body: formData,
    });
  },
};

// Tables (admin)
export const tablesApi = {
  getAll: (token: string) => apiFetch<Record<string, unknown>[]>('/api/tables', { token }),
  create: (token: string, data: { name: string; posX?: number; posY?: number }) =>
    apiFetch('/api/tables', { method: 'POST', token, body: JSON.stringify(data) }),
  update: (token: string, id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/tables/${encodeURIComponent(id)}`, { method: 'PUT', token, body: JSON.stringify(data) }),
  updatePosition: (token: string, id: string, data: { posX: number; posY: number; width?: number; height?: number }) =>
    apiFetch(`/api/tables/${encodeURIComponent(id)}/position`, { method: 'PUT', token, body: JSON.stringify(data) }),
  delete: (token: string, id: string) =>
    apiFetch(`/api/tables/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
  generateQR: (token: string, id: string, domain?: string) => {
    const query = domain ? `?domain=${encodeURIComponent(domain)}` : '';
    return apiFetch<{ url: string; qrImage: string; tableName: string }>(`/api/tables/${encodeURIComponent(id)}/qr${query}`, {
      method: 'POST',
      token,
    });
  },
};

// Bills (admin)
export const billsApi = {
  getAll: (token: string, params?: { tableId?: string; sessionId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.tableId) query.set('tableId', params.tableId);
    if (params?.sessionId) query.set('sessionId', params.sessionId);
    if (params?.status) query.set('status', params.status);
    return apiFetch<Record<string, unknown>[]>(`/api/bills?${query.toString()}`, { token });
  },
};

export { ApiError };
