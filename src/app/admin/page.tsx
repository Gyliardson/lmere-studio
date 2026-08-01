"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, CalendarDays, Palette,
  Settings, LogOut, ChevronLeft, ChevronRight, Check, X, Clock,
  Plus, Trash2, Edit3, Save, Eye, Ban, Users, Star, Sparkles,
  Phone, Key, Image, Type, ToggleLeft, ToggleRight, ArrowLeft, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/pricing";
import type { TenantData, FeaturesConfig } from "@/lib/types";

type AdminSection = "orders" | "menu" | "calendar" | "brand" | "features";

interface AdminOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  eventDate: string;
  cakeSize: { name: string; servings: string };
  flavorId: string;
  fillingIds: string;
  addonIds: string;
  subtotal: number;
  depositAmount: number;
  status: string;
  createdAt: string;
  cakeMessage: string;
  details: string;
}

interface MenuData {
  sizes: Array<{ id: string; name: string; servings: string; weightKg: number; basePrice: number; sortOrder: number; active: boolean }>;
  flavors: Array<{ id: string; name: string; type: string; additionalPrice: number; isSpecial: boolean; imageUrl: string; active: boolean; sortOrder: number }>;
  addons: Array<{ id: string; name: string; description: string; price: number; imageUrl: string; active: boolean; sortOrder: number }>;
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      setAuthError("Erro de conexao");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="glass-card p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-brand-primary" />
            </div>
            <h1 className="text-xl font-bold">Painel Administrativo</h1>
            <p className="text-white/50 text-sm mt-1">Acesse com as credenciais do seu atelie</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-white/70">Slug do Atelie</label>
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
              <label className="block text-sm font-medium mb-1.5 text-white/70">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="input-field"
                placeholder="Senha de acesso"
                id="admin-password"
              />
            </div>
            {authError && (
              <p className="text-error text-sm text-center">{authError}</p>
            )}
            <button onClick={handleLogin} className="btn-primary w-full" id="admin-login-btn">
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: Array<{ key: AdminSection; label: string; icon: typeof LayoutDashboard }> = [
    { key: "orders", label: "Pedidos", icon: ShoppingBag },
    { key: "menu", label: "Cardapio", icon: UtensilsCrossed },
    { key: "calendar", label: "Agenda", icon: CalendarDays },
    { key: "brand", label: "Marca & Estilo", icon: Palette },
    { key: "features", label: "Funcionalidades", icon: Settings },
  ];

  return (
    <div className="min-h-dvh flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 bottom-0 z-40 bg-surface-800 border-r border-white/5 transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-60" : "w-16"
      )}>
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-primary/20 flex items-center justify-center flex-shrink-0">
              <LayoutDashboard className="w-5 h-5 text-brand-primary" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{tenantName}</p>
                <p className="text-[11px] text-white/40">Painel Admin</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                section === key
                  ? "bg-brand-primary/15 text-brand-primary font-medium"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
              id={`nav-${key}`}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-white/5 space-y-1">
          <a
            href={`/${tenantSlug}`}
            target="_blank"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
          >
            <Eye className="w-4.5 h-4.5 flex-shrink-0" />
            {sidebarOpen && <span>Ver Simulador</span>}
          </a>
          <button
            onClick={() => setAuthenticated(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-error hover:bg-error/10 transition-all"
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        sidebarOpen ? "ml-60" : "ml-16"
      )}>
        <header className="sticky top-0 z-30 bg-surface-900/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <h1 className="text-lg font-bold capitalize">
                {navItems.find((n) => n.key === section)?.label}
              </h1>
            </div>
          </div>
        </header>

        <div className="p-6">
          {section === "orders" && <OrdersSection tenantId={tenantId} />}
          {section === "menu" && <MenuSection tenantId={tenantId} />}
          {section === "calendar" && <CalendarSection tenantId={tenantId} />}
          {section === "brand" && <BrandSection tenantId={tenantId} tenantSlug={tenantSlug} />}
          {section === "features" && <FeaturesSection tenantId={tenantId} />}
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   ORDERS SECTION
   ============================================================ */

