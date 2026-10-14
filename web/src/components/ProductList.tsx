import { Product } from '../hooks/useProducts';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function ProductList({
  products,
  onEdit,
  onDelete,
  loading = false,
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No products found. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="space-y-1 mb-4">
            <p className="text-lg font-bold text-blue-600">
              ${product.price.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              Stock: <span className="font-semibold">{product.stock_quantity}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onEdit(product)}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(product.id)}
              disabled={loading}
              className="flex-1 bg-red-600 text-white py-2 px-3 rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
