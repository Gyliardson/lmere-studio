"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Lock,
  LogOut,
  Menu as MenuIcon,
  Palette,
  Settings,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AdminCalendarSection } from "./calendar/AdminCalendarSection";
import { useModalFocus } from "./components/AdminControls";
import { AdminMenuSection } from "./menu/AdminMenuSection";
import { AdminOrdersSection } from "./orders/AdminOrdersSection";
import { AdminBrandSection, AdminFeaturesSection } from "./settings/AdminSettingsSections";

type AdminSection = "orders" | "menu" | "calendar" | "brand" | "features";

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
        // Login remains available when session validation is unreachable.
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
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-950 text-white/50 text-sm" role="status" aria-live="polite" aria-busy="true">
        Validando sessão...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4 bg-surface-950">
        <div className="glass-card p-8 w-full max-w-sm border border-white/10 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 flex items-center justify-center mx-auto mb-4 border border-brand-primary/30">
              <Lock aria-hidden="true" className="w-8 h-8 text-brand-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white">Painel Admin</h1>
            <p className="text-white/50 text-sm mt-1">L&apos;Mere Studio CMS</p>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="admin-slug" className="block text-sm font-medium mb-1.5 text-white/80">Slug do Ateliê</label>
              <input type="text" value={slug} onChange={(event) => setSlug(event.target.value)} className="input-field" placeholder="ex: doce-arte" id="admin-slug" autoComplete="username" />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium mb-1.5 text-white/80">Senha de Acesso</label>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleLogin()} className="input-field" placeholder="Sua senha" id="admin-password" autoComplete="current-password" />
            </div>
            {authError && (
              <div role="alert" className="p-3 rounded-lg bg-error/15 text-error text-xs border border-error/20 flex items-center gap-2">
                <AlertCircle aria-hidden="true" className="w-4 h-4 flex-shrink-0" />
                {authError}
              </div>
            )}
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
      {toast && (
        <div role="status" aria-live="polite" aria-atomic="true" className="fixed top-4 right-4 z-50 glass-card px-4 py-3 border-l-4 border-brand-primary shadow-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-brand-primary" />
          <span className="text-sm font-medium text-white">{toast}</span>
        </div>
      )}

      <header className="md:hidden glass-card rounded-none border-b border-white/10 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button aria-label={mobileDrawerOpen ? "Fechar menu do painel" : "Abrir menu do painel"} aria-expanded={mobileDrawerOpen} aria-controls="admin-mobile-drawer" onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white">
            <MenuIcon aria-hidden="true" className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-bold text-sm truncate max-w-[180px]">{tenantName}</h1>
            <p className="text-[11px] text-white/50 capitalize">{sectionsList.find((item) => item.id === section)?.label}</p>
          </div>
        </div>
        <a href={`/${tenantSlug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-primary hover:underline flex items-center gap-1 font-medium">
          Simulador <ExternalLink aria-hidden="true" className="w-3 h-3" />
        </a>
      </header>

      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" onClick={() => setMobileDrawerOpen(false)} />
          <aside id="admin-mobile-drawer" ref={mobileDrawerRef} role="dialog" aria-modal="true" aria-label="Navegação do painel" tabIndex={-1} className="relative w-72 bg-surface-900 border-r border-white/10 p-5 flex flex-col justify-between z-10 animate-fade-in">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div><h2 className="font-bold text-base">{tenantName}</h2><p className="text-xs text-white/50">CMS Painel Admin</p></div>
                <button aria-label="Fechar menu do painel" onClick={() => setMobileDrawerOpen(false)} className="p-1 rounded-lg hover:bg-white/10"><X aria-hidden="true" className="w-5 h-5" /></button>
              </div>
              <nav aria-label="Seções do painel" className="space-y-1">
                {sectionsList.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button key={item.id} aria-current={active ? "page" : undefined} onClick={() => { setSection(item.id); setMobileDrawerOpen(false); }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left", active ? "bg-brand-primary text-white shadow-lg" : "text-white/70 hover:bg-white/5")}>
                      <Icon aria-hidden="true" className="w-5 h-5" />{item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="pt-4 border-t border-white/10 space-y-2">
              <a href={`/${tenantSlug}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors"><ExternalLink aria-hidden="true" className="w-4 h-4 text-brand-primary" />Ver Simulador</a>
              <button onClick={() => { void handleLogout(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-error/80 hover:text-error rounded-lg hover:bg-error/10 transition-colors"><LogOut aria-hidden="true" className="w-4 h-4" />Sair do Painel</button>
            </div>
          </aside>
        </div>
      )}

      <aside className="hidden md:flex w-64 bg-surface-900 border-r border-white/10 p-5 flex-col justify-between flex-shrink-0 min-h-dvh">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30"><Sparkles aria-hidden="true" className="w-5 h-5 text-brand-primary" /></div>
            <div><h2 className="font-bold text-base text-white truncate max-w-[140px]">{tenantName}</h2><p className="text-[11px] text-white/40">Painel Admin</p></div>
          </div>
          <nav aria-label="Seções do painel" className="space-y-1">
            {sectionsList.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button key={item.id} aria-current={active ? "page" : undefined} onClick={() => setSection(item.id)} className={cn("w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-left", active ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30 font-semibold" : "text-white/60 hover:text-white hover:bg-white/5")}>
                  <Icon aria-hidden="true" className="w-4 h-4" />{item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="pt-4 border-t border-white/10 space-y-1">
          <a href={`/${tenantSlug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors font-medium"><ExternalLink aria-hidden="true" className="w-4 h-4 text-brand-primary" />Ver Simulador</a>
          <button onClick={() => { void handleLogout(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-error/80 hover:text-error rounded-lg hover:bg-error/10 transition-colors font-medium"><LogOut aria-hidden="true" className="w-4 h-4" />Sair</button>
        </div>
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
