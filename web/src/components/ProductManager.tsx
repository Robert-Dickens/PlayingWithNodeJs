import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useProducts, Product } from '../hooks/useProducts';
import { ProductForm } from './ProductForm';
import { ProductList } from './ProductList';

export function ProductManager() {
  const { products, loading, error, fetchProducts, createProduct, updateProduct, deleteProduct } = useProducts();
  const { connected, subscribe } = useWebSocket();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubscribes = [
      subscribe('product:created', (data) => {
        addNotification(`Product "${data.name}" created!`);
        fetchProducts();
      }),
      subscribe('product:updated', (data) => {
        addNotification(`Product "${data.name}" updated!`);
        fetchProducts();
      }),
      subscribe('product:deleted', (data) => {
        addNotification(`Product deleted!`);
        fetchProducts();
      }),
    ];

    return () => {
      unsubscribes.forEach((unsub) => unsub?.());
    };
  }, [subscribe, fetchProducts]);

  const addNotification = (message: string) => {
    setNotifications((prev) => [...prev, message]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 3000);
  };

  const handleCreateProduct = async (formData: any) => {
    await createProduct(formData);
    setShowForm(false);
    addNotification('Product created successfully!');
  };

  const handleUpdateProduct = async (formData: any) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, formData);
      setEditingProduct(null);
      setShowForm(false);
      addNotification('Product updated successfully!');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
      addNotification('Product deleted successfully!');
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Manager</h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {connected ? 'Connected to server' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Notifications */}
        <div className="fixed top-4 right-4 space-y-2 z-50">
          {notifications.map((notif, idx) => (
            <div
              key={idx}
              className="bg-green-500 text-white px-4 py-2 rounded-md shadow-lg animate-pulse"
            >
              {notif}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            Error: {error}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            {showForm ? (
              <ProductForm
                product={editingProduct}
                onSubmit={
                  editingProduct ? handleUpdateProduct : handleCreateProduct
                }
                onCancel={handleCancelForm}
                loading={loading}
              />
            ) : (
              <button
                onClick={() => setShowForm(true)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold"
              >
                + Create New Product
              </button>
            )}
          </div>

          {/* List Section */}
          <div className="lg:col-span-2">
            {loading && !showForm ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <p className="mt-2 text-gray-600">Loading products...</p>
              </div>
            ) : (
              <ProductList
                products={products}
                onEdit={handleEditClick}
                onDelete={handleDeleteProduct}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
