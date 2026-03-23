'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { menuApi, ordersApi, sessionsApi, ApiError } from '@/lib/api';
import { MenuData, Product, ProductExtra, SessionCheckResult } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { ShoppingCart, Plus, Minus, X, Send, RefreshCw, AlertTriangle } from 'lucide-react';

type PageState = 'loading' | 'no_session' | 'active' | 'session_closed' | 'error';

export default function MenuPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const tableId = params.tableId as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [tableName, setTableName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [showCart, setShowCart] = useState(false);
  const [showExtras, setShowExtras] = useState<Product | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<ProductExtra[]>([]);
  const [notes, setNotes] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [checking, setChecking] = useState(false);

  const cart = useCart();

  // Check session status
  const checkSession = useCallback(async () => {
    setChecking(true);
    try {
      const result = await sessionsApi.check(tableId) as SessionCheckResult;
      setTableName(result.table.name);
      setCompanyName(result.company.name);

      if (result.active && result.sessionToken) {
        setSessionToken(result.sessionToken);
        localStorage.setItem(`session_${tableId}`, result.sessionToken);
        setPageState('active');

        // Load menu
        const menu = await menuApi.getMenu(result.company.slug) as unknown as MenuData;
        setMenuData(menu);
        if (menu.categories.length > 0) {
          setActiveCategory(menu.categories[0].id);
        }
      } else {
        setSessionToken(null);
        localStorage.removeItem(`session_${tableId}`);
        setPageState('no_session');
      }
    } catch {
      setPageState('error');
    } finally {
      setChecking(false);
    }
  }, [tableId]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Listen for session_closed via Socket.io (public - no auth needed for listening)
  useEffect(() => {
    if (pageState !== 'active' || !sessionToken) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    // Connect without auth for public client - listen on a public namespace
    const socket: Socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      // No auth - public client
    });

    socket.on('connect', () => {
      // Join table-specific room for session events
      socket.emit('join_table', tableId);
    });

    socket.on('session_closed', (data: { tableId: string; sessionToken: string }) => {
      if (data.tableId === tableId) {
        setPageState('session_closed');
        setSessionToken(null);
        localStorage.removeItem(`session_${tableId}`);
        cart.clearCart();
      }
    });

    return () => { socket.disconnect(); };
  }, [pageState, sessionToken, tableId]);

  const handleAddProduct = (product: Product) => {
    if (product.extras && product.extras.length > 0) {
      setShowExtras(product);
      setSelectedExtras([]);
    } else {
      cart.addItem({
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: Number(product.price),
        extras: [],
      });
      toast.success('Producto añadido');
    }
  };

  const handleConfirmExtras = () => {
    if (!showExtras) return;
    cart.addItem({
      productId: showExtras.id,
      name: showExtras.name,
      quantity: 1,
      price: Number(showExtras.price),
      extras: selectedExtras,
    });
    setShowExtras(null);
    setSelectedExtras([]);
    toast.success('Producto añadido');
  };

  const toggleExtra = (extra: ProductExtra) => {
    setSelectedExtras(prev => {
      const exists = prev.find(e => e.name === extra.name);
      if (exists) return prev.filter(e => e.name !== extra.name);
      return [...prev, extra];
    });
  };

  const handleOrder = async () => {
    if (cart.items.length === 0 || !sessionToken) return;
    setOrdering(true);
    try {
      await ordersApi.create({
        tableId,
        sessionToken,
        items: cart.items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          extras: item.extras,
        })),
        notes: notes.trim() || undefined,
      });
      cart.clearCart();
      setNotes('');
      setShowCart(false);
      setOrderSent(true);
      setTimeout(() => setOrderSent(false), 5000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setPageState('session_closed');
        setSessionToken(null);
        localStorage.removeItem(`session_${tableId}`);
      } else {
        toast.error('Error al enviar el pedido');
      }
    } finally {
      setOrdering(false);
    }
  };

  // LOADING state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  // NO SESSION state
  if (pageState === 'no_session') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm">
          <div className="bg-yellow-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={40} className="text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {companyName || 'Restaurante'}
          </h1>
          <p className="text-lg text-gray-700 mb-1">{tableName || 'Mesa'}</p>
          <p className="text-gray-500 mb-6">
            Mesa no disponible. Solicita al camarero que abra tu mesa.
          </p>
          <button
            onClick={checkSession}
            disabled={checking}
            className="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2 mx-auto transition"
          >
            <RefreshCw size={18} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Comprobando...' : 'Reintentar'}
          </button>
        </div>
      </div>
    );
  }

  // SESSION CLOSED state
  if (pageState === 'session_closed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👋</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tu sesión ha finalizado
          </h1>
          <p className="text-gray-500 mb-6">
            Gracias por tu visita. Si necesitas algo más, solicita al camarero que abra tu mesa nuevamente.
          </p>
          <button
            onClick={checkSession}
            disabled={checking}
            className="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2 mx-auto transition"
          >
            <RefreshCw size={18} className={checking ? 'animate-spin' : ''} />
            Nueva sesión
          </button>
        </div>
      </div>
    );
  }

  // ERROR state
  if (pageState === 'error' || !menuData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">No se pudo cargar el menú</p>
          <button onClick={checkSession} className="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE SESSION - show menu
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">{menuData.company.name}</h1>
          <p className="text-sm text-gray-500">{tableName} - Tu mesa está lista para pedir</p>
        </div>

        {/* Category tabs */}
        <div className="flex overflow-x-auto scrollbar-hide border-t">
          {menuData.categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeCategory === cat.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Order sent confirmation */}
      {orderSent && (
        <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800 font-semibold">Tu pedido ha sido enviado</p>
          <p className="text-green-600 text-sm">Puedes seguir añadiendo más productos</p>
        </div>
      )}

      {/* Products */}
      <div className="p-4 space-y-3">
        {menuData.categories
          .filter(cat => cat.id === activeCategory)
          .flatMap(cat => cat.products)
          .map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm p-4 flex gap-3">
              {product.image && (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${product.image}`}
                  alt={product.name}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-primary-600">
                    {formatPrice(Number(product.price))}
                  </span>
                  <button
                    onClick={() => handleAddProduct(product)}
                    className="bg-primary-500 text-white p-2 rounded-full hover:bg-primary-600 transition"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                {product.extras && product.extras.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Extras disponibles</p>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Floating cart button */}
      {cart.totalItems > 0 && !showCart && (
        <div className="fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setShowCart(true)}
            className="w-full bg-primary-500 text-white py-4 px-6 rounded-xl shadow-lg flex items-center justify-between hover:bg-primary-600 transition"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={22} />
              <span className="bg-white text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                {cart.totalItems}
              </span>
            </div>
            <span className="font-semibold">Ver carrito</span>
            <span className="font-bold">{formatPrice(cart.totalPrice)}</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="relative mt-auto bg-white rounded-t-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Tu pedido</h2>
              <button onClick={() => setShowCart(false)} className="p-1">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.items.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    {item.extras.length > 0 && (
                      <p className="text-xs text-gray-500">
                        + {item.extras.map(e => e.name).join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-primary-600 font-semibold">
                      {formatPrice(
                        (item.price + item.extras.reduce((s, e) => s + e.price, 0)) * item.quantity
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cart.updateQuantity(idx, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-6 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => cart.updateQuantity(idx, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {cart.items.length === 0 && (
                <p className="text-center text-gray-500 py-8">El carrito está vacío</p>
              )}

              <div className="pt-2">
                <label className="text-sm font-medium text-gray-700">Notas para la cocina</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={500}
                  placeholder="Ej: Sin cebolla, poco hecho..."
                  className="w-full mt-1 p-3 border rounded-lg text-sm resize-none h-20"
                />
              </div>
            </div>

            <div className="border-t p-4 space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">{formatPrice(cart.totalPrice)}</span>
              </div>
              <button
                onClick={handleOrder}
                disabled={ordering || cart.items.length === 0}
                className="w-full bg-primary-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {ordering ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                ) : (
                  <>
                    <Send size={20} />
                    Pedir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extras modal */}
      {showExtras && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowExtras(null)} />
          <div className="relative bg-white rounded-t-2xl w-full max-h-[70vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-1">{showExtras.name}</h3>
            <p className="text-primary-600 font-semibold mb-4">{formatPrice(Number(showExtras.price))}</p>

            <p className="text-sm font-medium text-gray-700 mb-2">Extras (opcional)</p>
            <div className="space-y-2 mb-6">
              {showExtras.extras.map((extra, idx) => (
                <label
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedExtras.some(e => e.name === extra.name)}
                      onChange={() => toggleExtra(extra)}
                      className="w-5 h-5 rounded text-primary-500"
                    />
                    <span>{extra.name}</span>
                  </div>
                  <span className="text-primary-600 font-medium">+{formatPrice(extra.price)}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleConfirmExtras}
              className="w-full bg-primary-500 text-white py-3 rounded-xl font-semibold hover:bg-primary-600 transition"
            >
              Añadir al pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
