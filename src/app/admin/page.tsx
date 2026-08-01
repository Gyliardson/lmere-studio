"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, CalendarDays, Palette,
  Settings, LogOut, ChevronLeft, ChevronRight, Check, X, Clock,
  Plus, Trash2, Edit3, Save, Eye, Ban, Users, Star, Sparkles,
  Phone, Key, Image, Type, ToggleLeft, ToggleRight, ArrowLeft, Lock,
  Menu as MenuIcon, AlertCircle, ExternalLink, Sliders, Calendar as CalendarIcon, CheckCircle2, XCircle
} from "lucide-react";
import { cn, hexToHsl } from "@/lib/utils";
import { formatCurrency } from "@/lib/pricing";
import { COLOR_PRESETS, ColorPreset, FeaturesConfig } from "@/lib/types";

type AdminSection = "orders" | "menu" | "calendar" | "brand" | "features";

interface AdminOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  eventDate: string;
  cakeSize?: { name: string; servings: string };
  flavorId: string;
  fillingIds: string;
  addonIds: string;
  subtotal: number;
  depositAmount: number;
  depositMode?: string;
  status: string;
  createdAt: string;
  cakeMessage: string;
  details: string;
  referenceImageUrl?: string;
}

interface MenuSizeItem {
  id: string;
  name: string;
  servings: string;
  weightKg: number;
  basePrice: number;
  maxFillings: number;
  sortOrder: number;
  active: boolean;
}

interface MenuFlavorItem {
  id: string;
  name: string;
  type: string;
  additionalPrice: number;
  isSpecial: boolean;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
}

interface MenuAddonItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
}

interface MenuData {
  sizes: MenuSizeItem[];
  flavors: MenuFlavorItem[];
  addons: MenuAddonItem[];
}

interface BlockedDateItem {
  id: string;
  date: string;
  reason: string;
}

