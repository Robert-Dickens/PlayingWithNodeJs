import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { productDetailApi, ProductDetail } from '../api/client';
import { Product, useProducts } from '../hooks/useProducts';
import { useWebSocket } from '../hooks/useWebSocket';

type Page = 'overview' | 'products' | 'details';
type ProductInput = Pick<Product, 'name' | 'price'> & Partial<Pick<Product, 'description' | 'stock_quantity'>>;
type Notification = { id: string; title: string; message: string; read: boolean; timestamp: number; source: 'Live update' | 'Activity' };
type DetailInput = Pick<ProductDetail, 'product_id' | 'sku'> & Partial<Pick<ProductDetail, 'weight' | 'dimensions' | 'color' | 'material'>>;
type PendingDelete = { kind: 'product'; id: string; name: string } | { kind: 'detail'; id: string; name: string };

const pageRoutes: Record<Page, string> = {
  overview: '/dashboard',
  products: '/api/products',
  details: '/api/product-details',
};

function getPageFromHash(): Page {
  const route = window.location.hash.replace(/^#/, '');
  if (route === pageRoutes.products) return 'products';
  if (route === pageRoutes.details) return 'details';
  return 'overview';
}

function getSavedNotifications(): Notification[] {
  try {
    const saved = localStorage.getItem('commerceflow.notifications');
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Notification =>
      item && typeof item.id === 'string' && typeof item.title === 'string' &&
      typeof item.message === 'string' && typeof item.read === 'boolean' &&
      typeof item.timestamp === 'number' &&
      (item.source === 'Live update' || item.source === 'Activity')
    ).slice(0, 100);
  } catch {
    return [];
  }
}

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8M12 13v9" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3" /></>,
    package: <><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7V8Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.box}</svg>;
}

function money(value: number | string) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function getErrorMessage(error: unknown) {
  const candidate = error as { response?: { data?: { error?: string } }; message?: string };
  return candidate.response?.data?.error || candidate.message || 'Something went wrong. Please try again.';
}