function OrdersSection({ tenantId }: { tenantId: string }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/orders?tenantId=${tenantId}&status=${filter}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  }, [tenantId, filter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchOrders();
  };

  const statusColors: Record<string, string> = {
    pending: "badge-warning",
    confirmed: "badge-success",
    completed: "badge bg-brand-primary/15 text-brand-primary border border-brand-primary/30",
    cancelled: "badge-error",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    completed: "Concluido",
    cancelled: "Cancelado",
  };

  const filters = [
    { key: "all", label: "Todos" },
    { key: "pending", label: "Pendentes" },
    { key: "confirmed", label: "Confirmados" },
    { key: "completed", label: "Concluidos" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filter === f.key ? "bg-brand-primary text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            )}
            id={`filter-${f.key}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{order.customerName}</h3>
                    <span className={cn("badge", statusColors[order.status])}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 space-y-0.5">
                    <p>Evento: {new Date(order.eventDate + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                    <p>Tamanho: {order.cakeSize?.name} ({order.cakeSize?.servings})</p>
                    <p>Valor: {formatCurrency(order.subtotal)}</p>
                    {order.cakeMessage && <p>Placa: &quot;{order.cakeMessage}&quot;</p>}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {order.status === "pending" && (
                    <button
                      onClick={() => updateStatus(order.id, "confirmed")}
                      className="p-2 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors"
                      title="Confirmar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {order.status === "confirmed" && (
                    <button
                      onClick={() => updateStatus(order.id, "completed")}
                      className="p-2 rounded-lg bg-brand-primary/15 text-brand-primary hover:bg-brand-primary/25 transition-colors"
                      title="Concluir"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {order.status !== "cancelled" && order.status !== "completed" && (
                    <button
                      onClick={() => updateStatus(order.id, "cancelled")}
                      className="p-2 rounded-lg bg-error/15 text-error hover:bg-error/25 transition-colors"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MENU SECTION
   ============================================================ */

function MenuSection({ tenantId }: { tenantId: string }) {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [tab, setTab] = useState<"sizes" | "flavors" | "addons">("sizes");
  const [loading, setLoading] = useState(true);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/menu?tenantId=${tenantId}`);
    const data = await res.json();
    setMenu(data);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const deleteItem = async (id: string, type: string) => {
    await fetch(`/api/admin/menu?id=${id}&type=${type}`, { method: "DELETE" });
    fetchMenu();
  };

  const toggleActive = async (id: string, type: string, active: boolean) => {
    await fetch("/api/admin/menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type, active: !active }),
    });
    fetchMenu();
  };

  const tabs = [
    { key: "sizes" as const, label: "Tamanhos" },
    { key: "flavors" as const, label: "Massas & Recheios" },
    { key: "addons" as const, label: "Adicionais" },
  ];

  if (loading || !menu) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 w-full" />)}</div>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t.key ? "bg-brand-primary text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sizes" && (
        <div className="space-y-2">
          {menu.sizes.map((size) => (
            <div key={size.id} className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className={cn("font-medium text-sm", !size.active && "text-white/30 line-through")}>
                  {size.name}
                </p>
                <p className="text-xs text-white/40">{size.servings} - {size.weightKg}kg</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">{formatCurrency(size.basePrice)}</span>
                <button
                  onClick={() => toggleActive(size.id, "size", size.active)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {size.active ? (
                    <ToggleRight className="w-5 h-5 text-success" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-white/30" />
                  )}
                </button>
                <button
                  onClick={() => deleteItem(size.id, "size")}
                  className="p-1.5 rounded-lg hover:bg-error/15 text-white/30 hover:text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "flavors" && (
        <div className="space-y-2">
          {menu.flavors.map((flavor) => (
            <div key={flavor.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {flavor.imageUrl && (
                  <img src={flavor.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className={cn("font-medium text-sm", !flavor.active && "text-white/30 line-through")}>
                      {flavor.name}
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                      {flavor.type}
                    </span>
                    {flavor.isSpecial && (
                      <Star className="w-3 h-3 text-brand-secondary" />
                    )}
                  </div>
                  {flavor.additionalPrice > 0 && (
                    <p className="text-xs text-brand-secondary">+{formatCurrency(flavor.additionalPrice)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(flavor.id, "flavor", flavor.active)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {flavor.active ? (
                    <ToggleRight className="w-5 h-5 text-success" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-white/30" />
                  )}
                </button>
                <button
                  onClick={() => deleteItem(flavor.id, "flavor")}
                  className="p-1.5 rounded-lg hover:bg-error/15 text-white/30 hover:text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "addons" && (
        <div className="space-y-2">
          {menu.addons.map((addon) => (
            <div key={addon.id} className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className={cn("font-medium text-sm", !addon.active && "text-white/30 line-through")}>
                  {addon.name}
                </p>
                <p className="text-xs text-white/40">{addon.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">{formatCurrency(addon.price)}</span>
                <button
                  onClick={() => toggleActive(addon.id, "addon", addon.active)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {addon.active ? (
                    <ToggleRight className="w-5 h-5 text-success" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-white/30" />
                  )}
                </button>
                <button
                  onClick={() => deleteItem(addon.id, "addon")}
                  className="p-1.5 rounded-lg hover:bg-error/15 text-white/30 hover:text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   CALENDAR SECTION
   ============================================================ */

function CalendarSection({ tenantId }: { tenantId: string }) {
  const [blockedDates, setBlockedDates] = useState<Array<{ id: string; date: string; reason: string }>>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const fetchDates = useCallback(async () => {
    const res = await fetch(`/api/admin/calendar?tenantId=${tenantId}`);
    const data = await res.json();
    setBlockedDates(data.blockedDates || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchDates(); }, [fetchDates]);

  const toggleDate = async (dateStr: string) => {
    const existing = blockedDates.find((b) => b.date === dateStr);
    if (existing) {
      await fetch(`/api/admin/calendar?id=${existing.id}`, { method: "DELETE" });
    } else {
      await fetch("/api/admin/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, date: dateStr, reason: "Esgotado" }),
      });
    }
    fetchDates();
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const blockedStrs = blockedDates.map((b) => b.date);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <div className="max-w-md">
      <p className="text-white/50 text-sm mb-4">Clique em uma data para bloquear/desbloquear</p>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-semibold">{monthNames[viewMonth]} {viewYear}</h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-white/40 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isBlocked = blockedStrs.includes(dateStr);

            return (
              <button
                key={day}
                onClick={() => toggleDate(dateStr)}
                className={cn(
                  "h-10 rounded-lg text-sm font-medium transition-all",
                  isBlocked
                    ? "bg-error/20 text-error border border-error/30"
                    : "hover:bg-white/10 text-white/70"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5 text-xs text-white/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-error/60" />
            Bloqueado
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white/20" />
            Disponivel
          </div>
        </div>
      </div>

      {blockedDates.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-white/60 mb-2">Datas bloqueadas</h3>
          <div className="space-y-1.5">
            {blockedDates.map((bd) => (
              <div key={bd.id} className="glass-card-light p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ban className="w-3.5 h-3.5 text-error" />
                  <span className="text-sm">
                    {new Date(bd.date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </span>
                  <span className="text-xs text-white/30">{bd.reason}</span>
                </div>
                <button
                  onClick={() => toggleDate(bd.date)}
                  className="p-1 rounded hover:bg-error/15 text-white/30 hover:text-error transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   BRAND SECTION
   ============================================================ */

function BrandSection({ tenantId, tenantSlug }: { tenantId: string; tenantSlug: string }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const res = await fetch(`/api/admin/settings?tenantId=${tenantId}`);
      const data = await res.json();
      if (data.settings) {
        const { featuresConfig, ...rest } = data.settings;
        setSettings(rest);
      }
      setLoading(false);
    }
    fetchSettings();
  }, [tenantId]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, ...settings }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  if (loading) return <div className="skeleton h-96 w-full max-w-lg" />;

  const colorFields = [
    { key: "primaryColor", label: "Cor Primaria" },
    { key: "secondaryColor", label: "Cor Secundaria" },
    { key: "backgroundColor", label: "Cor de Fundo" },
    { key: "buttonColor", label: "Cor do Botao" },
    { key: "textColor", label: "Cor do Texto" },
  ];

  return (
    <div className="max-w-lg space-y-6">
      {/* Basic Info */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-white/80 flex items-center gap-2">
          <Type className="w-4 h-4" /> Informacoes Basicas
        </h3>
        <div>
          <label className="block text-xs text-white/50 mb-1">Nome do Atelie</label>
          <input
            type="text"
            value={settings.name || ""}
            onChange={(e) => updateSetting("name", e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1 flex items-center gap-1">
            <Phone className="w-3 h-3" /> WhatsApp
          </label>
          <input
            type="text"
            value={settings.whatsapp || ""}
            onChange={(e) => updateSetting("whatsapp", e.target.value)}
            className="input-field"
            placeholder="5511999999999"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1 flex items-center gap-1">
            <Key className="w-3 h-3" /> Chave PIX
          </label>
          <input
            type="text"
            value={settings.pixKey || ""}
            onChange={(e) => updateSetting("pixKey", e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Images */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-white/80 flex items-center gap-2">
          <Image className="w-4 h-4" /> Imagens
        </h3>
        <div>
          <label className="block text-xs text-white/50 mb-1">URL da Logo</label>
          <input
            type="url"
            value={settings.logoUrl || ""}
            onChange={(e) => updateSetting("logoUrl", e.target.value)}
            className="input-field text-xs"
          />
          {settings.logoUrl && (
            <img src={settings.logoUrl} alt="Logo preview" className="w-16 h-16 rounded-lg object-cover mt-2" />
          )}
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">URL do Banner</label>
          <input
            type="url"
            value={settings.bannerUrl || ""}
            onChange={(e) => updateSetting("bannerUrl", e.target.value)}
            className="input-field text-xs"
          />
          {settings.bannerUrl && (
            <img src={settings.bannerUrl} alt="Banner preview" className="w-full h-24 rounded-lg object-cover mt-2" />
          )}
        </div>
      </div>

      {/* Colors */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-white/80 flex items-center gap-2">
          <Palette className="w-4 h-4" /> Cores do Simulador
        </h3>
        {colorFields.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <label className="text-xs text-white/50">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings[key] || "#8B5CF6"}
                onChange={(e) => updateSetting(key, e.target.value)}
                className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent"
              />
              <code className="text-xs text-white/40 w-16 text-center">{settings[key]}</code>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={cn("btn-primary w-full", saved && "bg-success")}
        id="btn-save-brand"
      >
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar Alteracoes"}
      </button>
    </div>
  );
}

/* ============================================================
   FEATURES SECTION
   ============================================================ */

function FeaturesSection({ tenantId }: { tenantId: string }) {
  const [features, setFeatures] = useState<FeaturesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetch_() {
      const res = await fetch(`/api/admin/settings?tenantId=${tenantId}`);
      const data = await res.json();
      if (data.settings?.featuresConfig) {
        setFeatures(data.settings.featuresConfig);
      }
      setLoading(false);
    }
    fetch_();
  }, [tenantId]);

  const handleSave = async () => {
    if (!features) return;
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, featuresConfig: features }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading || !features) return <div className="skeleton h-64 w-full max-w-lg" />;

  return (
    <div className="max-w-lg space-y-4">
      <div className="glass-card p-5 space-y-5">
        <h3 className="font-semibold text-sm text-white/80 flex items-center gap-2">
          <Settings className="w-4 h-4" /> Feature Flags
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Upload de Foto de Referencia</p>
            <p className="text-xs text-white/40">Permite que o cliente envie uma imagem de referencia</p>
          </div>
          <button
            onClick={() => setFeatures({ ...features, allow_photo_upload: !features.allow_photo_upload })}
            className="p-1"
          >
            {features.allow_photo_upload ? (
              <ToggleRight className="w-8 h-8 text-success" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-white/30" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Etapa de Entrega</p>
            <p className="text-xs text-white/40">Habilita opcao de entrega/retirada</p>
          </div>
          <button
            onClick={() => setFeatures({ ...features, enable_delivery_step: !features.enable_delivery_step })}
            className="p-1"
          >
            {features.enable_delivery_step ? (
              <ToggleRight className="w-8 h-8 text-success" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-white/30" />
            )}
          </button>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Modo de Deposito/Sinal</p>
          <div className="space-y-2">
            {[
              { value: "50_percent" as const, label: "Sinal de 50%" },
              { value: "100_percent" as const, label: "Pagamento integral (100%)" },
              { value: "quote_only" as const, label: "Apenas orcamento (sem pagamento)" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFeatures({ ...features, deposit_mode: opt.value })}
                className={cn(
                  "w-full p-3 rounded-lg text-sm text-left transition-all",
                  features.deposit_mode === opt.value
                    ? "bg-brand-primary/15 text-brand-primary border border-brand-primary/30"
                    : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={cn("btn-primary w-full", saved && "bg-success")}
      >
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar Funcionalidades"}
      </button>
    </div>
  );
}