interface WorkScheduleItem {
  dayOfWeek: number;
  isOpen: boolean;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [section, setSection] = useState<AdminSection>("orders");
  const [slug, setSlug] = useState("doce-arte");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleLogin = async () => {
    setAuthError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Erro na autenticacao");
        return;
      }
      setTenantId(data.tenant.id);
      setTenantSlug(data.tenant.slug);
      setTenantName(data.tenant.name);
      setAuthenticated(true);
    } catch {
      setAuthError("Erro de conexao com o servidor");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4 bg-surface-950">
        <div className="glass-card p-8 w-full max-w-sm border border-white/10 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 flex items-center justify-center mx-auto mb-4 border border-brand-primary/30">
              <Lock className="w-8 h-8 text-brand-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white">Painel Admin</h1>
            <p className="text-white/50 text-sm mt-1">L'Mere Studio CMS</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-white/80">Slug do Atelie</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="input-field"
                placeholder="ex: doce-arte"
                id="admin-slug"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-white/80">Senha de Acesso</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="input-field"
                placeholder="Sua senha"
                id="admin-password"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-error/15 text-error text-xs border border-error/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {authError}
              </div>
            )}

            <button
              onClick={handleLogin}
              className="btn-primary w-full py-3 mt-2 text-sm font-semibold flex items-center justify-center gap-2"
              id="admin-login-btn"
            >
              Entrar no Painel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sectionsList: Array<{ id: AdminSection; label: string; icon: typeof ShoppingBag }> = [
    { id: "orders", label: "Pedidos", icon: ShoppingBag },
    { id: "menu", label: "Cardapio", icon: UtensilsCrossed },
    { id: "calendar", label: "Agenda & Limites", icon: CalendarDays },
    { id: "brand", label: "Marca & Estilo", icon: Palette },
    { id: "features", label: "Funcionalidades", icon: Settings },
  ];

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-surface-950 text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 glass-card px-4 py-3 border-l-4 border-brand-primary shadow-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-brand-primary" />
          <span className="text-sm font-medium text-white">{toast}</span>
        </div>
      )}

      {/* Mobile Top Header */}
      <header className="md:hidden glass-card rounded-none border-b border-white/10 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-sm truncate max-w-[180px]">{tenantName}</h1>
            <p className="text-[11px] text-white/50 capitalize">{sectionsList.find((s) => s.id === section)?.label}</p>
          </div>
        </div>
        <a
          href={`/${tenantSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-primary hover:underline flex items-center gap-1 font-medium"
        >
          Simulador <ExternalLink className="w-3 h-3" />
        </a>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileDrawerOpen(false)} />
          <aside className="relative w-72 bg-surface-900 border-r border-white/10 p-5 flex flex-col justify-between z-10 animate-fade-in">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-base">{tenantName}</h2>
                  <p className="text-xs text-white/50">CMS Painel Admin</p>
                </div>
                <button onClick={() => setMobileDrawerOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {sectionsList.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSection(item.id);
                        setMobileDrawerOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                        active ? "bg-brand-primary text-white shadow-lg" : "text-white/70 hover:bg-white/5"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-2 pt-4 border-t border-white/10">
              <a
                href={`/${tenantSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 rounded-lg"
              >
                <Eye className="w-4 h-4 text-brand-primary" /> Ver Simulador Público
              </a>
              <button
                onClick={() => setAuthenticated(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-error hover:bg-error/10 rounded-lg text-left"
              >
                <LogOut className="w-4 h-4" /> Sair do Painel
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-64 glass-card rounded-none border-r border-white/10 p-5 flex-shrink-0 min-h-dvh">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-brand-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm truncate text-white">{tenantName}</h2>
              <p className="text-xs text-white/40">Painel Admin</p>
            </div>
          </div>

          <nav className="space-y-1">
            {sectionsList.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all text-left",
                    active
                      ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                  id={`tab-${item.id}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t border-white/10">
          <a
            href={`/${tenantSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <Eye className="w-4 h-4 text-brand-primary" /> Ver Simulador
          </a>
          <button
            onClick={() => setAuthenticated(false)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-error/80 hover:text-error hover:bg-error/10 rounded-xl transition-colors text-left"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto overflow-y-auto">
        {section === "orders" && <AdminOrdersSection tenantId={tenantId} showToast={showToast} />}
        {section === "menu" && <AdminMenuSection tenantId={tenantId} showToast={showToast} />}
        {section === "calendar" && <AdminCalendarSection tenantId={tenantId} showToast={showToast} />}
        {section === "brand" && <AdminBrandSection tenantId={tenantId} showToast={showToast} />}
        {section === "features" && <AdminFeaturesSection tenantId={tenantId} showToast={showToast} />}
      </main>
    </div>
  );
}

/* ============================================================
   1. ORDERS SECTION
   ============================================================ */

function AdminOrdersSection({ tenantId, showToast }: { tenantId: string; showToast: (m: string) => void }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      showToast("Erro ao buscar pedidos");
    } finally {
      setLoading(false);
    }
  }, [tenantId, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (res.ok) {
        showToast("Status atualizado!");
        if (selectedOrder) setSelectedOrder((o) => (o ? { ...o, status } : null));
        fetchOrders();
      }
    } catch {
      showToast("Erro ao atualizar status");
    }
  };

  const filteredOrders = orders.filter((o) => (filter === "all" ? true : o.status === filter));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestao de Pedidos</h1>
          <p className="text-white/50 text-sm">Acompanhe e gerencie as encomendas recebidas</p>
        </div>
        <button onClick={fetchOrders} className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "Todos" },
          { id: "pending", label: "Pendentes" },
          { id: "confirmed", label: "Confirmados" },
          { id: "completed", label: "Concluidos" },
          { id: "cancelled", label: "Cancelados" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === tab.id
                ? "bg-brand-primary text-white shadow-md"
                : "glass-card text-white/60 hover:text-white"
            )}
          >
            {tab.label} ({orders.filter((o) => (tab.id === "all" ? true : o.status === tab.id)).length})
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="glass-card p-12 text-center text-white/50">Carregando pedidos...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card p-12 text-center text-white/40">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="text-sm font-medium">Nenhum pedido encontrado nesta categoria</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredOrders.map((o) => (
            <div
              key={o.id}
              onClick={() => setSelectedOrder(o)}
              className="glass-card p-4 hover:border-brand-primary/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">{o.customerName}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                    o.status === "pending" && "bg-amber-500/20 text-amber-300 border border-amber-500/30",
                    o.status === "confirmed" && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                    o.status === "completed" && "bg-purple-500/20 text-purple-300 border border-purple-500/30",
                    o.status === "cancelled" && "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  )}>
                    {o.status}
                  </span>
                </div>
                <p className="text-xs text-white/60 flex items-center gap-2">
                  <span>Data do Evento: <strong>{o.eventDate}</strong></span>
                  <span>•</span>
                  <span>WhatsApp: {o.customerPhone}</span>
                </p>
                {o.cakeSize && (
                  <p className="text-xs text-brand-primary/90 font-medium">
                    {o.cakeSize.name} ({o.cakeSize.servings})
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                <span className="text-base font-bold text-white">{formatCurrency(o.subtotal)}</span>
                <span className="text-[11px] text-white/50">Sinal: {formatCurrency(o.depositAmount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto space-y-5 border border-white/20">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedOrder.customerName}</h3>
                <p className="text-xs text-white/50">{selectedOrder.customerPhone} • Evento: {selectedOrder.eventDate}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-white/5 p-4 rounded-xl border border-white/5">
              {selectedOrder.cakeMessage && (
                <div>
                  <span className="text-white/40 block mb-0.5">Mensagem da Placa:</span>
                  <span className="font-semibold text-brand-primary text-sm">"{selectedOrder.cakeMessage}"</span>
                </div>
              )}
              {selectedOrder.details && (
                <div>
                  <span className="text-white/40 block mb-0.5">Observacoes:</span>
                  <p className="text-white/80 whitespace-pre-wrap">{selectedOrder.details}</p>
                </div>
              )}
              {selectedOrder.referenceImageUrl && (
                <div>
                  <span className="text-white/40 block mb-1">Foto de Referencia:</span>
                  <img src={selectedOrder.referenceImageUrl} alt="Referencia" className="w-full max-h-48 object-cover rounded-lg border border-white/10" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <div>
                <span className="text-xs text-white/50 block">Valor Total</span>
                <span className="text-lg font-bold text-white">{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-white/50 block">Sinal (50%)</span>
                <span className="text-sm font-bold text-brand-secondary">{formatCurrency(selectedOrder.depositAmount)}</span>
              </div>
            </div>

            {/* Status Switcher */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">Alterar Status do Pedido</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "pending", label: "Pendente" },
                  { id: "confirmed", label: "Confirmado" },
                  { id: "completed", label: "Concluido" },
                  { id: "cancelled", label: "Cancelado" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => updateStatus(selectedOrder.id, st.id)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium transition-all text-center",
                      selectedOrder.status === st.id
                        ? "bg-brand-primary text-white font-bold"
                        : "bg-white/5 hover:bg-white/10 text-white/60"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   2. MENU MANAGEMENT SECTION (Full Edit & Add Modals)
   ============================================================ */

function AdminMenuSection({ tenantId, showToast }: { tenantId: string; showToast: (m: string) => void }) {
  const [menu, setMenu] = useState<MenuData>({ sizes: [], flavors: [], addons: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sizes" | "flavors" | "addons">("sizes");

  // Modal States
  const [editModal, setEditModal] = useState<{ type: "size" | "flavor" | "addon"; item: any } | null>(null);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/menu?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setMenu(data);
      }
    } catch {
      showToast("Erro ao carregar cardapio");
    } finally {
      setLoading(false);
    }
  }, [tenantId, showToast]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    const { type, item } = editModal;
    const isNew = !item.id;
    const url = "/api/admin/menu";
    const method = isNew ? "POST" : "PUT";
    const body = isNew ? { tenantId, type, ...item } : { type, ...item };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(isNew ? "Item criado com sucesso!" : "Item atualizado com sucesso!");
        setEditModal(null);
        fetchMenu();
      }
    } catch {
      showToast("Erro ao salvar item");
    }
  };

  const handleDeleteItem = async (type: string, id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;
    try {
      const res = await fetch(`/api/admin/menu?id=${id}&type=${type}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Item excluido");
        fetchMenu();
      }
    } catch {
      showToast("Erro ao excluir item");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestao do Cardapio</h1>
          <p className="text-white/50 text-sm">Configure os tamanhos, massas, recheios e adicionais oferecidos aos clientes</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-white/10 gap-4">
        {[
          { id: "sizes", label: `Tamanhos de Bolo (${menu.sizes.length})` },
          { id: "flavors", label: `Massas & Recheios (${menu.flavors.length})` },
          { id: "addons", label: `Itens Adicionais (${menu.addons.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "pb-3 text-sm font-semibold transition-all relative",
              activeTab === tab.id ? "text-brand-primary" : "text-white/50 hover:text-white"
            )}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-white/50">Carregando cardapio...</div>
      ) : (
        <div>
          {/* TAB 1: SIZES */}
          {activeTab === "sizes" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-white/50">Defina o numero de fatias, peso, valor base e limite de recheios</p>
                <button
                  onClick={() => setEditModal({ type: "size", item: { name: "", servings: "10-15 pessoas", weightKg: 1.5, basePrice: 120, maxFillings: 2, sortOrder: menu.sizes.length, active: true } })}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Novo Tamanho
                </button>
              </div>

              <div className="grid gap-3">
                {menu.sizes.map((s) => (
                  <div key={s.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{s.name}</span>
                        <span className="badge badge-primary text-[11px]">{s.servings}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/70 text-[11px]">Max {s.maxFillings} recheios</span>
                      </div>
                      <p className="text-xs text-white/50">Peso estimado: {s.weightKg} kg</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="text-base font-bold text-white">{formatCurrency(s.basePrice)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditModal({ type: "size", item: s })}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem("size", s.id)}
                          className="p-2 rounded-lg bg-error/10 hover:bg-error/20 text-error"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: FLAVORS */}
          {activeTab === "flavors" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-white/50">Cadastre massas e recheios com opcionais de sabor especial</p>
                <button
                  onClick={() => setEditModal({ type: "flavor", item: { name: "", type: "RECHEIO", additionalPrice: 0, isSpecial: false, imageUrl: "", active: true, sortOrder: menu.flavors.length } })}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Novo Sabor
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {menu.flavors.map((f) => (
                  <div key={f.id} className="glass-card p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {f.imageUrl ? (
                        <img src={f.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className="w-5 h-5 text-white/30" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm truncate">{f.name}</span>
                          {f.isSpecial && <span className="badge badge-special text-[9px]">Especial</span>}
                        </div>
                        <p className="text-xs text-white/40">{f.type === "MASSA" ? "Massa" : "Recheio"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-semibold text-brand-secondary">
                        {f.additionalPrice > 0 ? `+${formatCurrency(f.additionalPrice)}` : "Grátis"}
                      </span>
                      <button onClick={() => setEditModal({ type: "flavor", item: f })} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                        <Edit3 className="w-3.5 h-3.5 text-white/70" />
                      </button>
                      <button onClick={() => handleDeleteItem("flavor", f.id)} className="p-1.5 rounded-lg bg-error/10 text-error">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ADDONS */}
          {activeTab === "addons" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-white/50">Itens adicionais opcionais (Toppers, embalagens, velas)</p>
                <button
                  onClick={() => setEditModal({ type: "addon", item: { name: "", description: "", price: 20, imageUrl: "", active: true, sortOrder: menu.addons.length } })}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Novo Adicional
                </button>
              </div>

              <div className="grid gap-3">
                {menu.addons.map((a) => (
                  <div key={a.id} className="glass-card p-4 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-white">{a.name}</h4>
                      {a.description && <p className="text-xs text-white/50">{a.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">+{formatCurrency(a.price)}</span>
                      <button onClick={() => setEditModal({ type: "addon", item: a })} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                        <Edit3 className="w-4 h-4 text-white/70" />
                      </button>
                      <button onClick={() => handleDeleteItem("addon", a.id)} className="p-2 rounded-lg bg-error/10 text-error">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleSaveItem} className="glass-card p-6 w-full max-w-md space-y-4 border border-white/20">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">
                {editModal.item.id ? "Editar Item" : "Criar Novo Item"}
              </h3>
              <button type="button" onClick={() => setEditModal(null)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SIZE FORM */}
            {editModal.type === "size" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Nome do Tamanho</label>
                  <input
                    type="text"
                    required
                    value={editModal.item.name}
                    onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, name: e.target.value } })}
                    className="input-field"
                    placeholder="Ex: Medio"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Rendimento / Pessoas</label>
                  <input
                    type="text"
                    required
                    value={editModal.item.servings}
                    onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, servings: e.target.value } })}
                    className="input-field"
                    placeholder="Ex: 20-25 pessoas"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Preco Base (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editModal.item.basePrice}
                      onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, basePrice: parseFloat(e.target.value) || 0 } })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Max Recheios Permitidos</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={editModal.item.maxFillings}
                      onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, maxFillings: parseInt(e.target.value) || 1 } })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* FLAVOR FORM */}
            {editModal.type === "flavor" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Nome do Sabor</label>
                  <input
                    type="text"
                    required
                    value={editModal.item.name}
                    onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, name: e.target.value } })}
                    className="input-field"
                    placeholder="Ex: Ninho com Nutella"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Categoria</label>
                  <select
                    value={editModal.item.type}
                    onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, type: e.target.value } })}
                    className="input-field"
                  >
                    <option value="MASSA" className="bg-surface-900">Massa do Bolo</option>
                    <option value="RECHEIO" className="bg-surface-900">Recheio do Bolo</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Valor Adicional (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editModal.item.additionalPrice}
                      onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, additionalPrice: parseFloat(e.target.value) || 0 } })}
                      className="input-field"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-xs font-medium text-white/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editModal.item.isSpecial}
                        onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, isSpecial: e.target.checked } })}
                        className="rounded bg-white/10 border-white/20 text-brand-primary focus:ring-brand-primary"
                      />
                      Sabor Especial
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ADDON FORM */}
            {editModal.type === "addon" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Nome do Adicional</label>
                  <input
                    type="text"
                    required
                    value={editModal.item.name}
                    onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, name: e.target.value } })}
                    className="input-field"
                    placeholder="Ex: Topo de Bolo Personalizado"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Descricao</label>
                  <input
                    type="text"
                    value={editModal.item.description}
                    onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, description: e.target.value } })}
                    className="input-field"
                    placeholder="Ex: Topo em acrilico com nome"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Preco (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editModal.item.price}
                    onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, price: parseFloat(e.target.value) || 0 } })}
                    className="input-field"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setEditModal(null)} className="btn-secondary text-xs">Cancelar</button>
              <button type="submit" className="btn-primary text-xs font-semibold">Salvar Alteracoes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   3. CALENDAR & SCHEDULE SECTION
   ============================================================ */

