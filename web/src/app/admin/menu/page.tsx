'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { categoriesApi, productsApi } from '@/lib/api';
import { Category, Product, ProductExtra } from '@/types';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Image as ImageIcon } from 'lucide-react';

export default function MenuPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryOrder, setCategoryOrder] = useState(0);

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    active: true,
    extras: [] as ProductExtra[],
  });

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [cats, prods] = await Promise.all([
        categoriesApi.getAll(token) as Promise<Category[]>,
        productsApi.getAll(token) as Promise<Product[]>,
      ]);
      setCategories(cats);
      setProducts(prods);
      if (!selectedCategory && cats.length > 0) {
        setSelectedCategory(cats[0].id);
      }
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [token, selectedCategory]);

  useEffect(() => { loadData(); }, [loadData]);

  // Category CRUD
  const handleSaveCategory = async () => {
    if (!token || !categoryName.trim()) return;
    try {
      if (editingCategory) {
        await categoriesApi.update(token, editingCategory.id, { name: categoryName, order: categoryOrder });
      } else {
        await categoriesApi.create(token, { name: categoryName, order: categoryOrder });
      }
      setShowCategoryModal(false);
      setCategoryName('');
      setCategoryOrder(0);
      setEditingCategory(null);
      loadData();
      toast.success(editingCategory ? 'Categoría actualizada' : 'Categoría creada');
    } catch {
      toast.error('Error al guardar categoría');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!token || !confirm('¿Eliminar esta categoría y todos sus productos?')) return;
    try {
      await categoriesApi.delete(token, id);
      loadData();
      toast.success('Categoría eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // Product CRUD
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || '',
        price: Number(product.price),
        categoryId: product.categoryId,
        active: product.active,
        extras: product.extras || [],
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: 0,
        categoryId: selectedCategory,
        active: true,
        extras: [],
      });
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!token || !productForm.name.trim()) return;
    try {
      if (editingProduct) {
        await productsApi.update(token, editingProduct.id, productForm);
      } else {
        await productsApi.create(token, productForm);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      loadData();
      toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
    } catch {
      toast.error('Error al guardar producto');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!token || !confirm('¿Eliminar este producto?')) return;
    try {
      await productsApi.delete(token, id);
      loadData();
      toast.success('Producto eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleImageUpload = async (productId: string, file: File) => {
    if (!token) return;
    try {
      await productsApi.uploadImage(token, productId, file);
      loadData();
      toast.success('Imagen subida');
    } catch {
      toast.error('Error al subir imagen');
    }
  };

  const addExtra = () => {
    setProductForm(prev => ({
      ...prev,
      extras: [...prev.extras, { name: '', price: 0 }],
    }));
  };

  const updateExtra = (idx: number, field: keyof ProductExtra, value: string | number) => {
    setProductForm(prev => ({
      ...prev,
      extras: prev.extras.map((e, i) => i === idx ? { ...e, [field]: value } : e),
    }));
  };

  const removeExtra = (idx: number) => {
    setProductForm(prev => ({
      ...prev,
      extras: prev.extras.filter((_, i) => i !== idx),
    }));
  };

  const filteredProducts = products.filter(p => p.categoryId === selectedCategory);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Menú</h1>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Categorías</h2>
          <button
            onClick={() => { setEditingCategory(null); setCategoryName(''); setCategoryOrder(categories.length); setShowCategoryModal(true); }}
            className="text-sm bg-primary-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-primary-600"
          >
            <Plus size={16} /> Añadir
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <div
              key={cat.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                selectedCategory === cat.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <button onClick={() => setSelectedCategory(cat.id)} className="font-medium">
                {cat.name}
              </button>
              <button
                onClick={() => { setEditingCategory(cat); setCategoryName(cat.name); setCategoryOrder(cat.order); setShowCategoryModal(true); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit2 size={14} />
              </button>
              <button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">
            Productos {selectedCategory && categories.find(c => c.id === selectedCategory)?.name && `- ${categories.find(c => c.id === selectedCategory)?.name}`}
          </h2>
          <button
            onClick={() => openProductModal()}
            className="text-sm bg-primary-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-primary-600"
          >
            <Plus size={16} /> Añadir producto
          </button>
        </div>

        <div className="space-y-3">
          {filteredProducts.map(product => (
            <div key={product.id} className="flex items-center gap-4 p-3 border rounded-lg">
              {product.image ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${product.image}`}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                  <ImageIcon size={24} className="text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{product.name}</h3>
                  {!product.active && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inactivo</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{product.description}</p>
                <p className="text-primary-600 font-semibold">{formatPrice(Number(product.price))}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(product.id, file);
                    }}
                  />
                  <ImageIcon size={18} className="text-gray-400 hover:text-primary-500" />
                </label>
                <button onClick={() => openProductModal(product)} className="text-gray-400 hover:text-primary-500">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDeleteProduct(product.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <p className="text-center text-gray-500 py-8">No hay productos en esta categoría</p>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</h3>
              <button onClick={() => setShowCategoryModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Orden</label>
                <input
                  type="number"
                  value={categoryOrder}
                  onChange={e => setCategoryOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <button
                onClick={handleSaveCategory}
                className="w-full bg-primary-500 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-600"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingProduct ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button onClick={() => setShowProductModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  value={productForm.name}
                  onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={productForm.description}
                  onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg h-20 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.price}
                    onChange={e => setProductForm(p => ({ ...p, price: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Categoría</label>
                  <select
                    value={productForm.categoryId}
                    onChange={e => setProductForm(p => ({ ...p, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={productForm.active}
                  onChange={e => setProductForm(p => ({ ...p, active: e.target.checked }))}
                  id="active"
                />
                <label htmlFor="active" className="text-sm">Activo</label>
              </div>

              {/* Extras */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Extras / Modificadores</label>
                  <button onClick={addExtra} className="text-sm text-primary-600 hover:underline">+ Añadir extra</button>
                </div>
                {productForm.extras.map((extra, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      placeholder="Nombre"
                      value={extra.name}
                      onChange={e => updateExtra(idx, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Precio"
                      value={extra.price}
                      onChange={e => updateExtra(idx, 'price', Number(e.target.value))}
                      className="w-24 px-3 py-2 border rounded-lg text-sm"
                    />
                    <button onClick={() => removeExtra(idx)} className="text-red-400 hover:text-red-600">
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveProduct}
                className="w-full bg-primary-500 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-600"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
