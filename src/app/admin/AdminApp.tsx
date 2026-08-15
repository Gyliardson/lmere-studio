"use client";

import { useState, useEffect, useCallback, useId } from "react";
import {
  ShoppingBag, UtensilsCrossed, CalendarDays, Palette, Settings,
  LogOut, X, Plus, Trash2, Edit3, Sparkles, Lock,
  Menu as MenuIcon, AlertCircle, ExternalLink, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/pricing";
import {
  ConfirmModal,
  CurrencyInput,
  CustomSelect,
  ImageUploaderDropzone,
  StyledCheckbox,
  useModalFocus,
} from "./components/AdminControls";
import { AdminOrdersSection } from "./orders/AdminOrdersSection";
import { AdminCalendarSection } from "./calendar/AdminCalendarSection";
import { AdminBrandSection, AdminFeaturesSection } from "./settings/AdminSettingsSections";

type AdminSection = "orders" | "menu" | "calendar" | "brand" | "features";
type MenuTab = "sizes" | "flavors" | "addons";

interface MenuSizeItem { id: string; name: string; servings: string; weightKg: number; basePrice: number; maxFillings: number; sortOrder: number; active: boolean; }
interface MenuFlavorItem { id: string; name: string; type: string; additionalPrice: number; isSpecial: boolean; imageUrl: string; active: boolean; sortOrder: number; }
interface MenuAddonItem { id: string; name: string; description: string; price: number; imageUrl: string; active: boolean; sortOrder: number; }
type MenuSizeDraft = Omit<MenuSizeItem, "id"> & { id?: string };
type MenuFlavorDraft = Omit<MenuFlavorItem, "id"> & { id?: string };
type MenuAddonDraft = Omit<MenuAddonItem, "id"> & { id?: string };
type MenuEditModal = { type: "size"; item: MenuSizeDraft } | { type: "flavor"; item: MenuFlavorDraft } | { type: "addon"; item: MenuAddonDraft };
interface MenuData { sizes: MenuSizeItem[]; flavors: MenuFlavorItem[]; addons: MenuAddonItem[]; }

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [section, setSection] = useState<AdminSection>("orders");
  const [slug, setSlug] = useState("doce-arte");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const mobileDrawerRef = useModalFocus<HTMLElement>(mobileDrawerOpen, () => setMobileDrawerOpen(false));
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      try {
        const response = await fetch("/api/admin/auth", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setTenantId(data.tenant.id);
          setTenantSlug(data.tenant.slug);
          setTenantName(data.tenant.name);
          setAuthenticated(true);
        }
      } catch {
        /* Login remains available when session validation is unreachable. */
      } finally {
        setSessionResolved(true);
      }
    }
    void restoreSession();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/admin/auth", { method: "DELETE" });
      if (!response.ok) {
        showToast("Não foi possível encerrar a sessão");
        return;
      }
      setAuthenticated(false);
      setTenantId("");
      setTenantSlug("");
      setTenantName("");
      setPassword("");
      setMobileDrawerOpen(false);
    } catch {
      showToast("Erro de conexão ao encerrar a sessão");
    }
  };

  const handleLogin = async () => {
    setAuthError("");
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password }),
      });
      const data = await response.json();
      if (!response.ok) {
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

  if (!sessionResolved) {
    return <div className="min-h-dvh flex items-center justify-center bg-surface-950 text-white/50 text-sm" role="status" aria-live="polite" aria-busy="true">Validando sessão...</div>;
  }

  if (!authenticated) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4 bg-surface-950">
        <div className="glass-card p-8 w-full max-w-sm border border-white/10 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 flex items-center justify-center mx-auto mb-4 border border-brand-primary/30"><Lock aria-hidden="true" className="w-8 h-8 text-brand-primary" /></div>
            <h1 className="text-2xl font-bold text-white">Painel Admin</h1>
            <p className="text-white/50 text-sm mt-1">L&apos;Mere Studio CMS</p>
          </div>
          <div className="space-y-4">
            <div><label htmlFor="admin-slug" className="block text-sm font-medium mb-1.5 text-white/80">Slug do Ateliê</label><input type="text" value={slug} onChange={(event) => setSlug(event.target.value)} className="input-field" placeholder="ex: doce-arte" id="admin-slug" autoComplete="username" /></div>
            <div><label htmlFor="admin-password" className="block text-sm font-medium mb-1.5 text-white/80">Senha de Acesso</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleLogin()} className="input-field" placeholder="Sua senha" id="admin-password" autoComplete="current-password" /></div>
            {authError && <div role="alert" className="p-3 rounded-lg bg-error/15 text-error text-xs border border-error/20 flex items-center gap-2"><AlertCircle aria-hidden="true" className="w-4 h-4 flex-shrink-0" />{authError}</div>}
            <button onClick={handleLogin} className="btn-primary w-full py-3 mt-2 text-sm font-semibold flex items-center justify-center gap-2" id="admin-login-btn">Entrar no Painel</button>
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
      {toast && <div role="status" aria-live="polite" aria-atomic="true" className="fixed top-4 right-4 z-50 glass-card px-4 py-3 border-l-4 border-brand-primary shadow-xl flex items-center gap-3 animate-fade-in"><CheckCircle2 aria-hidden="true" className="w-5 h-5 text-brand-primary" /><span className="text-sm font-medium text-white">{toast}</span></div>}
      <header className="md:hidden glass-card rounded-none border-b border-white/10 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button aria-label={mobileDrawerOpen ? "Fechar menu do painel" : "Abrir menu do painel"} aria-expanded={mobileDrawerOpen} aria-controls="admin-mobile-drawer" onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"><MenuIcon aria-hidden="true" className="w-6 h-6" /></button>
          <div><h1 className="font-bold text-sm truncate max-w-[180px]">{tenantName}</h1><p className="text-[11px] text-white/50 capitalize">{sectionsList.find((item) => item.id === section)?.label}</p></div>
        </div>
        <a href={`/${tenantSlug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-primary hover:underline flex items-center gap-1 font-medium">Simulador <ExternalLink aria-hidden="true" className="w-3 h-3" /></a>
      </header>
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" onClick={() => setMobileDrawerOpen(false)} />
          <aside id="admin-mobile-drawer" ref={mobileDrawerRef} role="dialog" aria-modal="true" aria-label="Navegação do painel" tabIndex={-1} className="relative w-72 bg-surface-900 border-r border-white/10 p-5 flex flex-col justify-between z-10 animate-fade-in">
            <div>
              <div className="flex items-center justify-between mb-6"><div><h2 className="font-bold text-base">{tenantName}</h2><p className="text-xs text-white/50">CMS Painel Admin</p></div><button aria-label="Fechar menu do painel" onClick={() => setMobileDrawerOpen(false)} className="p-1 rounded-lg hover:bg-white/10"><X aria-hidden="true" className="w-5 h-5" /></button></div>
              <nav aria-label="Seções do painel" className="space-y-1">{sectionsList.map((item) => { const Icon = item.icon; const active = section === item.id; return <button key={item.id} aria-current={active ? "page" : undefined} onClick={() => { setSection(item.id); setMobileDrawerOpen(false); }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left", active ? "bg-brand-primary text-white shadow-lg" : "text-white/70 hover:bg-white/5")}><Icon aria-hidden="true" className="w-5 h-5" />{item.label}</button>; })}</nav>
            </div>
            <div className="pt-4 border-t border-white/10 space-y-2"><a href={`/${tenantSlug}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors"><ExternalLink aria-hidden="true" className="w-4 h-4 text-brand-primary" />Ver Simulador</a><button onClick={() => { void handleLogout(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-error/80 hover:text-error rounded-lg hover:bg-error/10 transition-colors"><LogOut aria-hidden="true" className="w-4 h-4" />Sair do Painel</button></div>
          </aside>
        </div>
      )}
      <aside className="hidden md:flex w-64 bg-surface-900 border-r border-white/10 p-5 flex-col justify-between flex-shrink-0 min-h-dvh">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2"><div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30"><Sparkles aria-hidden="true" className="w-5 h-5 text-brand-primary" /></div><div><h2 className="font-bold text-base text-white truncate max-w-[140px]">{tenantName}</h2><p className="text-[11px] text-white/40">Painel Admin</p></div></div>
          <nav aria-label="Seções do painel" className="space-y-1">{sectionsList.map((item) => { const Icon = item.icon; const active = section === item.id; return <button key={item.id} aria-current={active ? "page" : undefined} onClick={() => setSection(item.id)} className={cn("w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-left", active ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30 font-semibold" : "text-white/60 hover:text-white hover:bg-white/5")}><Icon aria-hidden="true" className="w-4 h-4" />{item.label}</button>; })}</nav>
        </div>
        <div className="pt-4 border-t border-white/10 space-y-1"><a href={`/${tenantSlug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors font-medium"><ExternalLink aria-hidden="true" className="w-4 h-4 text-brand-primary" />Ver Simulador</a><button onClick={() => { void handleLogout(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-error/80 hover:text-error rounded-lg hover:bg-error/10 transition-colors font-medium"><LogOut aria-hidden="true" className="w-4 h-4" />Sair</button></div>
      </aside>
      <main className="flex-1 p-4 sm:p-8 max-w-6xl overflow-x-hidden min-w-0">
        {section === "orders" && <AdminOrdersSection tenantId={tenantId} showToast={showToast} />}
        {section === "menu" && <AdminMenuSection tenantId={tenantId} showToast={showToast} />}
        {section === "calendar" && <AdminCalendarSection tenantId={tenantId} showToast={showToast} />}
        {section === "brand" && <AdminBrandSection tenantId={tenantId} showToast={showToast} />}
        {section === "features" && <AdminFeaturesSection tenantId={tenantId} showToast={showToast} />}
      </main>
    </div>
  );
}

function AdminMenuSection({ tenantId, showToast }: { tenantId: string; showToast: (message: string) => void }) {
  const [menu, setMenu] = useState<MenuData>({ sizes: [], flavors: [], addons: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MenuTab>("sizes");
  const [editModal, setEditModal] = useState<MenuEditModal | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; type: string; id: string; name: string }>({ isOpen: false, type: "", id: "", name: "" });
  const editDialogTitleId = useId();
  const editDialogRef = useModalFocus<HTMLFormElement>(Boolean(editModal), () => setEditModal(null));
  const fetchMenu = useCallback(async () => { try { const response = await fetch(`/api/admin/menu?tenantId=${tenantId}`); if (response.ok) setMenu(await response.json()); } catch { showToast("Erro ao carregar cardapio"); } finally { setLoading(false); } }, [tenantId, showToast]);
  useEffect(() => { async function loadMenu() { try { const response = await fetch(`/api/admin/menu?tenantId=${tenantId}`); if (response.ok) setMenu(await response.json()); } catch { showToast("Erro ao carregar cardapio"); } finally { setLoading(false); } } void loadMenu(); }, [tenantId, showToast]);
  const sanitizeItemForApi = (modal: MenuEditModal, isNew: boolean) => { switch (modal.type) { case "size": { const item = modal.item; const payload: Record<string, unknown> = { name: item.name, servings: item.servings, weightKg: Number(item.weightKg) || 0, basePrice: Number(item.basePrice) || 0, maxFillings: Number(item.maxFillings) || 1, sortOrder: Number(item.sortOrder) || 0, active: item.active !== false }; if (!isNew) payload.id = item.id; return payload; } case "flavor": { const item = modal.item; const payload: Record<string, unknown> = { name: item.name, type: item.type || "RECHEIO", additionalPrice: Number(item.additionalPrice) || 0, isSpecial: Boolean(item.isSpecial), imageUrl: item.imageUrl || "", active: item.active !== false, sortOrder: Number(item.sortOrder) || 0 }; if (!isNew) payload.id = item.id; return payload; } case "addon": { const item = modal.item; const payload: Record<string, unknown> = { name: item.name, description: item.description || "", price: Number(item.price) || 0, imageUrl: item.imageUrl || "", active: item.active !== false, sortOrder: Number(item.sortOrder) || 0 }; if (!isNew) payload.id = item.id; return payload; } } };
  const handleSaveItem = async (event: React.FormEvent) => { event.preventDefault(); if (!editModal) return; const isNew = !editModal.item.id; const sanitized = sanitizeItemForApi(editModal, isNew); const method = isNew ? "POST" : "PUT"; const body = isNew ? { tenantId, itemType: editModal.type, ...sanitized } : { itemType: editModal.type, ...sanitized }; try { const response = await fetch("/api/admin/menu", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (response.ok) { showToast(isNew ? "Item criado com sucesso!" : "Item atualizado com sucesso!"); setEditModal(null); void fetchMenu(); } else { const errorData = await response.json().catch(() => ({})); showToast(errorData.error || `Erro ao salvar (${response.status})`); } } catch { showToast("Erro ao salvar item"); } };
  const requestDeleteItem = (type: string, id: string, name: string) => setConfirmDialog({ isOpen: true, type, id, name });
  const executeDeleteItem = async () => { const { type, id } = confirmDialog; setConfirmDialog({ isOpen: false, type: "", id: "", name: "" }); try { const response = await fetch(`/api/admin/menu?id=${id}&type=${type}`, { method: "DELETE" }); if (response.ok) { showToast("Item excluido com sucesso!"); void fetchMenu(); } else showToast("Erro ao excluir item"); } catch { showToast("Erro ao excluir item"); } };
  const menuTabs: Array<{ id: MenuTab; label: string }> = [{ id: "sizes", label: `Tamanhos (${menu.sizes.length})` }, { id: "flavors", label: `Massas & Recheios (${menu.flavors.length})` }, { id: "addons", label: `Adicionais (${menu.addons.length})` }];

  return <div className="space-y-6"><div><h1 className="text-xl sm:text-2xl font-bold">Gestao do Cardapio</h1><p className="text-white/50 text-xs sm:text-sm">Configure os tamanhos, massas, recheios e adicionais oferecidos</p></div><div role="tablist" aria-label="Categorias do cardápio" className="flex border-b border-white/10 gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">{menuTabs.map((tab) => <button role="tab" aria-selected={activeTab === tab.id} key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("pb-3 text-xs sm:text-sm font-semibold transition-all relative flex-shrink-0", activeTab === tab.id ? "text-brand-primary" : "text-white/50 hover:text-white")}>{tab.label}{activeTab === tab.id && <span aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" />}</button>)}</div>{loading ? <div className="glass-card p-12 text-center text-white/50" role="status" aria-live="polite">Carregando cardapio...</div> : <div>{activeTab === "sizes" && <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><p className="text-xs text-white/50">Defina fatias, peso, preco base e limite de recheios</p><button onClick={() => setEditModal({ type: "size", item: { name: "", servings: "10-15 pessoas", weightKg: 1.5, basePrice: 120, maxFillings: 2, sortOrder: menu.sizes.length, active: true } })} className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3 self-start sm:self-auto"><Plus aria-hidden="true" className="w-4 h-4" /> Novo Tamanho</button></div><div className="grid gap-3">{menu.sizes.map((size) => <div key={size.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"><div className="space-y-1"><div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-white text-base">{size.name}</span><span className="badge badge-primary text-[11px]">{size.servings}</span><span className="px-2 py-0.5 rounded-full bg-white/5 text-white/70 text-[11px]">Max {size.maxFillings} recheios</span></div><p className="text-xs text-white/50">Peso estimado: {size.weightKg} kg</p></div><div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5"><span className="text-base font-bold text-white">{formatCurrency(size.basePrice)}</span><div className="flex items-center gap-2"><button aria-label={`Editar ${size.name}`} onClick={() => setEditModal({ type: "size", item: size })} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"><Edit3 aria-hidden="true" className="w-4 h-4" /></button><button aria-label={`Excluir ${size.name}`} onClick={() => requestDeleteItem("size", size.id, size.name)} className="p-2 rounded-lg bg-error/10 hover:bg-error/20 text-error"><Trash2 aria-hidden="true" className="w-4 h-4" /></button></div></div></div>)}</div></div>}{activeTab === "flavors" && <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><p className="text-xs text-white/50">Cadastre massas e recheios com imagem e valores adicionais</p><button onClick={() => setEditModal({ type: "flavor", item: { name: "", type: "RECHEIO", additionalPrice: 0, isSpecial: false, imageUrl: "", active: true, sortOrder: menu.flavors.length } })} className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3 self-start sm:self-auto"><Plus aria-hidden="true" className="w-4 h-4" /> Novo Sabor</button></div><div className="grid sm:grid-cols-2 gap-3">{menu.flavors.map((flavor) => <div key={flavor.id} className="glass-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"><div className="flex items-center gap-3 min-w-0">{flavor.imageUrl ? <img src={flavor.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><UtensilsCrossed aria-hidden="true" className="w-5 h-5 text-white/30" /></div>}<div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 flex-wrap"><span className="font-semibold text-sm truncate text-white">{flavor.name}</span>{flavor.isSpecial && <span className="badge badge-special text-[9px]">Especial</span>}</div><p className="text-xs text-white/40">{flavor.type === "MASSA" ? "Massa" : "Recheio"}</p></div></div><div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5"><span className="text-xs font-semibold text-brand-secondary">{flavor.additionalPrice > 0 ? `+${formatCurrency(flavor.additionalPrice)}` : "Grátis"}</span><div className="flex items-center gap-1.5"><button aria-label={`Editar ${flavor.name}`} onClick={() => setEditModal({ type: "flavor", item: flavor })} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80"><Edit3 aria-hidden="true" className="w-3.5 h-3.5" /></button><button aria-label={`Excluir ${flavor.name}`} onClick={() => requestDeleteItem("flavor", flavor.id, flavor.name)} className="p-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error"><Trash2 aria-hidden="true" className="w-3.5 h-3.5" /></button></div></div></div>)}</div></div>}{activeTab === "addons" && <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><p className="text-xs text-white/50">Itens adicionais opcionais (Toppers, embalagens, velas)</p><button onClick={() => setEditModal({ type: "addon", item: { name: "", description: "", price: 20, imageUrl: "", active: true, sortOrder: menu.addons.length } })} className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3 self-start sm:self-auto"><Plus aria-hidden="true" className="w-4 h-4" /> Novo Adicional</button></div><div className="grid gap-3">{menu.addons.map((addon) => <div key={addon.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"><div className="flex items-center gap-3">{addon.imageUrl ? <img src={addon.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><Sparkles aria-hidden="true" className="w-5 h-5 text-brand-primary/60" /></div>}<div><h4 className="font-bold text-sm text-white">{addon.name}</h4>{addon.description && <p className="text-xs text-white/50">{addon.description}</p>}</div></div><div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5"><span className="text-sm font-bold text-white">+{formatCurrency(addon.price)}</span><div className="flex items-center gap-1.5"><button aria-label={`Editar ${addon.name}`} onClick={() => setEditModal({ type: "addon", item: addon })} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><Edit3 aria-hidden="true" className="w-4 h-4 text-white/70" /></button><button aria-label={`Excluir ${addon.name}`} onClick={() => requestDeleteItem("addon", addon.id, addon.name)} className="p-2 rounded-lg bg-error/10 hover:bg-error/20 text-error"><Trash2 aria-hidden="true" className="w-4 h-4" /></button></div></div></div>)}</div></div>}</div>}{editModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"><form ref={editDialogRef} role="dialog" aria-modal="true" aria-labelledby={editDialogTitleId} tabIndex={-1} onSubmit={handleSaveItem} className="glass-card p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto space-y-4 border border-white/20"><div className="flex justify-between items-center"><h3 id={editDialogTitleId} className="font-bold text-lg text-white">{editModal.item.id ? "Editar Item" : "Criar Novo Item"}</h3><button aria-label="Fechar edição do item" type="button" onClick={() => setEditModal(null)} className="p-1 rounded-lg hover:bg-white/10"><X aria-hidden="true" className="w-5 h-5" /></button></div>{editModal.type === "size" && <div className="space-y-3"><div><label className="block text-xs font-medium text-white/70 mb-1">Nome do Tamanho</label><input type="text" required value={editModal.item.name} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, name: event.target.value } })} className="input-field" placeholder="Ex: Medio" /></div><div><label className="block text-xs font-medium text-white/70 mb-1">Rendimento / Pessoas</label><input type="text" required value={editModal.item.servings} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, servings: event.target.value } })} className="input-field" placeholder="Ex: 20-25 pessoas" /></div><div className="grid grid-cols-2 gap-3"><CurrencyInput label="Preco Base (R$)" value={editModal.item.basePrice} onChange={(value) => setEditModal({ ...editModal, item: { ...editModal.item, basePrice: value } })} required /><div><label className="block text-xs font-medium text-white/70 mb-1">Max Recheios Permitidos</label><input type="number" min="1" max="10" required value={editModal.item.maxFillings} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, maxFillings: parseInt(event.target.value) || 1 } })} className="input-field" /></div></div></div>}{editModal.type === "flavor" && <div className="space-y-3"><div><label className="block text-xs font-medium text-white/70 mb-1">Nome do Sabor</label><input type="text" required value={editModal.item.name} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, name: event.target.value } })} className="input-field" placeholder="Ex: Ninho com Nutella" /></div><ImageUploaderDropzone label="Imagem Ilustrativa do Sabor" value={editModal.item.imageUrl || ""} onChange={(url) => setEditModal({ ...editModal, item: { ...editModal.item, imageUrl: url } })} aspect="square" /><CustomSelect label="Categoria" value={editModal.item.type} onChange={(value) => setEditModal({ ...editModal, item: { ...editModal.item, type: value } })} options={[{ value: "MASSA", label: "Massa do Bolo" }, { value: "RECHEIO", label: "Recheio do Bolo" }]} /><div className="grid grid-cols-2 gap-3 items-end"><CurrencyInput label="Valor Adicional (R$)" value={editModal.item.additionalPrice} onChange={(value) => setEditModal({ ...editModal, item: { ...editModal.item, additionalPrice: value } })} /><div><span className="block text-xs font-medium text-white/70 mb-1">Destaque</span><StyledCheckbox checked={editModal.item.isSpecial} onChange={(checked) => setEditModal({ ...editModal, item: { ...editModal.item, isSpecial: checked } })} label="Sabor Especial" /></div></div></div>}{editModal.type === "addon" && <div className="space-y-3"><div><label className="block text-xs font-medium text-white/70 mb-1">Nome do Adicional</label><input type="text" required value={editModal.item.name} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, name: event.target.value } })} className="input-field" placeholder="Ex: Topo de Bolo Personalizado" /></div><ImageUploaderDropzone label="Imagem do Adicional (Opcional)" value={editModal.item.imageUrl || ""} onChange={(url) => setEditModal({ ...editModal, item: { ...editModal.item, imageUrl: url } })} aspect="square" /><div><label className="block text-xs font-medium text-white/70 mb-1">Descricao</label><input type="text" value={editModal.item.description} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, description: event.target.value } })} className="input-field" placeholder="Ex: Topo em acrilico com nome" /></div><CurrencyInput label="Preco (R$)" value={editModal.item.price} onChange={(value) => setEditModal({ ...editModal, item: { ...editModal.item, price: value } })} required /></div>}<div className="pt-2 flex justify-end gap-2"><button type="button" onClick={() => setEditModal(null)} className="btn-secondary text-xs">Cancelar</button><button type="submit" className="btn-primary text-xs font-semibold">Salvar Alteracoes</button></div></form></div>}<ConfirmModal isOpen={confirmDialog.isOpen} title="Excluir Item" message={`Tem certeza que deseja excluir "${confirmDialog.name}"? Esta acao nao pode ser desfeita.`} confirmLabel="Sim, Excluir" cancelLabel="Cancelar" variant="danger" onConfirm={executeDeleteItem} onCancel={() => setConfirmDialog({ isOpen: false, type: "", id: "", name: "" })} /></div>;
}