function AdminCalendarSection({ tenantId, showToast }: { tenantId: string; showToast: (m: string) => void }) {
  const [blockedDates, setBlockedDates] = useState<BlockedDateItem[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Date Block Input
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("Agenda Lotada");

  const daysName = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/calendar?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setBlockedDates(data.blockedDates || []);
        setWorkSchedule(data.workSchedule || []);
      }
    } catch {
      showToast("Erro ao carregar agenda");
    } finally {
      setLoading(false);
    }
  }, [tenantId, showToast]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const toggleDayOpen = async (dayOfWeek: number, currentOpen: boolean) => {
    try {
      const res = await fetch("/api/admin/calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, dayOfWeek, isOpen: !currentOpen }),
      });
      if (res.ok) {
        showToast("Horario atualizado!");
        fetchCalendar();
      }
    } catch {
      showToast("Erro ao atualizar horario");
    }
  };

  const handleBlockDate = async () => {
    if (!newDate) return;
    try {
      const res = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, date: newDate, reason: newReason }),
      });
      if (res.ok) {
        showToast("Data bloqueada com sucesso!");
        setNewDate("");
        fetchCalendar();
      } else {
        const d = await res.json();
        showToast(d.error || "Erro ao bloquear data");
      }
    } catch {
      showToast("Erro ao bloquear data");
    }
  };

  const handleUnblockDate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/calendar?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Data desbloqueada!");
        fetchCalendar();
      }
    } catch {
      showToast("Erro ao desbloquear data");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Agenda & Regras de Funcionamento</h1>
        <p className="text-white/50 text-sm">Gerencie os dias de atendimento da confeitaria e bloqueie feriados ou datas lotadas</p>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-white/50">Carregando configuracoes da agenda...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Weekly Work Days */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-brand-primary" />
              <h2 className="font-bold text-base">Dias de Funcionamento Semanal</h2>
            </div>
            <p className="text-xs text-white/50">Marque os dias em que a confeitaria atende pedidos</p>

            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                const item = workSchedule.find((w) => w.dayOfWeek === dayIdx);
                const isOpen = item ? item.isOpen : true;
                return (
                  <div key={dayIdx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-sm font-medium">{daysName[dayIdx]}</span>
                    <button
                      onClick={() => toggleDayOpen(dayIdx, isOpen)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold transition-all",
                        isOpen ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      )}
                    >
                      {isOpen ? "Aberto" : "Fechado"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specific Dates Block */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-brand-secondary" />
              <h2 className="font-bold text-base">Bloquear Data Específica</h2>
            </div>
            <p className="text-xs text-white/50">Bloqueie datas para feriados, folgas ou quando a agenda estiver cheia</p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Selecione a Data</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Motivo do Bloqueio</label>
                <select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="input-field text-xs"
                >
                  <option value="Agenda Lotada" className="bg-surface-900">Agenda Lotada / Esgotado</option>
                  <option value="Feriado" className="bg-surface-900">Feriado Nacional / Municipal</option>
                  <option value="Folga / Manutencao" className="bg-surface-900">Folga do Ateliê / Manutenção</option>
                  <option value="Ferias Coletivas" className="bg-surface-900">Férias Coletivas</option>
                </select>
              </div>

              <button
                onClick={handleBlockDate}
                disabled={!newDate}
                className="btn-primary w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Bloquear Data
              </button>
            </div>

            {/* Blocked Dates List */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <h3 className="text-xs font-bold text-white/70">Datas Bloqueadas ({blockedDates.length})</h3>
              {blockedDates.length === 0 ? (
                <p className="text-xs text-white/40">Nenhuma data bloqueada manualmente.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {blockedDates.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs">
                      <div>
                        <span className="font-semibold text-white">{b.date}</span>
                        <span className="text-white/50 ml-2">({b.reason})</span>
                      </div>
                      <button onClick={() => handleUnblockDate(b.id)} className="p-1 text-error hover:bg-error/10 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   4. BRAND & STYLING SECTION (Theme Presets & Live Engine)
   ============================================================ */

function AdminBrandSection({ tenantId, showToast }: { tenantId: string; showToast: (m: string) => void }) {
  const [form, setForm] = useState({
    name: "",
    whatsapp: "",
    pixKey: "",
    logoUrl: "",
    bannerUrl: "",
    primaryColor: "#8B5CF6",
    secondaryColor: "#EC4899",
    backgroundColor: "#0F0A1A",
    buttonColor: "#8B5CF6",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/settings?tenantId=${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          const s = data.settings;
          setForm({
            name: s.name || "",
            whatsapp: s.whatsapp || "",
            pixKey: s.pixKey || "",
            logoUrl: s.logoUrl || "",
            bannerUrl: s.bannerUrl || "",
            primaryColor: s.primaryColor || "#8B5CF6",
            secondaryColor: s.secondaryColor || "#EC4899",
            backgroundColor: s.backgroundColor || "#0F0A1A",
            buttonColor: s.buttonColor || "#8B5CF6",
          });
        }
      } catch {
        showToast("Erro ao carregar marca");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId, showToast]);

  const applyPreset = (preset: ColorPreset) => {
    setForm((f) => ({
      ...f,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      backgroundColor: preset.backgroundColor,
      buttonColor: preset.buttonColor,
    }));
    showToast(`Paleta "${preset.name}" aplicada!`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, ...form }),
      });
      if (res.ok) {
        showToast("Estilo e Marca salvos com sucesso!");
      }
    } catch {
      showToast("Erro ao salvar marca");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marca & Personalizacao Visual</h1>
        <p className="text-white/50 text-sm">Personalize as cores, logo, banner e dados do seu atelie</p>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-white/50">Carregando marca...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Preset Color Palettes */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-primary" />
              <h2 className="font-bold text-base">Paletas de Cores Prontas</h2>
            </div>
            <p className="text-xs text-white/50">Clique em uma paleta pronta para aplicar o tema no seu simulador</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-brand-primary/50 transition-all text-left space-y-2 group"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.primaryColor }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.secondaryColor }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.backgroundColor }} />
                  </div>
                  <p className="text-xs font-semibold text-white/80 group-hover:text-white truncate">{p.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Color Pickers */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Cores Personalizadas</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Cor Primaria</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent" />
                  <input type="text" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="input-field text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Cor Secundaria</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent" />
                  <input type="text" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} className="input-field text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Cor de Fundo</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.backgroundColor} onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent" />
                  <input type="text" value={form.backgroundColor} onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })} className="input-field text-xs font-mono" />
                </div>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Informações Gerais</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Nome do Ateliê</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">WhatsApp (com DDD)</label>
                <input type="text" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="input-field" placeholder="Ex: 5511999999999" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-white/70 mb-1">Chave PIX (E-mail, CPF, Telefone ou Aleatória)</label>
                <input type="text" value={form.pixKey} onChange={(e) => setForm({ ...form, pixKey: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">URL da Logo</label>
                <input type="url" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} className="input-field text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">URL do Banner</label>
                <input type="url" value={form.bannerUrl} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} className="input-field text-xs" />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary py-3 px-6 text-sm font-semibold flex items-center gap-2">
            <Save className="w-4 h-4" /> Salvar Marca & Estilo
          </button>
        </form>
      )}
    </div>
  );
}

