"use client";

import { useState, useEffect, useCallback } from "react";
import type { TenantFullData, SimulatorState, CakeFlavorData, AddonData, CakeSizeData, CustomFieldData } from "@/lib/types";
import { calculateOrderTotal, calculateDeposit, formatCurrency } from "@/lib/pricing";
import { ORDER_TEXT_LIMITS } from "@/lib/order-validation";
import { buildWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp";
import { copyToClipboard, cn, getDateString, isDateBlocked, getDaysInMonth, getFirstDayOfMonth, hexToHsl, hexToRgb, formatPhoneBR, isValidPhoneBR } from "@/lib/utils";
import {
  imageUploadHelpText,
  SUPPORTED_IMAGE_MIME_TYPES,
  validateImageFileMetadata,
  validateImageReference,
} from "@/lib/image-reference";
import {
  Calendar, ChevronLeft, ChevronRight, Cake, Layers, Palette, Upload,
  ClipboardCheck, MessageCircle, Copy, Check, Star, Plus,
  ArrowLeft, ArrowRight, Phone, User, FileText, X, Sparkles, Weight,
  Users, ShieldCheck, Ban
} from "lucide-react";

const TOTAL_STEPS = 5;
const CUSTOM_TEXT_MAX = 500;

export function SimulatorClient({ slug }: { slug: string }) {
  const [data, setData] = useState<TenantFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [state, setState] = useState<SimulatorState>({
    step: 1,
    eventDate: null,
    cakeSize: null,
    dough: null,
    fillings: [],
    addons: [],
    referenceImage: null,
    cakeMessage: "",
    details: "",
    customerName: "",
    customerPhone: "",
    customFieldAnswers: {},
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/tenants/${slug}`);
        if (!res.ok) throw new Error("O ateliê solicitado não existe ou está indisponível.");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar o ateliê.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const goNext = () => setState((s) => ({ ...s, step: Math.min(s.step + 1, TOTAL_STEPS) }));
  const goBack = () => setState((s) => ({ ...s, step: Math.max(s.step - 1, 1) }));

  const customFieldsComplete = (data?.customFields ?? []).every(
    (field) => !field.required || Boolean(state.customFieldAnswers?.[field.id]?.trim())
  );

  const canProceed = (): boolean => {
    switch (state.step) {
      case 1: return !!state.eventDate;
      case 2: return !!state.cakeSize;
      case 3: return !!state.dough && state.fillings.length > 0;
      case 4: return customFieldsComplete;
      case 5: return !!state.customerName?.trim()
        && state.customerName.trim().length <= ORDER_TEXT_LIMITS.customerName
        && isValidPhoneBR(state.customerPhone)
        && customFieldsComplete;
      default: return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" role="status" aria-live="polite" aria-busy="true">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <p className="text-white/60 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="glass-card p-8 text-center max-w-md" role="alert">
          <Ban className="w-12 h-12 text-error mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-xl font-bold mb-2">Ateliê não encontrado</h1>
          <p className="text-white/60 text-sm">{error || "O ateliê solicitado não existe ou está indisponível."}</p>
        </div>
      </div>
    );
  }

  const { tenant, sizes, doughs, fillings, addons, customFields, blockedDates, workSchedule } = data;

  const total = calculateOrderTotal(state.cakeSize, state.dough, state.fillings, state.addons);
  const deposit = calculateDeposit(total, tenant.featuresConfig.deposit_mode);

  const blockedDateStrings = blockedDates.map((b) => b.date);
  const closedDays = workSchedule.filter((w) => !w.isOpen).map((w) => w.dayOfWeek);

  const stepIcons = [Calendar, Cake, Palette, Upload, ClipboardCheck];
  const stepLabels = ["Data", "Tamanho", "Sabores", "Detalhes", "Resumo"];

  const shadowVal = (tenant as unknown as { shadowColor?: string }).shadowColor || tenant.primaryColor || "#8B5CF6";
  const primaryVal = tenant.primaryColor || "#8B5CF6";
  const secondaryVal = tenant.secondaryColor || "#EC4899";
  const buttonVal = tenant.buttonColor || primaryVal;

  const style = {
    "--brand-primary": hexToHsl(primaryVal),
    "--brand-secondary": hexToHsl(secondaryVal),
    "--brand-bg": hexToHsl(tenant.backgroundColor || "#0F0A1A"),
    "--tenant-primary": primaryVal,
    "--tenant-secondary": secondaryVal,
    "--tenant-bg": tenant.backgroundColor || "#0F0A1A",
    "--tenant-button": buttonVal,
    "--tenant-shadow": shadowVal,
    "--tenant-text": tenant.textColor || "#FFFFFF",
    "--color-brand-primary": primaryVal,
    "--color-brand-secondary": secondaryVal,
    "--color-brand-bg": tenant.backgroundColor || "#0F0A1A",
    "--color-brand-button": buttonVal,
    "--color-brand-shadow": shadowVal,
    "--color-brand-text": tenant.textColor || "#FFFFFF",
    "--tenant-primary-rgb": hexToRgb(primaryVal),
    "--tenant-secondary-rgb": hexToRgb(secondaryVal),
    "--tenant-button-rgb": hexToRgb(buttonVal),
    "--tenant-shadow-rgb": hexToRgb(shadowVal),
    "--color-brand-primary-rgb": hexToRgb(primaryVal),
    "--color-brand-secondary-rgb": hexToRgb(secondaryVal),
    "--color-brand-button-rgb": hexToRgb(buttonVal),
    "--color-brand-shadow-rgb": hexToRgb(shadowVal),
  } as React.CSSProperties;

  return (
    <div
      style={{
        ...style,
        backgroundColor: tenant.backgroundColor || "#0F0A1A",
        color: tenant.textColor || "#FFFFFF",
      }}
      className="min-h-dvh transition-colors duration-300"
      id="simulator-root"
    >
      <header className="relative overflow-hidden">
        {tenant.bannerUrl && (
          <div className="absolute inset-0">
            <img src={tenant.bannerUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[var(--tenant-bg)]" />
          </div>
        )}
        <div className="relative px-4 pt-8 pb-6 max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-4">
            {tenant.logoUrl && (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="w-14 h-14 rounded-full border-2 border-white/20 object-cover shadow-lg"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{tenant.name}</h1>
              <p className="text-white/60 text-sm flex items-center gap-1.5">
                <Cake className="w-3.5 h-3.5" aria-hidden="true" />
                Simulador de Encomendas
              </p>
            </div>
          </div>
        </div>
      </header>

      <nav className="px-4 py-4 max-w-lg mx-auto" aria-label="Progresso da encomenda">
        <div className="flex items-center justify-between mb-2">
          {stepIcons.map((Icon, i) => {
            const stepNum = i + 1;
            const isActive = state.step === stepNum;
            const isCompleted = state.step > stepNum;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1" aria-current={isActive ? "step" : undefined}>
                <div
                  style={isActive ? { boxShadow: `0 0 16px rgba(var(--color-brand-shadow-rgb), 0.5)` } : undefined}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    isActive && "bg-brand-primary text-white scale-110",
                    isCompleted && "bg-brand-primary/20 text-brand-primary",
                    !isActive && !isCompleted && "bg-white/5 text-white/30"
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-brand-primary" : "text-white/30"
                )}>
                  {stepLabels[i]}
                </span>
                {i < stepIcons.length - 1 && (
                  <div className={cn(
                    "absolute h-[2px] transition-colors",
                    isCompleted ? "bg-brand-primary" : "bg-white/10"
                  )} aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
        <div
          className="h-1 bg-white/5 rounded-full overflow-hidden"
          role="progressbar"
          aria-label="Progresso da encomenda"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={state.step}
          aria-valuetext={`${stepLabels[state.step - 1]} — etapa ${state.step} de ${TOTAL_STEPS}`}
        >
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full transition-all duration-500"
            style={{ width: `${(state.step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </nav>

      {total > 0 && (
        <div className="px-4 max-w-lg mx-auto mb-2">
          <div className="glass-card px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-white/50">Subtotal parcial</span>
            <span className="text-sm font-bold text-gradient">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <main className="px-4 pb-32 max-w-lg mx-auto">
        <div key={state.step} className="step-enter">
          {state.step === 1 && (
            <StepCalendar
              selectedDate={state.eventDate}
              onSelect={(d) => setState((s) => ({ ...s, eventDate: d }))}
              blockedDates={blockedDateStrings}
              closedDays={closedDays}
              minLeadDays={tenant.minLeadDays}
            />
          )}
          {state.step === 2 && (
            <StepSize
              sizes={sizes}
              selected={state.cakeSize}
              onSelect={(s) => setState((prev) => ({ ...prev, cakeSize: s }))}
            />
          )}
          {state.step === 3 && (
            <StepFlavors
              doughs={doughs}
              fillings={fillings}
              addons={addons}
              selectedDough={state.dough}
              selectedFillings={state.fillings}
              selectedAddons={state.addons}
              maxFillings={state.cakeSize?.maxFillings || 2}
              showToast={showToast}
              onSelectDough={(d) => setState((s) => ({ ...s, dough: d }))}
              onToggleFilling={(f) =>
                setState((s) => ({
                  ...s,
                  fillings: s.fillings.find((x) => x.id === f.id)
                    ? s.fillings.filter((x) => x.id !== f.id)
                    : [...s.fillings, f],
                }))
              }
              onToggleAddon={(a) =>
                setState((s) => ({
                  ...s,
                  addons: s.addons.find((x) => x.id === a.id)
                    ? s.addons.filter((x) => x.id !== a.id)
                    : [...s.addons, a],
                }))
              }
            />
          )}
          {state.step === 4 && (
            <StepDetails
              state={state}
              customFields={customFields}
              onChange={(updates) => setState((s) => ({ ...s, ...updates }))}
              allowUpload={tenant.featuresConfig.allow_photo_upload}
            />
          )}
          {state.step === 5 && (
            <StepSummary
              state={state}
              tenant={tenant}
              customFields={customFields}
              total={total}
              deposit={deposit}
              copied={copied}
              onCopyPix={async () => {
                const ok = await copyToClipboard(tenant.pixKey);
                if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); showToast("Chave PIX copiada!"); }
              }}
              onSendWhatsApp={() => {
                const msg = buildWhatsAppMessage(state, tenant, fillings, addons);
                openWhatsApp(tenant.whatsapp, msg);
              }}
              onChange={(updates) => setState((s) => ({ ...s, ...updates }))}
            />
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-gradient-to-t from-[var(--tenant-bg)] via-[var(--tenant-bg)] to-transparent pt-8 pb-4 px-4">
          <div className="max-w-lg mx-auto flex gap-3">
            {state.step > 1 && (
              <button onClick={goBack} className="btn-secondary flex-shrink-0" id="btn-back">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Voltar
              </button>
            )}
            {state.step < TOTAL_STEPS && (
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className="btn-primary flex-1"
                id="btn-next"
              >
                Continuar
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast bg-success text-white" role="status" aria-live="polite" aria-atomic="true">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" aria-hidden="true" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function StepCalendar({
  selectedDate,
  onSelect,
  blockedDates,
  closedDays,
  minLeadDays,
}: {
  selectedDate: string | null;
  onSelect: (date: string) => void;
  blockedDates: string[];
  closedDays: number[];
  minLeadDays: number;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = getDateString(today);

  const monthNames = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const minDate = new Date(today);
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() + Math.max(0, minLeadDays));

  return (
    <div>
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-brand-primary" aria-hidden="true" />
        Quando sera sua festa?
      </h2>
      <p className="text-white/50 text-sm mb-1">Selecione a data desejada para a entrega do bolo</p>
      <p className="text-white/40 text-xs mb-5">Antecedência mínima configurada: {minLeadDays} dia{minLeadDays === 1 ? "" : "s"}.</p>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/10 transition-colors" id="cal-prev" aria-label="Mês anterior">
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <h3 className="font-semibold" aria-live="polite">
            {monthNames[viewMonth]} {viewYear}
          </h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/10 transition-colors" id="cal-next" aria-label="Próximo mês">
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2" aria-hidden="true">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-white/40 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1" role="group" aria-label={`${monthNames[viewMonth]} de ${viewYear}`}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} aria-hidden="true" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dateObj = new Date(viewYear, viewMonth, day);
            const isPast = dateObj < minDate;
            const blocked = isDateBlocked(dateStr, blockedDates, closedDays);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr;
            const disabled = isPast || blocked;
            const readableDate = dateObj.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
            const availability = isPast ? "indisponível por antecedência" : blocked ? "indisponível" : "disponível";

            return (
              <button
                key={day}
                disabled={disabled}
                onClick={() => !disabled && onSelect(dateStr)}
                className={cn(
                  "relative h-10 rounded-lg text-sm font-medium transition-all duration-200",
                  isSelected && "bg-brand-primary text-white shadow-lg shadow-brand-primary/30",
                  !isSelected && !disabled && "hover:bg-white/10",
                  disabled && "text-white/15 cursor-not-allowed",
                  isToday && !isSelected && "ring-1 ring-brand-primary/50",
                  blocked && !isPast && "line-through text-error/40"
                )}
                id={`cal-day-${day}`}
                aria-pressed={isSelected}
                aria-label={`${readableDate}, ${availability}${isToday ? ", hoje" : ""}`}
              >
                {day}
                {blocked && !isPast && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-error/60" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5 text-[11px] text-white/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-primary" aria-hidden="true" />
            Selecionado
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-error/60" aria-hidden="true" />
            Esgotado
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white/15" aria-hidden="true" />
            Indisponível
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="mt-4 glass-card-light p-3 flex items-center gap-3" role="status" aria-live="polite">
          <div className="w-10 h-10 rounded-lg bg-brand-primary/20 flex items-center justify-center" aria-hidden="true">
            <Check className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Data selecionada</p>
            <p className="text-xs text-white/50">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StepSize({ sizes, selected, onSelect }: { sizes: CakeSizeData[]; selected: CakeSizeData | null; onSelect: (size: CakeSizeData) => void }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Cake className="w-5 h-5 text-brand-primary" aria-hidden="true" />Qual o tamanho ideal?</h2>
      <p className="text-white/50 text-sm mb-5">Escolha o tamanho do bolo baseado no número de convidados</p>
      <div className="space-y-3">
        {sizes.map((size) => {
          const isSelected = selected?.id === size.id;
          return (
            <button key={size.id} onClick={() => onSelect(size)} className={cn("selection-card w-full text-left", isSelected && "selected")} id={`size-${size.id}`} aria-pressed={isSelected}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", isSelected ? "bg-brand-primary/20" : "bg-white/5")} aria-hidden="true"><Cake className={cn("w-6 h-6", isSelected ? "text-brand-primary" : "text-white/40")} /></div>
                  <div><p className="font-semibold text-sm">{size.name}</p><div className="flex items-center gap-3 text-xs text-white/50 mt-0.5"><span className="flex items-center gap-1"><Users className="w-3 h-3" aria-hidden="true" />{size.servings}</span><span className="flex items-center gap-1"><Weight className="w-3 h-3" aria-hidden="true" />{size.weightKg}kg</span></div></div>
                </div>
                <div className="text-right"><p className={cn("font-bold", isSelected ? "text-brand-primary" : "text-white/80")}>{formatCurrency(size.basePrice)}</p>{isSelected && <div className="mt-1" aria-hidden="true"><Check className="w-4 h-4 text-brand-primary ml-auto" /></div>}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepFlavors({ doughs, fillings, addons, selectedDough, selectedFillings, selectedAddons, maxFillings = 2, onSelectDough, onToggleFilling, onToggleAddon, showToast }: { doughs: CakeFlavorData[]; fillings: CakeFlavorData[]; addons: AddonData[]; selectedDough: CakeFlavorData | null; selectedFillings: CakeFlavorData[]; selectedAddons: AddonData[]; maxFillings?: number; onSelectDough: (dough: CakeFlavorData) => void; onToggleFilling: (filling: CakeFlavorData) => void; onToggleAddon: (addon: AddonData) => void; showToast: (msg: string) => void }) {
  const handleFillingClick = (filling: CakeFlavorData) => {
    const isSelected = selectedFillings.some((f) => f.id === filling.id);
    if (!isSelected && selectedFillings.length >= maxFillings) { showToast(`Este tamanho permite no máximo ${maxFillings} recheio${maxFillings > 1 ? "s" : ""}.`); return; }
    onToggleFilling(filling);
  };
  return (
    <div className="space-y-8">
      <div><h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Layers className="w-5 h-5 text-brand-primary" aria-hidden="true" />Escolha a Massa</h2><p className="text-white/50 text-sm mb-4">Selecione uma opção de massa</p>
        <div className="grid grid-cols-2 gap-3 items-stretch">{doughs.map((dough) => { const isSelected = selectedDough?.id === dough.id; return <button key={dough.id} onClick={() => onSelectDough(dough)} className={cn("selection-card text-center flex flex-col justify-between items-center h-full p-3.5", isSelected && "selected")} id={`dough-${dough.id}`} aria-pressed={isSelected}>{dough.imageUrl ? <div className="w-full h-24 overflow-hidden rounded-lg mb-2 flex-shrink-0"><img src={dough.imageUrl} alt={dough.name} className="w-full h-full object-cover" /></div> : <div className="w-full h-24 bg-white/5 rounded-lg mb-2 flex items-center justify-center flex-shrink-0" aria-hidden="true"><Cake className="w-8 h-8 text-white/20" /></div>}<div className="flex-1 flex flex-col items-center justify-center space-y-1 w-full min-h-[3rem]"><p className="font-medium text-sm text-center leading-tight">{dough.name}</p>{dough.isSpecial && <span className="badge badge-special text-[10px]"><Star className="w-2.5 h-2.5" aria-hidden="true" /> Especial</span>}{dough.additionalPrice > 0 && <p className="text-xs text-brand-secondary">+{formatCurrency(dough.additionalPrice)}</p>}</div></button>; })}</div>
      </div>
      <div><h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Palette className="w-5 h-5 text-brand-primary" aria-hidden="true" />Escolha os Recheios</h2><p className="text-white/50 text-sm mb-4">Selecione ate {maxFillings} recheio{maxFillings > 1 ? "s" : ""} ({selectedFillings.length}/{maxFillings} selecionado{selectedFillings.length !== 1 ? "s" : ""})</p><div className="space-y-2">{fillings.map((filling) => { const isSelected = selectedFillings.some((f) => f.id === filling.id); return <button key={filling.id} onClick={() => handleFillingClick(filling)} className={cn("selection-card w-full text-left", isSelected && "selected")} id={`filling-${filling.id}`} aria-pressed={isSelected}><div className="flex items-center gap-3">{filling.imageUrl && <img src={filling.imageUrl} alt={filling.name} className="w-12 h-12 rounded-lg object-cover" />}<div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-medium text-sm">{filling.name}</p>{filling.isSpecial && <span className="badge badge-special text-[10px]"><Star className="w-2.5 h-2.5" aria-hidden="true" /> Especial</span>}</div>{filling.additionalPrice > 0 && <p className="text-xs text-brand-secondary mt-0.5">+{formatCurrency(filling.additionalPrice)}</p>}</div><div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all", isSelected ? "bg-brand-primary border-brand-primary" : "border-white/20")} aria-hidden="true">{isSelected && <Check className="w-3.5 h-3.5 text-white" />}</div></div></button>; })}</div></div>
      {addons.length > 0 && <div><h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand-primary" aria-hidden="true" />Adicionais</h2><p className="text-white/50 text-sm mb-4">Itens opcionais para complementar sua encomenda</p><div className="space-y-2">{addons.map((addon) => { const isSelected = selectedAddons.some((a) => a.id === addon.id); return <button key={addon.id} onClick={() => onToggleAddon(addon)} className={cn("selection-card w-full text-left", isSelected && "selected")} id={`addon-${addon.id}`} aria-pressed={isSelected}><div className="flex items-center gap-3">{addon.imageUrl ? <img src={addon.imageUrl} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" /> : <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors", isSelected ? "bg-brand-primary/20 text-brand-primary" : "bg-white/5 text-white/40")} aria-hidden="true"><Sparkles className="w-5 h-5" /></div>}<div className="flex-1 min-w-0"><p className="font-medium text-sm text-white">{addon.name}</p>{addon.description && <p className="text-xs text-white/40 mt-0.5 truncate">{addon.description}</p>}</div><div className="flex items-center gap-2.5 flex-shrink-0"><span className={cn("font-bold text-xs sm:text-sm", isSelected ? "text-brand-primary" : "text-white/70")}>+{formatCurrency(addon.price)}</span><div className={cn("w-6 h-6 rounded-full flex items-center justify-center border transition-all", isSelected ? "bg-brand-primary border-brand-primary text-white shadow-sm" : "border-white/20 text-white/30")} aria-hidden="true">{isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}</div></div></div></button>; })}</div></div>}
    </div>
  );
}

function CustomFieldsForm({ fields, state, onChange }: { fields: CustomFieldData[]; state: SimulatorState; onChange: (updates: Partial<SimulatorState>) => void }) {
  if (fields.length === 0) return null;
  const answers = state.customFieldAnswers ?? {};
  const updateAnswer = (id: string, value: string) => onChange({ customFieldAnswers: { ...answers, [id]: value } });
  return <fieldset className="glass-card p-4 space-y-4"><legend className="px-1 text-sm font-semibold text-white/90">Informações do seu evento</legend><p className="text-xs text-white/50">Estes campos são configurados pelo ateliê para esta encomenda.</p>{fields.map((field) => { const inputId = `custom-field-${field.id}`; const value = answers[field.id] ?? ""; return <div key={field.id}><label htmlFor={inputId} className="block text-sm font-medium mb-2 text-white/80">{field.label}{field.required ? <span className="text-brand-secondary"> *</span> : null}</label>{field.type === "select" ? <select id={inputId} required={field.required} value={value} onChange={(event) => updateAnswer(field.id, event.target.value)} className="input-field"><option value="">Selecione uma opção</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input id={inputId} type={field.type === "number" ? "number" : "text"} inputMode={field.type === "number" ? "decimal" : undefined} required={field.required} maxLength={field.type === "text" ? CUSTOM_TEXT_MAX : undefined} value={value} onChange={(event) => updateAnswer(field.id, event.target.value)} className="input-field" aria-describedby={field.type === "text" ? `${inputId}-help` : undefined} />}{field.type === "text" && <p id={`${inputId}-help`} className="text-[11px] text-white/40 mt-1.5">Até {CUSTOM_TEXT_MAX} caracteres · {value.length}/{CUSTOM_TEXT_MAX}</p>}</div>; })}<p className="text-[11px] text-white/40">* Campos obrigatórios. O servidor valida estas respostas antes de confirmar o pedido.</p></fieldset>;
}

function StepDetails({ state, customFields, onChange, allowUpload }: { state: SimulatorState; customFields: CustomFieldData[]; onChange: (updates: Partial<SimulatorState>) => void; allowUpload: boolean }) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState(() => state.referenceImage && !state.referenceImage.startsWith("data:") ? state.referenceImage : "");
  const handleFileProcess = (file: File) => { const validation = validateImageFileMetadata(file); if (!validation.ok) { setImageError(validation.message); return; } setImageError(null); const reader = new FileReader(); reader.onload = (e) => { if (e.target?.result) { setUrlDraft(""); onChange({ referenceImage: e.target.result as string }); } }; reader.readAsDataURL(file); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) handleFileProcess(file); e.target.value = ""; };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) handleFileProcess(file); };
  const validateUrlDraft = () => { if (!urlDraft.trim()) { setImageError(null); onChange({ referenceImage: null }); return; } const validation = validateImageReference(urlDraft); if (!validation.ok || validation.kind !== "url") { setImageError(validation.ok ? "Use uma URL HTTPS válida." : validation.message); return; } setImageError(null); setUrlDraft(validation.value); onChange({ referenceImage: validation.value }); };
  return <div className="space-y-6"><h2 className="text-lg font-bold mb-1 flex items-center gap-2"><FileText className="w-5 h-5 text-brand-primary" aria-hidden="true" />Detalhes do Pedido</h2><p className="text-white/50 text-sm mb-5">Informações adicionais para personalizar seu bolo</p><CustomFieldsForm fields={customFields} state={state} onChange={onChange} /><div><label htmlFor="input-cake-message" className="block text-sm font-medium mb-2 text-white/80">Mensagem / Placa do Bolo</label><input type="text" value={state.cakeMessage} onChange={(e) => onChange({ cakeMessage: e.target.value })} placeholder='Ex: "Parabéns Maria - 30 anos"' className="input-field" id="input-cake-message" maxLength={ORDER_TEXT_LIMITS.cakeMessage} aria-describedby="input-cake-message-help" /><p id="input-cake-message-help" className="text-[11px] text-white/40 mt-1.5">Até {ORDER_TEXT_LIMITS.cakeMessage} caracteres · {state.cakeMessage.length}/{ORDER_TEXT_LIMITS.cakeMessage}</p></div><div><label htmlFor="input-details" className="block text-sm font-medium mb-2 text-white/80">Observações adicionais</label><textarea value={state.details} onChange={(e) => onChange({ details: e.target.value })} placeholder="Descreva detalhes da decoração, tema, alergias, etc." rows={3} className="input-field resize-none" id="input-details" maxLength={ORDER_TEXT_LIMITS.details} aria-describedby="input-details-help" /><p id="input-details-help" className="text-[11px] text-white/40 mt-1.5">Até {ORDER_TEXT_LIMITS.details} caracteres · {state.details.length}/{ORDER_TEXT_LIMITS.details}</p></div>{allowUpload && <div><p className="block text-sm font-medium mb-2 text-white/80" id="photo-reference-label">Foto de Referência (opcional)</p>{state.referenceImage ? <div className="glass-card p-4 flex items-center justify-between gap-4" aria-labelledby="photo-reference-label"><div className="flex items-center gap-3 min-w-0"><img src={state.referenceImage} alt="Foto de referência" referrerPolicy="no-referrer" className="w-16 h-16 rounded-lg object-cover border border-white/10 flex-shrink-0" /><div className="min-w-0"><p className="text-sm font-medium text-white/90">Foto de referência enviada</p><p className="text-xs text-success flex items-center gap-1 mt-0.5"><Check className="w-3.5 h-3.5" aria-hidden="true" /> Pronta para o pedido</p></div></div><button type="button" onClick={() => { setImageError(null); setUrlDraft(""); onChange({ referenceImage: null }); }} className="p-2 rounded-lg bg-error/15 text-error hover:bg-error/25 transition-colors text-xs flex items-center gap-1 flex-shrink-0" id="btn-remove-photo"><X className="w-4 h-4" aria-hidden="true" />Remover</button></div> : <div className="space-y-3"><label onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }} className={cn("glass-card p-6 text-center border-2 border-dashed transition-all cursor-pointer block", isDragging ? "border-brand-primary bg-brand-primary/10 scale-[1.01]" : "border-white/10 hover:border-brand-primary/40 hover:bg-white/5")} id="dropzone-photo" tabIndex={0} role="button" aria-labelledby="photo-reference-label" aria-describedby="photo-reference-help photo-reference-error" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); document.getElementById("input-file-photo")?.click(); } }}><input type="file" accept={SUPPORTED_IMAGE_MIME_TYPES.join(",")} onChange={handleFileSelect} className="hidden" id="input-file-photo" tabIndex={-1} /><Upload className="w-8 h-8 text-white/40 mx-auto mb-2" aria-hidden="true" /><p className="text-sm font-medium text-white/80">Clique aqui ou arraste uma foto para enviar</p><p className="text-xs text-white/40 mt-1" id="photo-reference-help">{imageUploadHelpText()}</p></label><div className="relative flex items-center justify-center my-2" aria-hidden="true"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div><span className="relative px-3 text-[11px] text-white/30 bg-surface-900">ou insira o link</span></div><label htmlFor="input-reference-url" className="sr-only">URL da imagem de referência</label><input type="url" value={urlDraft} onChange={(e) => { setUrlDraft(e.target.value); setImageError(null); if (!e.target.value) onChange({ referenceImage: null }); }} onBlur={validateUrlDraft} placeholder="Cole a URL da imagem de referência (ex: https://...)" className={cn("input-field text-xs", imageError && "border-error/60 focus:border-error")} id="input-reference-url" aria-invalid={imageError ? true : undefined} aria-describedby="photo-reference-help photo-reference-error" />{imageError && <p id="photo-reference-error" className="text-xs text-error mt-1.5" role="alert">{imageError}</p>}</div>}</div>}</div>;
}

function StepSummary({ state, tenant, customFields, total, deposit, copied, onCopyPix, onSendWhatsApp, onChange }: { state: SimulatorState; tenant: TenantFullData["tenant"]; customFields: CustomFieldData[]; total: number; deposit: number; copied: boolean; onCopyPix: () => void; onSendWhatsApp: () => void; onChange: (updates: Partial<SimulatorState>) => void }) {
  const phoneInvalid = Boolean(state.customerPhone) && !isValidPhoneBR(state.customerPhone);
  const nameInvalid = state.customerName.trim().length > ORDER_TEXT_LIMITS.customerName;
  const answers = state.customFieldAnswers ?? {};
  const customFieldsComplete = customFields.every((field) => !field.required || Boolean(answers[field.id]?.trim()));
  return <div className="space-y-6"><h2 className="text-lg font-bold mb-1 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-brand-primary" aria-hidden="true" />Resumo do Pedido</h2><p className="text-white/50 text-sm">Confira os detalhes antes de enviar</p><div className="space-y-3"><div><label htmlFor="input-name" className="block text-sm font-medium mb-2 text-white/80 flex items-center gap-1.5"><User className="w-3.5 h-3.5" aria-hidden="true" /> Seu Nome</label><input type="text" value={state.customerName} onChange={(e) => onChange({ customerName: e.target.value })} placeholder="Nome completo" className={cn("input-field", nameInvalid && "border-error/60 focus:border-error")} id="input-name" maxLength={ORDER_TEXT_LIMITS.customerName} aria-invalid={nameInvalid || undefined} aria-describedby="input-name-help" /><p id="input-name-help" className="text-[11px] text-white/40 mt-1.5">Até {ORDER_TEXT_LIMITS.customerName} caracteres · {state.customerName.length}/{ORDER_TEXT_LIMITS.customerName}</p></div><div><label htmlFor="input-phone" className="block text-sm font-medium mb-2 text-white/80 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" aria-hidden="true" /> Seu WhatsApp</label><input type="tel" value={state.customerPhone} onChange={(e) => onChange({ customerPhone: formatPhoneBR(e.target.value) })} placeholder="(11) 99999-9999" className={cn("input-field", phoneInvalid && "border-error/60 focus:border-error")} id="input-phone" aria-invalid={phoneInvalid || undefined} aria-describedby={phoneInvalid ? "input-phone-error" : undefined} />{phoneInvalid && <p id="input-phone-error" className="text-xs text-error mt-1.5 flex items-center gap-1" role="alert">Informe um telefone/WhatsApp válido com DDD (ex: (11) 99999-9999)</p>}</div></div><div className="glass-card p-4 space-y-3"><h3 className="font-semibold text-sm text-white/80 mb-3">Detalhamento</h3><div className="flex justify-between text-sm"><span className="text-white/50">Data do evento</span><span>{state.eventDate ? new Date(state.eventDate + "T12:00:00").toLocaleDateString("pt-BR") : "-"}</span></div><div className="flex justify-between text-sm"><span className="text-white/50">Tamanho</span><span>{state.cakeSize?.name} ({state.cakeSize?.servings})</span></div><div className="flex justify-between text-sm"><span className="text-white/50">Massa</span><span>{state.dough?.name}{state.dough && state.dough.additionalPrice > 0 && <span className="text-brand-secondary ml-1">+{formatCurrency(state.dough.additionalPrice)}</span>}</span></div>{state.fillings.length > 0 && <div><span className="text-sm text-white/50 block mb-1">Recheios</span>{state.fillings.map((f) => <div key={f.id} className="flex justify-between text-sm pl-3"><span>{f.name}</span>{f.additionalPrice > 0 && <span className="text-brand-secondary">+{formatCurrency(f.additionalPrice)}</span>}</div>)}</div>}{state.addons.length > 0 && <div><span className="text-sm text-white/50 block mb-1">Adicionais</span>{state.addons.map((a) => <div key={a.id} className="flex justify-between text-sm pl-3"><span>{a.name}</span><span className="text-brand-secondary">+{formatCurrency(a.price)}</span></div>)}</div>}{customFields.some((field) => answers[field.id]?.trim()) && <div><span className="text-sm text-white/50 block mb-1">Informações personalizadas</span>{customFields.filter((field) => answers[field.id]?.trim()).map((field) => <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 text-sm pl-3"><span className="text-white/50 break-words">{field.label}</span><span className="text-right break-words">{answers[field.id]}</span></div>)}</div>}{state.cakeMessage && <div className="flex justify-between text-sm"><span className="text-white/50">Placa</span><span className="text-right max-w-[60%] truncate">&quot;{state.cakeMessage}&quot;</span></div>}<div className="border-t border-white/10 pt-3 mt-3"><div className="flex justify-between text-sm"><span className="text-white/50">Base ({state.cakeSize?.name})</span><span>{formatCurrency(state.cakeSize?.basePrice || 0)}</span></div><div className="flex justify-between font-bold text-lg mt-2"><span>Total estimado</span><span className="text-gradient">{formatCurrency(total)}</span></div>{tenant.featuresConfig.deposit_mode === "50_percent" && <div className="flex justify-between text-sm mt-1 text-brand-secondary"><span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Sinal estimado (50%)</span><span className="font-semibold">{formatCurrency(deposit)}</span></div>}<p className="text-[11px] text-white/40 mt-2">Disponibilidade e valores finais são confirmados pelo servidor ao enviar o pedido.</p></div></div>{tenant.pixKey && deposit > 0 && <div className="glass-card p-4"><p className="text-sm font-medium mb-2 text-white/80" id="pix-key-label">Chave PIX para pagamento</p><div className="flex items-center gap-2"><code className="flex-1 bg-white/5 px-3 py-2 rounded-lg text-sm text-white/70 truncate" id="pix-key-value">{tenant.pixKey}</code><button onClick={onCopyPix} className={cn("p-2.5 rounded-lg transition-all flex-shrink-0", copied ? "bg-success text-white" : "bg-white/10 hover:bg-white/20 text-white/60")} id="btn-copy-pix" aria-label={copied ? "Chave PIX copiada" : "Copiar chave PIX"} aria-describedby="pix-key-value pix-copy-status">{copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}</button></div><span id="pix-copy-status" className="sr-only" aria-live="polite">{copied ? "Chave PIX copiada para a área de transferência" : ""}</span></div>}<button onClick={onSendWhatsApp} disabled={!state.customerName.trim() || nameInvalid || !isValidPhoneBR(state.customerPhone) || !customFieldsComplete} className="btn-primary w-full py-4 text-base" id="btn-send-whatsapp"><MessageCircle className="w-5 h-5" aria-hidden="true" />Enviar Pedido no WhatsApp</button></div>;
}
