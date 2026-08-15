"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Save, Sparkles } from "lucide-react";

import { COLOR_PRESETS, type ColorPreset, type FeaturesConfig } from "@/lib/types";
import { cn, formatPhoneBR } from "@/lib/utils";
import { ImageUploaderDropzone } from "../components/AdminControls";

export function AdminBrandSection({ tenantId, showToast }: { tenantId: string; showToast: (message: string) => void }) {
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
    shadowColor: "#8B5CF6",
    textColor: "#FFFFFF",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/admin/settings?tenantId=${tenantId}`);
        if (response.ok) {
          const data = await response.json();
          const settings = data.settings;
          setForm({
            name: settings.name || "",
            whatsapp: settings.whatsapp || "",
            pixKey: settings.pixKey || "",
            logoUrl: settings.logoUrl || "",
            bannerUrl: settings.bannerUrl || "",
            primaryColor: settings.primaryColor || "#8B5CF6",
            secondaryColor: settings.secondaryColor || "#EC4899",
            backgroundColor: settings.backgroundColor || "#0F0A1A",
            buttonColor: settings.buttonColor || "#8B5CF6",
            shadowColor: settings.shadowColor || settings.primaryColor || "#8B5CF6",
            textColor: settings.textColor || "#FFFFFF",
          });
        }
      } catch {
        showToast("Erro ao carregar marca");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [tenantId, showToast]);

  const applyPreset = (preset: ColorPreset) => {
    setForm((current) => ({
      ...current,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      backgroundColor: preset.backgroundColor,
      buttonColor: preset.buttonColor,
      shadowColor: preset.shadowColor || preset.primaryColor,
    }));
    showToast(`Paleta "${preset.name}" aplicada!`);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, ...form }),
      });
      if (response.ok) showToast("Estilo e Marca salvos com sucesso!");
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
        <div className="glass-card p-12 text-center text-white/50" role="status" aria-live="polite">Carregando marca...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2"><Sparkles aria-hidden="true" className="w-5 h-5 text-brand-primary" /><h2 className="font-bold text-base">Paletas de Cores Prontas</h2></div>
            <p className="text-xs text-white/50">Clique em uma paleta pronta para aplicar o tema no seu simulador</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
              {COLOR_PRESETS.map((preset) => (
                <button key={preset.id} type="button" onClick={() => applyPreset(preset)} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-brand-primary/50 transition-all text-left space-y-2 group">
                  <div className="flex items-center gap-1.5" aria-hidden="true"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primaryColor }} /><div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.secondaryColor }} /><div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.backgroundColor }} /></div>
                  <p className="text-xs font-semibold text-white/80 group-hover:text-white truncate">{preset.name}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Cores Personalizadas</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {([ ["primaryColor", "Cor Primaria"], ["secondaryColor", "Cor Secundaria"], ["backgroundColor", "Cor de Fundo"], ["buttonColor", "Cor dos Botoes"], ["shadowColor", "Cor da Sombra / Brilho"], ["textColor", "Cor do Texto"] ] as const).map(([key, label]) => (
                <div key={key}>
                  <span className="block text-xs font-medium text-white/70 mb-1">{label}</span>
                  <div className="flex items-center gap-2">
                    <input aria-label={`${label} — seletor`} type="color" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent" />
                    <input aria-label={`${label} — hexadecimal`} type="text" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="input-field text-xs font-mono" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 rounded-xl border border-white/10 space-y-2" style={{ backgroundColor: form.backgroundColor }}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/60 block">Pré-visualização do Tema</span>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm font-bold" style={{ color: form.primaryColor }}>{form.name || "Seu Ateliê"} - Título em Destaque</span>
                <button type="button" className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all" style={{ background: `linear-gradient(135deg, ${form.buttonColor}, ${form.secondaryColor})`, boxShadow: `0 4px 16px ${form.shadowColor}88` }}>Botão de Exemplo</button>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Imagens do Ateliê (Logo & Banner)</h2>
            <div className="grid sm:grid-cols-2 gap-4 items-stretch">
              <ImageUploaderDropzone label="Logo do Atelie" value={form.logoUrl} onChange={(url) => setForm({ ...form, logoUrl: url })} aspect="square" />
              <ImageUploaderDropzone label="Banner de Capa" value={form.bannerUrl} onChange={(url) => setForm({ ...form, bannerUrl: url })} aspect="banner" />
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Informações Gerais</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label htmlFor="admin-brand-name" className="block text-xs font-medium text-white/70 mb-1">Nome do Ateliê</label><input id="admin-brand-name" type="text" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="input-field" /></div>
              <div><label htmlFor="admin-brand-whatsapp" className="block text-xs font-medium text-white/70 mb-1">WhatsApp (com DDD)</label><input id="admin-brand-whatsapp" type="text" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: formatPhoneBR(event.target.value) })} className="input-field" placeholder="Ex: (11) 99999-9999" /></div>
              <div className="sm:col-span-2"><label htmlFor="admin-brand-pix" className="block text-xs font-medium text-white/70 mb-1">Chave PIX (E-mail, CPF, Telefone ou Aleatória)</label><input id="admin-brand-pix" type="text" value={form.pixKey} onChange={(event) => setForm({ ...form, pixKey: event.target.value })} className="input-field" /></div>
            </div>
          </div>
          <button type="submit" className="btn-primary py-3 px-6 text-sm font-semibold flex items-center gap-2"><Save aria-hidden="true" className="w-4 h-4" /> Salvar Marca & Estilo</button>
        </form>
      )}
    </div>
  );
}

export function AdminFeaturesSection({ tenantId, showToast }: { tenantId: string; showToast: (message: string) => void }) {
  const [config, setConfig] = useState<FeaturesConfig>({ allow_photo_upload: true, deposit_mode: "50_percent", enable_delivery_step: false, custom_fields: [] });
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(5);
  const [minLeadDays, setMinLeadDays] = useState(3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/admin/settings?tenantId=${tenantId}`);
        if (response.ok) {
          const data = await response.json();
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
    void load();
  }, [tenantId, showToast]);

  const handleSave = async () => {
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, featuresConfig: config, maxOrdersPerDay, minLeadDays }),
      });
      if (response.ok) showToast("Funcionalidades salvas com sucesso!");
    } catch {
      showToast("Erro ao salvar funcionalidades");
    }
  };

  const depositModes: Array<{ id: FeaturesConfig["deposit_mode"]; title: string; desc: string }> = [
    { id: "50_percent", title: "Sinal de 50%", desc: "Cliente paga metade para confirmar e metade na entrega" },
    { id: "100_percent", title: "Pagamento Integral (100%)", desc: "Cliente paga o valor total adiantado" },
    { id: "quote_only", title: "Apenas Orçamento (Sem Pagamento)", desc: "Gera o resumo sem exibir valor de entrada ou chave PIX" },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl sm:text-2xl font-bold">Funcionalidades & Regras do Ateliê</h1><p className="text-white/50 text-xs sm:text-sm">Configure o comportamento do simulador de encomendas</p></div>
      {loading ? (
        <div className="glass-card p-12 text-center text-white/50" role="status" aria-live="polite">Carregando regras...</div>
      ) : (
        <div className="space-y-6 max-w-2xl">
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Ativadores Gerais</h2>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div><p className="font-semibold text-sm">Upload de Foto de Referência</p><p className="text-xs text-white/50">Permite que o cliente envie fotos do modelo do bolo</p></div>
              <button aria-pressed={config.allow_photo_upload} onClick={() => setConfig({ ...config, allow_photo_upload: !config.allow_photo_upload })} className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-all", config.allow_photo_upload ? "bg-emerald-500 text-white" : "bg-white/10 text-white/50")}>{config.allow_photo_upload ? "Ativado" : "Desativado"}</button>
            </div>
          </div>
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Limites da Agenda</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label htmlFor="admin-max-orders" className="block text-xs font-medium text-white/70 mb-1">Máximo de Pedidos por Dia</label><input id="admin-max-orders" type="number" min="1" max="50" value={maxOrdersPerDay} onChange={(event) => setMaxOrdersPerDay(parseInt(event.target.value) || 1)} className="input-field" /></div>
              <div><label htmlFor="admin-min-lead" className="block text-xs font-medium text-white/70 mb-1">Antecedência Mínima (Dias)</label><input id="admin-min-lead" type="number" min="1" max="30" value={minLeadDays} onChange={(event) => setMinLeadDays(parseInt(event.target.value) || 1)} className="input-field" /></div>
            </div>
          </div>
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-bold text-base">Modo de Pagamento de Sinal</h2>
            <div className="grid gap-2">
              {depositModes.map((mode) => <button key={mode.id} type="button" aria-pressed={config.deposit_mode === mode.id} onClick={() => setConfig({ ...config, deposit_mode: mode.id })} className={cn("p-3.5 rounded-xl border text-left transition-all", config.deposit_mode === mode.id ? "border-brand-primary bg-brand-primary/10" : "border-white/10 hover:bg-white/5")}><p className="font-semibold text-sm">{mode.title}</p><p className="text-xs text-white/50 mt-0.5">{mode.desc}</p></button>)}
            </div>
          </div>
          <button onClick={handleSave} className="btn-primary py-3 px-6 text-sm font-semibold flex items-center gap-2"><Save aria-hidden="true" className="w-4 h-4" /> Salvar Funcionalidades</button>
        </div>
      )}
    </div>
  );
}