/* ============================================================
   5. FEATURES SECTION
   ============================================================ */

function AdminFeaturesSection({ tenantId, showToast }: { tenantId: string; showToast: (m: string) => void }) {
  const [config, setConfig] = useState<FeaturesConfig>({
    allow_photo_upload: true,
    deposit_mode: "50_percent",
    enable_delivery_step: false,
    custom_fields: [],
  });
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(5);
  const [minLeadDays, setMinLeadDays] = useState(3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/settings?tenantId=${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.settings.featuresConfig) setConfig(data.settings.featuresConfig);
          if (data.settings.maxOrdersPerDay) setMaxOrdersPerDay(data.settings.maxOrdersPerDay);
          if (data.settings.minLeadDays) setMinLeadDays(data.settings.minLeadDays);
        }
      } catch {
        showToast("Erro ao carregar funcionalidades");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId, showToast]);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, featuresConfig: config, maxOrdersPerDay, minLeadDays }),
      });
      if (res.ok) {
        showToast("Funcionalidades salvas com sucesso!");
      }
    } catch {
      showToast("Erro ao salvar funcionalidades");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Funcionalidades & Regras do Ateliê</h1>
        <p className="text-white/50 text-sm">Configure o comportamento do simulador de encomendas</p>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-white/50">Carregando regras...</div>
      ) : (
        <div className="space-y-6 max-w-2xl">
          {/* Main Toggles */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Ativadores Gerais</h2>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div>
                <p className="font-semibold text-sm">Upload de Foto de Referência</p>
                <p className="text-xs text-white/50">Permite que o cliente envie fotos do modelo do bolo</p>
              </div>
              <button
                onClick={() => setConfig({ ...config, allow_photo_upload: !config.allow_photo_upload })}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                  config.allow_photo_upload ? "bg-emerald-500 text-white" : "bg-white/10 text-white/50"
                )}
              >
                {config.allow_photo_upload ? "Ativado" : "Desativado"}
              </button>
            </div>
          </div>

          {/* Limits */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Limites da Agenda</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Máximo de Pedidos por Dia</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxOrdersPerDay}
                  onChange={(e) => setMaxOrdersPerDay(parseInt(e.target.value) || 1)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Antecedência Mínima (Dias)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={minLeadDays}
                  onChange={(e) => setMinLeadDays(parseInt(e.target.value) || 1)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Deposit Mode */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Modo de Pagamento de Sinal</h2>

            <div className="grid gap-2">
              {[
                { id: "50_percent", title: "Sinal de 50%", desc: "Cliente paga metade para confirmar e metade na entrega" },
                { id: "100_percent", title: "Pagamento Integral (100%)", desc: "Cliente paga o valor total adiantado" },
                { id: "quote_only", title: "Apenas Orçamento (Sem Pagamento)", desc: "Gera o resumo sem exibir valor de entrada ou chave PIX" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setConfig({ ...config, deposit_mode: m.id as any })}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all",
                    config.deposit_mode === m.id
                      ? "border-brand-primary bg-brand-primary/10"
                      : "border-white/10 hover:bg-white/5"
                  )}
                >
                  <p className="font-semibold text-sm">{m.title}</p>
                  <p className="text-xs text-white/50 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSave} className="btn-primary py-3 px-6 text-sm font-semibold flex items-center gap-2">
            <Save className="w-4 h-4" /> Salvar Funcionalidades
          </button>
        </div>
      )}
    </div>
  );
}
