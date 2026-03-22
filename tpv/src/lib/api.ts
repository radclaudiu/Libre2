let API_URL = 'http://localhost:3001';

export function setApiUrl(url: string) {
  API_URL = url;
}

export function getApiUrl() {
  return API_URL;
}

async function apiFetch<T>(endpoint: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...fetchOptions, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Request failed');
  }

  if (res.status === 204) return null as T;
  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: Record<string, string>; company: Record<string, string> }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

export const tablesApi = {
  getAll: (token: string) => apiFetch<Record<string, unknown>[]>('/api/tables', { token }),
  updatePosition: (token: string, id: string, data: { posX: number; posY: number }) =>
    apiFetch(`/api/tables/${id}/position`, { method: 'PUT', token, body: JSON.stringify(data) }),
};

export const ordersApi = {
  getAll: (token: string, params?: { tableId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.tableId) query.set('tableId', params.tableId);
    if (params?.status) query.set('status', params.status);
    return apiFetch<Record<string, unknown>[]>(`/api/orders?${query}`, { token });
  },
  updateStatus: (token: string, id: string, status: string) =>
    apiFetch(`/api/orders/${id}/status`, { method: 'PUT', token, body: JSON.stringify({ status }) }),
};

export const billsApi = {
  getAll: (token: string, params?: { tableId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.tableId) query.set('tableId', params.tableId);
    if (params?.status) query.set('status', params.status);
    return apiFetch<Record<string, unknown>[]>(`/api/bills?${query}`, { token });
  },
  close: (token: string, id: string) =>
    apiFetch(`/api/bills/${id}/close`, { method: 'PUT', token }),
};