function Modal({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl bg-white shadow-2xl`}>
        <header className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div><h2 id="modal-title" className="text-lg font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close dialog"><Icon name="close" /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60';
const quietButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50';

function ProductEditor({ product, onSave, onClose, saving }: { product: Product | null; onSave: (input: ProductInput) => Promise<void>; onClose: () => void; saving: boolean }) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [stock, setStock] = useState(String(product?.stock_quantity ?? 0));
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    try { await onSave({ name: name.trim(), description: description.trim(), price: Number(price), stock_quantity: Number(stock) }); }
    catch (saveError) { setError(getErrorMessage(saveError)); }
  };
  return <Modal title={product ? 'Edit product' : 'Add a product'} subtitle="Keep your catalog details accurate and up to date." onClose={onClose} wide>
    <form onSubmit={submit} className="space-y-5 p-6">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <Field label="Product name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wireless Keyboard" required autoFocus /></Field>
      <Field label="Description"><textarea className={`${inputClass} resize-y`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short description of this product" /></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Price"><div className="relative"><span className="absolute left-3.5 top-2.5 text-sm text-slate-400">$</span><input className={`${inputClass} pl-8`} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required /></div></Field>
        <Field label="Stock quantity"><input className={inputClass} type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" className={quietButton} onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className={primaryButton} disabled={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Create product'}</button></div>
    </form>
  </Modal>;
}

function DetailEditor({ product, detail, onSave, onClose, saving }: { product: Product; detail: ProductDetail | null; onSave: (input: DetailInput) => Promise<void>; onClose: () => void; saving: boolean }) {
  const [sku, setSku] = useState(detail?.sku ?? '');
  const [weight, setWeight] = useState(detail?.weight == null ? '' : String(detail.weight));
  const [dimensions, setDimensions] = useState(detail?.dimensions ?? '');
  const [color, setColor] = useState(detail?.color ?? '');
  const [material, setMaterial] = useState(detail?.material ?? '');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    try { await onSave({ product_id: product.id, sku: sku.trim(), weight: weight === '' ? undefined : Number(weight), dimensions: dimensions.trim(), color: color.trim(), material: material.trim() }); }
    catch (saveError) { setError(getErrorMessage(saveError)); }
  };
  return <Modal title={detail ? 'Edit product details' : 'Add product details'} subtitle={`SKU and specifications for ${product.name}.`} onClose={onClose} wide>
    <form onSubmit={submit} className="space-y-5 p-6">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="rounded-lg bg-slate-50 px-4 py-3"><span className="text-xs font-medium uppercase tracking-wide text-slate-400">Product</span><p className="mt-1 text-sm font-semibold text-slate-800">{product.name}</p></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="SKU"><input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. KEYBOARD-001" required /></Field>
        <Field label="Weight (kg)"><input className={inputClass} type="number" min="0" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Optional" /></Field>
        <Field label="Dimensions"><input className={inputClass} value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g. 30 × 12 × 2 cm" /></Field>
        <Field label="Color"><input className={inputClass} value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Midnight" /></Field>
        <Field label="Material"><input className={inputClass} value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="e.g. Aluminum" /></Field>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" className={quietButton} onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className={primaryButton} disabled={saving}>{saving ? 'Saving…' : detail ? 'Save changes' : 'Add details'}</button></div>
    </form>
  </Modal>;
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center px-6 py-16 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="package" className="h-7 w-7" /></span><h3 className="text-base font-semibold text-slate-800">{title}</h3><p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function ProductManager() {
  const { products, loading, error, fetchProducts, createProduct, updateProduct, deleteProduct } = useProducts();
  const { connected, subscribe } = useWebSocket();
  const [page, setPage] = useState<Page>(getPageFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [productEditor, setProductEditor] = useState<Product | null | undefined>(undefined);
  const [detailEditor, setDetailEditor] = useState<{ product: Product; detail: ProductDetail | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [details, setDetails] = useState<Record<string, ProductDetail | null>>({});
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>(getSavedNotifications);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const notify = useCallback((message: string, title = 'Activity', source: Notification['source'] = 'Activity') => {
    const notification: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      message,
      read: false,
      timestamp: Date.now(),
      source,
    };
    setNotifications((current) => [notification, ...current].slice(0, 100));
    setToast(message);
    window.setTimeout(() => setToast((current) => current === message ? '' : current), 3200);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('commerceflow.notifications', JSON.stringify(notifications)); }
    catch { /* Notifications remain available for this session if storage is unavailable. */ }
  }, [notifications]);
  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setNotificationsOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [notificationsOpen]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    const onHashChange = () => { setPage(getPageFromHash()); setSidebarOpen(false); setSearch(''); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => {
    const unsubscribes = [
      subscribe('product:created', (data) => { notify(`“${data.name || 'A product'}” was added to the catalog.`, 'Product created', 'Live update'); fetchProducts(); }),
      subscribe('product:updated', (data) => { notify(`“${data.name || 'A product'}” was updated.`, 'Product updated', 'Live update'); fetchProducts(); }),
      subscribe('product:deleted', () => { notify('A product was removed from the catalog.', 'Product deleted', 'Live update'); fetchProducts(); }),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe?.());
  }, [subscribe, fetchProducts, notify]);
  useEffect(() => {
    let cancelled = false;
    if (loading) return () => { cancelled = true; };
    const requests = Promise.resolve().then(() => {
      if (cancelled) return [];
      setDetailsLoading(products.length > 0);
      setDetailsError('');
      if (products.length === 0) return [];
      return Promise.all(products.map(async (product) => {
        try { const response = await productDetailApi.getByProductId(product.id); return [product.id, response.data as ProductDetail] as const; }
        catch (requestError) {
          const status = (requestError as { response?: { status?: number } }).response?.status;
          if (status !== 404) throw requestError;
          return [product.id, null] as const;
        }
      }));
    });
    requests.then((entries) => { if (!cancelled) setDetails(Object.fromEntries(entries)); })
      .catch((requestError: unknown) => { if (!cancelled) { setDetailsError(getErrorMessage(requestError)); setDetails({}); } })
      .finally(() => { if (!cancelled) setDetailsLoading(false); });
    return () => { cancelled = true; };
  }, [products, loading]);

  const visibleProducts = useMemo(() => products.filter((product) => `${product.name} ${product.description ?? ''}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const visibleDetailProducts = useMemo(() => products.filter((product) => `${product.name} ${product.description ?? ''} ${details[product.id]?.sku ?? ''}`.toLowerCase().includes(search.toLowerCase())), [products, details, search]);
  const stockUnits = products.reduce((total, product) => total + Number(product.stock_quantity || 0), 0);
  const pageTitle = page === 'products' ? 'Products' : page === 'details' ? 'Product details' : 'Overview';

  const saveProduct = async (input: ProductInput) => {
    setSaving(true);
    try {
      if (productEditor) await updateProduct(productEditor.id, input);
      else await createProduct(input);
      setProductEditor(undefined);
    } finally { setSaving(false); }
  };
  const saveDetail = async (input: DetailInput) => {
    if (!detailEditor) return;
    setSaving(true);
    try {
      const response = detailEditor.detail
        ? await productDetailApi.update(detailEditor.detail.id, input)
        : await productDetailApi.create(input);
      setDetails((current) => ({ ...current, [detailEditor.product.id]: response.data as ProductDetail }));
      setDetailEditor(null);
      notify(detailEditor.detail ? 'Product specifications were updated.' : 'Product specifications were added.', detailEditor.detail ? 'Details updated' : 'Details added');
    } finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.kind === 'product') {
        await deleteProduct(pendingDelete.id);
        setDetails((current) => { const next = { ...current }; delete next[pendingDelete.id]; return next; });
      } else {
        await productDetailApi.delete(pendingDelete.id);
        setDetails((current) => { const next = { ...current }; for (const [productId, detail] of Object.entries(next)) if (detail?.id === pendingDelete.id) next[productId] = null; return next; });
        notify('Product specifications were deleted.', 'Details deleted');
      }
      setPendingDelete(null);
    } catch (deleteError) { notify(getErrorMessage(deleteError)); }
    finally { setDeleting(false); }
  };

  const sidebar = <aside className="flex h-full flex-col border-r border-slate-200 bg-white">
    <a href="#/dashboard" className="flex h-[68px] items-center gap-3 border-b border-slate-100 px-6">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white"><Icon name="box" className="h-5 w-5" /></span>
      <span className="text-base font-bold tracking-tight text-slate-900">Commerce<span className="text-blue-700">Flow</span></span>
      <span className="ml-auto rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700">Admin</span>
    </a>
    <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
      <div><p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Workspace</p><a href={`#${pageRoutes.overview}`} className={`mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${page === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon name="grid" />Overview</a></div>
      <div><p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">API resources</p>
        <a href={`#${pageRoutes.products}`} className={`mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${page === 'products' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon name="box" />Products<span className="ml-auto rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{products.length}</span></a>
        <a href={`#${pageRoutes.details}`} className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${page === 'details' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon name="layers" />Product details</a>
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-700">REST API</p><p className="mt-1 text-xs text-slate-500">Manage your catalog using the products and product details endpoints.</p><a href="http://localhost:3001/api-docs" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800">Open API docs <Icon name="arrow" className="h-3.5 w-3.5" /></a></div>
    </nav>
    <div className="border-t border-slate-100 p-4"><div className="flex items-center gap-3 rounded-lg px-2 py-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">AD</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">Administrator</p><p className="truncate text-xs text-slate-500">Catalog management</p></div><span title={connected ? 'WebSocket connected' : 'WebSocket disconnected'} className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} /></div></div>
  </aside>;

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <div className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</div>
    {sidebarOpen && <><button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setSidebarOpen(false)} /><div className="fixed inset-y-0 left-0 z-50 w-72 shadow-2xl lg:hidden">{sidebar}</div></>}
    <div className="lg:pl-64">
      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
        <div className="flex items-center gap-3"><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button><div className="hidden text-sm text-slate-400 sm:block">Admin <span className="mx-2 text-slate-300">/</span></div><h1 className="text-sm font-semibold text-slate-800 sm:text-base">{pageTitle}</h1></div>
        <div className="flex items-center gap-3"><span className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:inline-flex ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />{connected ? 'Live updates on' : 'Live updates off'}</span><button type="button" onClick={() => setNotificationsOpen(true)} className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-100" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-haspopup="dialog" aria-expanded={notificationsOpen}><Icon name="bell" className="h-5 w-5" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button><button className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800" aria-label="Administrator account">AD</button></div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-blue-700">Catalog management</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{page === 'overview' ? 'Welcome back' : pageTitle}</h2><p className="mt-1.5 text-sm text-slate-500">{page === 'products' ? 'Create, update, and organize the products in your store.' : page === 'details' ? 'Manage SKUs and specifications linked to each product.' : 'A quick snapshot of your product catalog and inventory.'}</p></div>
          {page === 'products' && <button className={primaryButton} onClick={() => setProductEditor(null)}><Icon name="plus" className="h-4 w-4" />Add product</button>}
        </div>
        {error && <div role="alert" className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button className="font-semibold underline" onClick={fetchProducts}>Retry</button></div>}

        {page === 'overview' && <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[{ label: 'Total products', value: products.length.toLocaleString(), caption: 'Active catalog items', icon: 'box', tone: 'bg-blue-50 text-blue-700' }, { label: 'Units in stock', value: stockUnits.toLocaleString(), caption: 'Across all products', icon: 'package', tone: 'bg-violet-50 text-violet-700' }, { label: 'Product details', value: Object.values(details).filter(Boolean).length.toLocaleString(), caption: 'Products with SKU data', icon: 'layers', tone: 'bg-emerald-50 text-emerald-700' }].map((stat) => <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{stat.label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{loading || detailsLoading ? '—' : stat.value}</p></div><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.tone}`}><Icon name={stat.icon} /></span></div><p className="mt-3 text-xs text-slate-400">{stat.caption}</p></article>)}
          </section>
          <section className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"><div><h3 className="font-semibold text-slate-900">Recently added products</h3><p className="mt-1 text-xs text-slate-500">Your latest catalog updates</p></div><a href={`#${pageRoutes.products}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800">View all <Icon name="arrow" className="h-4 w-4" /></a></div>
            {products.length === 0 && !loading ? <EmptyState title="Your catalog is ready" text="Add your first product to start managing your store inventory." action={<button className={primaryButton} onClick={() => setProductEditor(null)}><Icon name="plus" className="h-4 w-4" />Add product</button>} /> : <ProductTable products={[...products].slice(0, 5)} loading={loading} onEdit={(product) => setProductEditor(product)} onDelete={(product) => setPendingDelete({ kind: 'product', id: product.id, name: product.name })} />}
          </section>
        </>}

        {page === 'products' && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h3 className="font-semibold text-slate-900">All products <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{products.length}</span></h3><p className="mt-1 text-xs text-slate-500">Products managed by <span className="font-medium">GET /api/products</span></p></div><div className="flex gap-2"><label className="relative min-w-0 flex-1 sm:w-64"><Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={`${inputClass} py-2 pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" aria-label="Search products" /></label><button className={quietButton} onClick={fetchProducts} title="Refresh products"><Icon name="refresh" className="h-4 w-4" /><span className="hidden sm:inline">Refresh</span></button></div></div>
          {visibleProducts.length === 0 && !loading ? <EmptyState title={search ? 'No matching products' : 'No products yet'} text={search ? 'Try another search term.' : 'Create a product to begin building your catalog.'} action={!search && <button className={primaryButton} onClick={() => setProductEditor(null)}><Icon name="plus" className="h-4 w-4" />Add product</button>} /> : <ProductTable products={visibleProducts} loading={loading} onEdit={(product) => setProductEditor(product)} onDelete={(product) => setPendingDelete({ kind: 'product', id: product.id, name: product.name })} />}
        </section>}

        {page === 'details' && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h3 className="font-semibold text-slate-900">Product specifications</h3><p className="mt-1 text-xs text-slate-500">Manage records through <span className="font-medium">/api/product-details</span></p></div><label className="relative min-w-0 sm:w-64"><Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={`${inputClass} py-2 pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or SKU" aria-label="Search product details" /></label></div>
          {detailsError && <p role="alert" className="m-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">Could not load product details: {detailsError}</p>}
          {products.length === 0 && !loading ? <EmptyState title="Add a product first" text="Product details are attached to an existing product. Create one before adding SKUs and specifications." action={<a href={`#${pageRoutes.products}`} className={primaryButton}>Go to products</a>} /> : visibleDetailProducts.length === 0 && !detailsLoading ? <EmptyState title="No matching products" text="Try another search term to find a product or SKU." /> : <DetailTable products={visibleDetailProducts} details={details} loading={loading || detailsLoading} onEdit={(product) => setDetailEditor({ product, detail: details[product.id] ?? null })} onDelete={(product, detail) => setPendingDelete({ kind: 'detail', id: detail.id, name: product.name })} />}
        </section>}
        <footer className="mt-7 flex flex-col gap-1 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>CommerceFlow Admin · Catalog workspace</span><span className="flex items-center gap-2">API connection <span className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500'}`} />{error ? 'Check API status' : 'Ready'}</span></footer>
      </main>
    </div>

    {productEditor !== undefined && <ProductEditor key={productEditor?.id ?? 'new-product'} product={productEditor} onSave={saveProduct} onClose={() => setProductEditor(undefined)} saving={saving} />}
    {detailEditor && <DetailEditor key={detailEditor.detail?.id ?? detailEditor.product.id} product={detailEditor.product} detail={detailEditor.detail} onSave={saveDetail} onClose={() => setDetailEditor(null)} saving={saving} />}
    {pendingDelete && <Modal title={`Delete ${pendingDelete.kind === 'product' ? 'product' : 'product details'}?`} subtitle="This action cannot be undone." onClose={() => setPendingDelete(null)}><div className="p-6"><p className="text-sm leading-6 text-slate-600">Are you sure you want to delete <span className="font-semibold text-slate-900">{pendingDelete.name}</span>{pendingDelete.kind === 'product' ? ' and its associated product details' : ''}?</p><div className="mt-6 flex justify-end gap-3"><button className={quietButton} onClick={() => setPendingDelete(null)} disabled={deleting}>Cancel</button><button className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60" onClick={confirmDelete} disabled={deleting}><Icon name="trash" className="h-4 w-4" />{deleting ? 'Deleting…' : 'Delete'}</button></div></div></Modal>}
    {notificationsOpen && <>
      <button type="button" aria-label="Close notifications" className="fixed inset-0 z-[60] cursor-default bg-slate-950/35 backdrop-blur-[1px]" onClick={() => setNotificationsOpen(false)} />
      <aside role="dialog" aria-modal="true" aria-labelledby="notifications-title" className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5">
          <div><div className="flex items-center gap-2"><h2 id="notifications-title" className="text-lg font-semibold text-slate-900">Notifications</h2>{unreadCount > 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{unreadCount} new</span>}</div><p className="mt-1 text-sm text-slate-500">Live product updates and recent activity</p></div>
          <button type="button" onClick={() => setNotificationsOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close notifications"><Icon name="close" /></button>
        </header>
        {notifications.length > 0 && <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3"><button type="button" className="text-xs font-semibold text-blue-700 hover:text-blue-800 disabled:cursor-default disabled:text-slate-400" disabled={unreadCount === 0} onClick={() => setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))}>Mark all as read</button><button type="button" className="text-xs font-medium text-slate-500 hover:text-red-600" onClick={() => setNotifications([])}>Clear all</button></div>}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? <div className="flex h-full min-h-64 flex-col items-center justify-center px-8 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="bell" className="h-6 w-6" /></span><p className="mt-4 text-sm font-semibold text-slate-800">You’re all caught up</p><p className="mt-1 text-sm text-slate-500">Product updates and activity will show up here.</p></div> : <div className="divide-y divide-slate-100">{notifications.map((notification) => <button key={notification.id} type="button" onClick={() => setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item))} className={`block w-full px-5 py-4 text-left transition hover:bg-slate-50 ${notification.read ? 'bg-white' : 'bg-blue-50/50'}`} aria-label={notification.read ? `${notification.title}: ${notification.message}` : `Mark as read: ${notification.title}`}><div className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-blue-600'}`} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className={`truncate text-sm ${notification.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{notification.title}</p><span className="shrink-0 text-[11px] text-slate-400">{new Date(notification.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div><p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p><span className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${notification.source === 'Live update' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{notification.source}</span></div></div></button>)}</div>}
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-400">Showing up to 100 recent messages · stored on this device</div>
      </aside>
    </>}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[80] flex max-w-sm items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500"><Icon name="check" className="h-4 w-4" /></span>{toast}</div>}
  </div>;
}

function ProductTable({ products, loading, onEdit, onDelete }: { products: Product[]; loading: boolean; onEdit: (product: Product) => void; onDelete: (product: Product) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-3.5 font-semibold">Product</th><th className="px-6 py-3.5 font-semibold">Price</th><th className="px-6 py-3.5 font-semibold">Stock</th><th className="px-6 py-3.5 font-semibold">Status</th><th className="px-6 py-3.5 font-semibold">Last updated</th><th className="px-6 py-3.5 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => { const inStock = Number(product.stock_quantity) > 0; return <tr key={product.id} className="transition hover:bg-slate-50/70"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon name="box" className="h-5 w-5" /></span><div className="max-w-[300px]"><p className="truncate font-semibold text-slate-800">{product.name}</p><p className="mt-1 truncate text-xs text-slate-400">{product.description || 'No description'}</p></div></div></td><td className="px-6 py-4 font-medium text-slate-800">{money(product.price)}</td><td className="px-6 py-4 text-slate-600">{Number(product.stock_quantity || 0).toLocaleString()} units</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-amber-500'}`} />{inStock ? 'In stock' : 'Out of stock'}</span></td><td className="px-6 py-4 text-xs text-slate-500">{product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '—'}</td><td className="px-6 py-4"><div className="flex justify-end gap-1"><button className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40" title="Edit product" aria-label={`Edit ${product.name}`} onClick={() => onEdit(product)} disabled={loading}><Icon name="edit" className="h-4 w-4" /></button><button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" title="Delete product" aria-label={`Delete ${product.name}`} onClick={() => onDelete(product)} disabled={loading}><Icon name="trash" className="h-4 w-4" /></button></div></td></tr>; })}</tbody></table></div>;
}

function DetailTable({ products, details, loading, onEdit, onDelete }: { products: Product[]; details: Record<string, ProductDetail | null>; loading: boolean; onEdit: (product: Product) => void; onDelete: (product: Product, detail: ProductDetail) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-3.5 font-semibold">Product</th><th className="px-6 py-3.5 font-semibold">SKU</th><th className="px-6 py-3.5 font-semibold">Specifications</th><th className="px-6 py-3.5 font-semibold">Record</th><th className="px-6 py-3.5 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => { const detail = details[product.id]; return <tr key={product.id} className="transition hover:bg-slate-50/70"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Icon name="layers" /></span><div><p className="font-semibold text-slate-800">{product.name}</p><p className="mt-1 text-xs text-slate-400">{money(product.price)}</p></div></div></td><td className="px-6 py-4 font-mono text-xs text-slate-700">{detail?.sku ?? '—'}</td><td className="px-6 py-4"><div className="flex max-w-md flex-wrap gap-1.5">{detail ? [detail.color, detail.material, detail.dimensions, detail.weight != null ? `${detail.weight} kg` : null].filter(Boolean).length ? [detail.color, detail.material, detail.dimensions, detail.weight != null ? `${detail.weight} kg` : null].filter(Boolean).map((value) => <span key={value} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{value}</span>) : <span className="text-xs text-slate-400">No specifications</span> : <span className="text-xs text-slate-400">Not configured</span>}</div></td><td className="px-6 py-4">{detail ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Configured</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Missing</span>}</td><td className="px-6 py-4"><div className="flex justify-end gap-1">{detail && <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" title="Delete product details" aria-label={`Delete details for ${product.name}`} onClick={() => onDelete(product, detail)} disabled={loading}><Icon name="trash" className="h-4 w-4" /></button>}<button className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40" title={detail ? 'Edit product details' : 'Add product details'} aria-label={`${detail ? 'Edit' : 'Add'} details for ${product.name}`} onClick={() => onEdit(product)} disabled={loading}><Icon name={detail ? 'edit' : 'plus'} className="h-4 w-4" /></button></div></td></tr>; })}</tbody></table></div>;
}
