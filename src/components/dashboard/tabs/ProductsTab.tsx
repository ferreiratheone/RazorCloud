import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  Check, 
  Loader2, 
  Tag, 
  Package, 
  Power, 
  AlertCircle 
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization, Product } from '@/src/types/database';

interface ProductsTabProps {
  organization: Organization;
  onUpdateOrg: (org: Organization) => void;
}

const CATEGORIES = [
  'Pomadas & Ceras',
  'Barba & Cuidado',
  'Bebidas & Snacks',
  'Acessórios',
  'Vestuário',
  'Geral'
];

export function ProductsTab({ organization, onUpdateOrg }: ProductsTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('35.00');
  const [category, setCategory] = useState('Pomadas & Ceras');
  const [stock, setStock] = useState('50');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingVitrine, setIsTogglingVitrine] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadProducts() {
    setLoading(true);
    try {
      const list = await DataService.getProducts(organization.id);
      setProducts(list);
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, [organization.id]);

  function handleOpenModal(product?: Product) {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setDescription(product.description || '');
      setPrice(String(product.price));
      setCategory(product.category || 'Pomadas & Ceras');
      setStock(String(product.stock ?? 50));
      setImageUrl(product.image_url || '');
    } else {
      setEditingProduct(null);
      setName('');
      setDescription('');
      setPrice('35.00');
      setCategory('Pomadas & Ceras');
      setStock('50');
      setImageUrl('');
    }
    setIsModalOpen(true);
  }

  async function handleToggleVitrine() {
    if (isTogglingVitrine) return;
    setIsTogglingVitrine(true);
    try {
      const nextState = !organization.products_enabled;
      const updated = await DataService.updateOrganization({
        id: organization.id,
        products_enabled: nextState,
      });
      onUpdateOrg(updated);
    } catch (e) {
      console.error('Erro ao alternar vitrine:', e);
    } finally {
      setIsTogglingVitrine(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const saved = await DataService.saveProduct({
        id: editingProduct ? editingProduct.id : undefined,
        organization_id: organization.id,
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price.replace(',', '.')) || 0,
        category,
        stock: parseInt(stock, 10) || 0,
        image_url: imageUrl || undefined,
        active: editingProduct ? editingProduct.active : true,
      });

      setProducts(prev => {
        const filtered = prev.filter(p => p.id !== saved.id);
        return [saved, ...filtered];
      });

      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setProducts(prev => prev.filter(p => p.id !== id));
    await DataService.deleteProduct(id, organization.id);
  }

  async function handleToggleProductActive(product: Product) {
    const updated = { ...product, active: !product.active };
    setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
    await DataService.saveProduct(updated);
  }

  async function handleQuickStockChange(product: Product, delta: number) {
    const currentStock = product.stock ?? 50;
    const newStock = Math.max(0, currentStock + delta);
    const updated = { ...product, stock: newStock };
    setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
    await DataService.saveProduct(updated);
  }

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      
      {/* Banner de Ativação da Vitrine de Produtos */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">Vitrine de Produtos no Agendamento</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                organization.products_enabled 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
                {organization.products_enabled ? 'Vitrine Ativa' : 'Pausada'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ofereça pomadas, bebidas, pentes e produtos para os clientes adicionarem ao corte no site.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleVitrine}
          disabled={isTogglingVitrine}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 self-start sm:self-auto shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            organization.products_enabled
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
              : 'bg-purple-600 hover:bg-purple-500 text-white'
          }`}
        >
          {isTogglingVitrine ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
          {organization.products_enabled ? 'Desativar Vitrine' : 'Ativar Vitrine'}
        </button>
      </div>

      {/* Header & Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Produtos & Acessórios</h2>
          <p className="text-xs text-zinc-400">Gerencie os itens disponíveis para venda e retirada no salão.</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Cadastrar Produto
        </button>
      </div>

      {/* Categorias de Produtos */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeCategory === 'all' 
              ? 'bg-zinc-800 text-white border border-zinc-700' 
              : 'text-zinc-400 hover:text-white bg-zinc-900/40 border border-transparent'
          }`}
        >
          Todos ({products.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = products.filter(p => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white bg-zinc-900/40 border border-zinc-800/80'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Grade de Produtos */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
          <p className="text-xs">Carregando catálogo de produtos...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-zinc-800/80 rounded-2xl p-8 bg-zinc-900/20">
          <ShoppingBag className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Nenhum produto cadastrado nesta categoria</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Cadastre pomadas, ceras, bebidas ou camisetas para que seus clientes possam comprar junto com o agendamento do corte.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Primeiro Produto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => (
            <div 
              key={prod.id}
              className={`bg-zinc-900/50 border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                prod.active 
                  ? 'border-zinc-800/80 hover:border-zinc-700' 
                  : 'border-zinc-800/40 opacity-60 bg-zinc-950/40'
              }`}
            >
              <div>
                {/* Imagem do Produto */}
                <div className="w-full h-36 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden mb-3.5 relative flex items-center justify-center">
                  {prod.image_url ? (
                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-600">
                      <ShoppingBag className="w-8 h-8 mb-1 opacity-50" />
                      <span className="text-[10px]">Sem foto</span>
                    </div>
                  )}

                  <span className="absolute top-2 left-2 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-[10px] font-bold text-zinc-300 px-2 py-0.5 rounded-lg">
                    {prod.category}
                  </span>

                  <span className="absolute top-2 right-2 bg-purple-600/90 backdrop-blur-md text-[11px] font-extrabold text-white px-2.5 py-0.5 rounded-lg shadow-sm">
                    R$ {Number(prod.price).toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white">{prod.name}</h4>
                  {prod.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2">{prod.description}</p>
                  )}
                </div>
              </div>

              {/* Footer do Card com Controle Rápido de Estoque */}
              <div className="pt-3.5 mt-3 border-t border-zinc-800/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Package className="w-3 h-3 text-zinc-400" /> Estoque:
                  </span>
                  
                  <div className="flex items-center gap-1 bg-zinc-950/80 border border-zinc-800 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => handleQuickStockChange(prod, -1)}
                      title="Diminuir 1 do estoque"
                      className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-bold"
                    >
                      -
                    </button>
                    <span className={`text-xs font-extrabold px-1 ${
                      (prod.stock ?? 50) === 0 
                        ? 'text-red-400' 
                        : (prod.stock ?? 50) <= 5 
                          ? 'text-amber-400' 
                          : 'text-emerald-400'
                    }`}>
                      {prod.stock ?? 50}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickStockChange(prod, 1)}
                      title="Adicionar 1 ao estoque"
                      className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleProductActive(prod)}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      prod.active 
                        ? 'text-emerald-400 hover:bg-emerald-500/10' 
                        : 'text-zinc-500 hover:text-white'
                    }`}
                    title={prod.active ? 'Pausar venda' : 'Ativar venda'}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenModal(prod)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Editar produto"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(prod.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Excluir produto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro / Edição de Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5">
              
              {/* Upload de Foto */}
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Foto do Produto</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> Escolher Foto do Aparelho
                    </button>
                    <p className="text-[10px] text-zinc-500 mt-1">Formatos JPG, PNG ou WEBP.</p>
                  </div>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nome do Produto *</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Pomada Efeito Matte 100g"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Descrição / Benefício</label>
                <textarea 
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Alta fixação sem brilho. Ideal para o dia a dia."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              {/* Categoria e Preço */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Categoria</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-600"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Preço de Venda (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="35.00"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Estoque */}
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Quantidade em Estoque</label>
                <input 
                  type="number" 
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="50"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
