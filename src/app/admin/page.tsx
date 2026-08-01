"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, CalendarDays, Palette,
  Settings, LogOut, ChevronLeft, ChevronRight, Check, X, Clock,
  Plus, Trash2, Edit3, Save, Eye, Ban, Users, Star, Sparkles,
  Phone, Key, Image as ImageIcon, Type, ToggleLeft, ToggleRight, ArrowLeft, Lock,
  Menu as MenuIcon, AlertCircle, ExternalLink, Sliders, Calendar as CalendarIcon,
  CheckCircle2, XCircle, Upload, AlertTriangle
} from "lucide-react";
import { cn, hexToHsl } from "@/lib/utils";
import { formatCurrency } from "@/lib/pricing";
import { COLOR_PRESETS, ColorPreset, FeaturesConfig } from "@/lib/types";

type AdminSection = "orders" | "menu" | "calendar" | "brand" | "features";

/* Custom Confirm Modal (replaces browser confirm()) */
function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  variant = "danger",
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "info";
}) {
  if (!isOpen) return null;
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            variant === "danger" ? "bg-error/15" : "bg-brand-primary/15"
          )}>
            <AlertTriangle className={cn("w-5 h-5", variant === "danger" ? "text-error" : "text-brand-primary")} />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">{title}</h3>
            <p className="text-sm text-white/60 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="btn-secondary text-xs px-4 py-2"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              variant === "danger"
                ? "bg-error hover:bg-error/80 text-white"
                : "btn-primary"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Styled Checkbox Component */
function StyledCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn("checkbox-styled", checked && "checked")}
    >
      <span className="check-icon">
        {checked && <Check className="w-3 h-3 text-white" />}
      </span>
      <span>{label}</span>
    </button>
  );
}

/* Currency Input with proper UX (allows clearing) */
function CurrencyInput({
  value,
  onChange,
  label,
  required = false,
}: {
  value: number;
  onChange: (val: number) => void;
  label: string;
  required?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(String(value));

  useEffect(() => {
    setDisplayValue(String(value));
  }, [value]);

  return (
    <div>
      <label className="block text-xs font-medium text-white/70 mb-1">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        required={required}
        value={displayValue}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || raw === "-") {
            setDisplayValue(raw);
            return;
          }
          if (/^\d*\.?\d*$/.test(raw)) {
            setDisplayValue(raw);
            const parsed = parseFloat(raw);
            if (!isNaN(parsed)) {
              onChange(parsed);
            }
          }
        }}
        onBlur={() => {
          const parsed = parseFloat(displayValue);
          if (isNaN(parsed) || displayValue === "") {
            setDisplayValue("0");
            onChange(0);
          } else {
            setDisplayValue(String(parsed));
          }
        }}
        className="input-field"
        placeholder="0.00"
      />
    </div>
  );
}

/* Custom Styled Select Component (Replaces native browser dropdowns) */
function CustomSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  options: Array<{ value: string; label: string }>;
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-xs font-medium text-white/70 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-field text-left flex items-center justify-between gap-2 cursor-pointer bg-[#161225]/80 hover:bg-[#1c172e] transition-colors"
      >
        <span className="truncate text-white font-medium text-xs sm:text-sm">{selectedOption?.label}</span>
        <ChevronRight className={cn("w-4 h-4 text-white/50 transition-transform duration-200 flex-shrink-0", isOpen && "rotate-90")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#161225] border border-white/20 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5 animate-fade-in backdrop-blur-2xl">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between gap-2",
                opt.value === value
                  ? "bg-brand-primary text-white font-semibold shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="truncate">{opt.label}</span>
              {opt.value === value && <Check className="w-3.5 h-3.5 flex-shrink-0 text-white" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

/* Reusable Image Uploader Dropzone */
function ImageUploaderDropzone({
  label,
  value,
  onChange,
  aspect = "square",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "square" | "banner";
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onChange(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-white/70">{label}</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
      />

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-white/20 group bg-black/40">
          <img
            src={value}
            alt={label}
            className={cn(
              "w-full object-cover",
              aspect === "banner" ? "h-24 sm:h-32" : "h-24 sm:h-28"
            )}
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" /> Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-3 py-1.5 rounded-lg bg-error/40 hover:bg-error/60 text-white text-xs font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5",
            isDragging ? "border-brand-primary bg-brand-primary/10" : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
          )}
        >
          <Upload className="w-5 h-5 text-white/40" />
          <p className="text-xs text-white/70 font-medium">Clique ou arraste uma imagem</p>
          <p className="text-[10px] text-white/40">PNG, JPG, WEBP ate 5MB</p>
        </div>
      )}

      <input
        type="text"
        value={value.startsWith("data:") ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ou cole a URL da imagem (https://...)"
        className="input-field text-[11px] py-1.5 mt-1"
      />
    </div>
  );
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
              <label className="block text-sm font-medium mb-1.5 text-white/80">Slug do Ateliê</label>
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
    { id: "menu", label: "Cardápio", icon: UtensilsCrossed },
    { id: "calendar", label: "Agenda & Limites", icon: CalendarDays },
    { id: "brand", label: "Marca & Estilo", icon: Palette },
    { id: "features", label: "Funcionalidades", icon: Settings },
  ];

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-surface-950 text-white overflow-x-hidden">
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

            <div className="pt-4 border-t border-white/10 space-y-2">
              <a
                href={`/${tenantSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-brand-primary" />
                Ver Simulador
              </a>
              <button
                onClick={() => setAuthenticated(false)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-error/80 hover:text-error rounded-lg hover:bg-error/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair do Painel
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Navigation Sidebar */}
      <aside className="hidden md:flex w-64 bg-surface-900 border-r border-white/10 p-5 flex-col justify-between flex-shrink-0 min-h-dvh">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30">
              <Sparkles className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white truncate max-w-[140px]">{tenantName}</h2>
              <p className="text-[11px] text-white/40">Painel Admin</p>
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
                    "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-left",
                    active
                      ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30 font-semibold"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10 space-y-1">
          <a
            href={`/${tenantSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors font-medium"
          >
            <ExternalLink className="w-4 h-4 text-brand-primary" />
            Ver Simulador
          </a>
          <button
            onClick={() => setAuthenticated(false)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-error/80 hover:text-error rounded-lg hover:bg-error/10 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl overflow-x-hidden min-w-0">
        {section === "orders" && (
          <AdminOrdersSection tenantId={tenantId} showToast={showToast} />
        )}
        {section === "menu" && (
          <AdminMenuSection tenantId={tenantId} showToast={showToast} />
        )}
        {section === "calendar" && (
          <AdminCalendarSection tenantId={tenantId} showToast={showToast} />
        )}
        {section === "brand" && (
          <AdminBrandSection tenantId={tenantId} showToast={showToast} />
        )}
        {section === "features" && (
          <AdminFeaturesSection tenantId={tenantId} showToast={showToast} />
        )}
      </main>
    </div>
  );
}

/* ============================================================
   1. ORDERS SECTION
   ============================================================ */

function AdminOrdersSection({ tenantId, showToast }: { tenantId: string; showToast: (m: string) => void }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
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
      showToast("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }, [tenantId, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (res.ok) {
        showToast("Status atualizado com sucesso!");
        if (selectedOrder) setSelectedOrder({ ...selectedOrder, status });
        fetchOrders();
      }
    } catch {
      showToast("Erro ao atualizar status");
    }
  };

  const filteredOrders = orders.filter((o) => (filter === "all" ? true : o.status === filter));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Gestão de Pedidos</h1>
          <p className="text-white/50 text-xs sm:text-sm">Acompanhe as encomendas recebidas</p>
        </div>
        <button onClick={fetchOrders} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* Filter Tabs Scrollable on Mobile */}
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { id: "all", label: "Todos" },
          { id: "pending", label: "Pendentes" },
          { id: "confirmed", label: "Confirmados" },
          { id: "completed", label: "Concluídos" },
          { id: "cancelled", label: "Cancelados" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0",
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
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-base truncate">{o.customerName}</span>
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
                <p className="text-xs text-white/60 flex items-center gap-2 flex-wrap">
                  <span>Data: <strong>{o.eventDate}</strong></span>
                  <span>•</span>
                  <span>Whats: {o.customerPhone}</span>
                </p>
                {o.cakeSize && (
                  <p className="text-xs text-brand-primary/90 font-medium truncate">
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
                  { id: "completed", label: "Concluído" },
                  { id: "cancelled", label: "Cancelado" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => updateOrderStatus(selectedOrder.id, st.id)}
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
   2. MENU MANAGEMENT SECTION (Mobile Layout Fix + Image Upload)
   ============================================================ */

function AdminMenuSection({ tenantId, showToast }: { tenantId: string; showToast: (m: string) => void }) {
  const [menu, setMenu] = useState<MenuData>({ sizes: [], flavors: [], addons: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sizes" | "flavors" | "addons">("sizes");

  const [editModal, setEditModal] = useState<{ type: "size" | "flavor" | "addon"; item: any } | null>(null);

  /* Confirm dialog state */
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: string;
    id: string;
    name: string;
  }>({ isOpen: false, type: "", id: "", name: "" });

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

  /* Sanitize item data before sending to API - removes relation/extra fields */
  const sanitizeItemForApi = (type: string, item: Record<string, unknown>, isNew: boolean) => {
    switch (type) {
      case "size": {
        const payload: Record<string, unknown> = {
          name: item.name,
          servings: item.servings,
          weightKg: Number(item.weightKg) || 0,
          basePrice: Number(item.basePrice) || 0,
          maxFillings: Number(item.maxFillings) || 1,
          sortOrder: Number(item.sortOrder) || 0,
          active: item.active !== false,
        };
        if (!isNew) payload.id = item.id;
        return payload;
      }
      case "flavor": {
        const payload: Record<string, unknown> = {
          name: item.name,
          type: item.type || "RECHEIO",
          additionalPrice: Number(item.additionalPrice) || 0,
          isSpecial: Boolean(item.isSpecial),
          imageUrl: item.imageUrl || "",
          active: item.active !== false,
          sortOrder: Number(item.sortOrder) || 0,
        };
        if (!isNew) payload.id = item.id;
        return payload;
      }
      case "addon": {
        const payload: Record<string, unknown> = {
          name: item.name,
          description: item.description || "",
          price: Number(item.price) || 0,
          imageUrl: item.imageUrl || "",
          active: item.active !== false,
          sortOrder: Number(item.sortOrder) || 0,
        };
        if (!isNew) payload.id = item.id;
        return payload;
      }
      default:
        return item;
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    const { type, item } = editModal;
    const isNew = !item.id;
    const sanitized = sanitizeItemForApi(type, item, isNew);
    const url = "/api/admin/menu";
    const method = isNew ? "POST" : "PUT";
    const body = isNew ? { tenantId, itemType: type, ...sanitized } : { itemType: type, ...sanitized };

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
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || `Erro ao salvar (${res.status})`);
      }
    } catch {
      showToast("Erro ao salvar item");
    }
  };

  const requestDeleteItem = (type: string, id: string, name: string) => {
    setConfirmDialog({ isOpen: true, type, id, name });
  };

  const executeDeleteItem = async () => {
    const { type, id } = confirmDialog;
    setConfirmDialog({ isOpen: false, type: "", id: "", name: "" });
    try {
      const res = await fetch(`/api/admin/menu?id=${id}&type=${type}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Item excluido com sucesso!");
        fetchMenu();
      } else {
        showToast("Erro ao excluir item");
      }
    } catch {
      showToast("Erro ao excluir item");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Gestao do Cardapio</h1>
        <p className="text-white/50 text-xs sm:text-sm">Configure os tamanhos, massas, recheios e adicionais oferecidos</p>
      </div>

      {/* Sub Tabs Scrollable on Mobile */}
      <div className="flex border-b border-white/10 gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { id: "sizes", label: `Tamanhos (${menu.sizes.length})` },
          { id: "flavors", label: `Massas & Recheios (${menu.flavors.length})` },
          { id: "addons", label: `Adicionais (${menu.addons.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "pb-3 text-xs sm:text-sm font-semibold transition-all relative flex-shrink-0",
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-white/50">Defina fatias, peso, preco base e limite de recheios</p>
                <button
                  onClick={() => setEditModal({ type: "size", item: { name: "", servings: "10-15 pessoas", weightKg: 1.5, basePrice: 120, maxFillings: 2, sortOrder: menu.sizes.length, active: true } })}
                  className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" /> Novo Tamanho
                </button>
              </div>

              <div className="grid gap-3">
                {menu.sizes.map((s) => (
                  <div key={s.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-base">{s.name}</span>
                        <span className="badge badge-primary text-[11px]">{s.servings}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/70 text-[11px]">Max {s.maxFillings} recheios</span>
                      </div>
                      <p className="text-xs text-white/50">Peso estimado: {s.weightKg} kg</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
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
                          onClick={() => requestDeleteItem("size", s.id, s.name)}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-white/50">Cadastre massas e recheios com imagem e valores adicionais</p>
                <button
                  onClick={() => setEditModal({ type: "flavor", item: { name: "", type: "RECHEIO", additionalPrice: 0, isSpecial: false, imageUrl: "", active: true, sortOrder: menu.flavors.length } })}
                  className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" /> Novo Sabor
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {menu.flavors.map((f) => (
                  <div key={f.id} className="glass-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                      {f.imageUrl ? (
                        <img src={f.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className="w-5 h-5 text-white/30" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm truncate text-white">{f.name}</span>
                          {f.isSpecial && <span className="badge badge-special text-[9px]">Especial</span>}
                        </div>
                        <p className="text-xs text-white/40">{f.type === "MASSA" ? "Massa" : "Recheio"}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <span className="text-xs font-semibold text-brand-secondary">
                        {f.additionalPrice > 0 ? `+${formatCurrency(f.additionalPrice)}` : "Grátis"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setEditModal({ type: "flavor", item: f })} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => requestDeleteItem("flavor", f.id, f.name)} className="p-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ADDONS */}
          {activeTab === "addons" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-white/50">Itens adicionais opcionais (Toppers, embalagens, velas)</p>
                <button
                  onClick={() => setEditModal({ type: "addon", item: { name: "", description: "", price: 20, imageUrl: "", active: true, sortOrder: menu.addons.length } })}
                  className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" /> Novo Adicional
                </button>
              </div>

              <div className="grid gap-3">
                {menu.addons.map((a) => (
                  <div key={a.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden">
                    <div className="flex items-center gap-3">
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-brand-primary/60" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-white">{a.name}</h4>
                        {a.description && <p className="text-xs text-white/50">{a.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                      <span className="text-sm font-bold text-white">+{formatCurrency(a.price)}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setEditModal({ type: "addon", item: a })} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                          <Edit3 className="w-4 h-4 text-white/70" />
                        </button>
                        <button onClick={() => requestDeleteItem("addon", a.id, a.name)} className="p-2 rounded-lg bg-error/10 hover:bg-error/20 text-error">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
          <form onSubmit={handleSaveItem} className="glass-card p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto space-y-4 border border-white/20">
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
                  <CurrencyInput
                    label="Preco Base (R$)"
                    value={editModal.item.basePrice}
                    onChange={(val) => setEditModal({ ...editModal, item: { ...editModal.item, basePrice: val } })}
                    required
                  />
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Max Recheios Permitidos</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={editModal.item.maxFillings}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setEditModal({ ...editModal, item: { ...editModal.item, maxFillings: 1 } });
                        } else {
                          setEditModal({ ...editModal, item: { ...editModal.item, maxFillings: parseInt(val) || 1 } });
                        }
                      }}
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

                <ImageUploaderDropzone
                  label="Imagem Ilustrativa do Sabor"
                  value={editModal.item.imageUrl || ""}
                  onChange={(url) => setEditModal({ ...editModal, item: { ...editModal.item, imageUrl: url } })}
                  aspect="square"
                />

                <CustomSelect
                  label="Categoria"
                  value={editModal.item.type}
                  onChange={(val) => setEditModal({ ...editModal, item: { ...editModal.item, type: val } })}
                  options={[
                    { value: "MASSA", label: "Massa do Bolo" },
                    { value: "RECHEIO", label: "Recheio do Bolo" },
                  ]}
                />

                <div className="grid grid-cols-2 gap-3 items-end">
                  <CurrencyInput
                    label="Valor Adicional (R$)"
                    value={editModal.item.additionalPrice}
                    onChange={(val) => setEditModal({ ...editModal, item: { ...editModal.item, additionalPrice: val } })}
                  />
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Destaque</label>
                    <StyledCheckbox
                      checked={editModal.item.isSpecial}
                      onChange={(checked) => setEditModal({ ...editModal, item: { ...editModal.item, isSpecial: checked } })}
                      label="Sabor Especial"
                    />
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

                <ImageUploaderDropzone
                  label="Imagem do Adicional (Opcional)"
                  value={editModal.item.imageUrl || ""}
                  onChange={(url) => setEditModal({ ...editModal, item: { ...editModal.item, imageUrl: url } })}
                  aspect="square"
                />

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
                <CurrencyInput
                  label="Preco (R$)"
                  value={editModal.item.price}
                  onChange={(val) => setEditModal({ ...editModal, item: { ...editModal.item, price: val } })}
                  required
                />
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setEditModal(null)} className="btn-secondary text-xs">Cancelar</button>
              <button type="submit" className="btn-primary text-xs font-semibold">Salvar Alteracoes</button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title="Excluir Item"
        message={`Tem certeza que deseja excluir "${confirmDialog.name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={executeDeleteItem}
        onCancel={() => setConfirmDialog({ isOpen: false, type: "", id: "", name: "" })}
      />
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
        <h1 className="text-xl sm:text-2xl font-bold">Agenda & Regras de Funcionamento</h1>
        <p className="text-white/50 text-xs sm:text-sm">Gerencie os dias de atendimento e bloqueie datas lotadas</p>
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
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="input-field text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split("T")[0];
                      setNewDate(today);
                    }}
                    className="btn-secondary text-[11px] py-2 px-2.5 flex-shrink-0"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tmr = new Date();
                      tmr.setDate(tmr.getDate() + 1);
                      setNewDate(tmr.toISOString().split("T")[0]);
                    }}
                    className="btn-secondary text-[11px] py-2 px-2.5 flex-shrink-0"
                  >
                    Amanhã
                  </button>
                </div>
              </div>

              <CustomSelect
                label="Motivo do Bloqueio"
                value={newReason}
                onChange={setNewReason}
                options={[
                  { value: "Agenda Lotada", label: "Agenda Lotada / Esgotado" },
                  { value: "Feriado", label: "Feriado Nacional / Municipal" },
                  { value: "Folga / Manutencao", label: "Folga do Ateliê / Manutenção" },
                  { value: "Ferias Coletivas", label: "Férias Coletivas" },
                ]}
              />

              <button
                onClick={handleBlockDate}
                disabled={!newDate}
                className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 mt-2"
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
   4. BRAND & STYLING SECTION (Theme Presets + Dropzone Uploads)
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
    textColor: "#FFFFFF",
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
            textColor: s.textColor || "#FFFFFF",
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
        <h1 className="text-xl sm:text-2xl font-bold">Marca & Personalizacao Visual</h1>
        <p className="text-white/50 text-xs sm:text-sm">Personalize as cores, logo, banner e dados do seu atelie</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Cor dos Botoes</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.buttonColor} onChange={(e) => setForm({ ...form, buttonColor: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent" />
                  <input type="text" value={form.buttonColor} onChange={(e) => setForm({ ...form, buttonColor: e.target.value })} className="input-field text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Cor do Texto</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.textColor} onChange={(e) => setForm({ ...form, textColor: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent" />
                  <input type="text" value={form.textColor} onChange={(e) => setForm({ ...form, textColor: e.target.value })} className="input-field text-xs font-mono" />
                </div>
              </div>
            </div>

            {/* Live Theme Preview Box */}
            <div className="mt-4 p-4 rounded-xl border border-white/10 space-y-2" style={{ backgroundColor: form.backgroundColor }}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/60 block">Pré-visualização do Tema</span>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm font-bold" style={{ color: form.primaryColor }}>
                  {form.name || "Seu Ateliê"} - Título em Destaque
                </span>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md transition-all"
                  style={{ background: `linear-gradient(135deg, ${form.buttonColor}, ${form.secondaryColor})` }}
                >
                  Botão de Exemplo
                </button>
              </div>
            </div>
          </div>

          {/* Logo & Banner Dropzones */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Imagens do Ateliê (Logo & Banner)</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <ImageUploaderDropzone
                label="Logo do Atelie"
                value={form.logoUrl}
                onChange={(url) => setForm({ ...form, logoUrl: url })}
                aspect="square"
              />
              <ImageUploaderDropzone
                label="Banner de Capa"
                value={form.bannerUrl}
                onChange={(url) => setForm({ ...form, bannerUrl: url })}
                aspect="banner"
              />
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
        <h1 className="text-xl sm:text-2xl font-bold">Funcionalidades & Regras do Ateliê</h1>
        <p className="text-white/50 text-xs sm:text-sm">Configure o comportamento do simulador de encomendas</p>
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
