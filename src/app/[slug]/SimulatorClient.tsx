"use client";

import { useState, useEffect, useCallback } from "react";
import type { TenantFullData, SimulatorState, CakeFlavorData, AddonData, CakeSizeData } from "@/lib/types";
import { calculateOrderTotal, calculateDeposit, formatCurrency } from "@/lib/pricing";
import { buildWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp";
import { copyToClipboard, cn, getDateString, isDateBlocked, getDaysInMonth, getFirstDayOfMonth } from "@/lib/utils";
import {
  Calendar, ChevronLeft, ChevronRight, Cake, Layers, Palette, Upload,
  ClipboardCheck, MessageCircle, Copy, Check, Star, Plus, Minus,
  ArrowLeft, ArrowRight, Phone, User, FileText, X, Sparkles, Weight,
  Users, ShieldCheck, Clock, Ban
} from "lucide-react";

const TOTAL_STEPS = 5;

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
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/tenants/${slug}`);
        if (!res.ok) throw new Error("Atelie nao encontrado");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar");
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

  const canProceed = (): boolean => {
    switch (state.step) {
      case 1: return !!state.eventDate;
      case 2: return !!state.cakeSize;
      case 3: return !!state.dough && state.fillings.length > 0;
      case 4: return true;
      case 5: return !!state.customerName && !!state.customerPhone;
      default: return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="glass-card p-8 text-center max-w-md">
          <Ban className="w-12 h-12 text-error mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Atelie nao encontrado</h1>
          <p className="text-white/60 text-sm">{error || "O atelie solicitado nao existe ou esta indisponivel."}</p>
        </div>
      </div>
    );
  }

  const { tenant, sizes, doughs, fillings, addons, blockedDates, workSchedule } = data;

  const total = calculateOrderTotal(state.cakeSize, state.dough, state.fillings, state.addons);
  const deposit = calculateDeposit(total, tenant.featuresConfig.deposit_mode);

  const blockedDateStrings = blockedDates.map((b) => b.date);
  const closedDays = workSchedule.filter((w) => !w.isOpen).map((w) => w.dayOfWeek);

  const stepIcons = [Calendar, Cake, Palette, Upload, ClipboardCheck];
  const stepLabels = ["Data", "Tamanho", "Sabores", "Detalhes", "Resumo"];

  const style = {
    "--tenant-primary": tenant.primaryColor,
    "--tenant-secondary": tenant.secondaryColor,
    "--tenant-bg": tenant.backgroundColor,
    "--tenant-button": tenant.buttonColor,
    "--tenant-text": tenant.textColor,
  } as React.CSSProperties;

  return (
    <div style={style} className="min-h-dvh" id="simulator-root">
      {/* Header */}
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
                <Cake className="w-3.5 h-3.5" />
                Simulador de Encomendas
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
          {stepIcons.map((Icon, i) => {
            const stepNum = i + 1;
            const isActive = state.step === stepNum;
            const isCompleted = state.step > stepNum;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    isActive && "bg-brand-primary text-white shadow-lg shadow-brand-primary/30 scale-110",
                    isCompleted && "bg-brand-primary/20 text-brand-primary",
                    !isActive && !isCompleted && "bg-white/5 text-white/30"
                  )}
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
                  )} />
                )}
              </div>
            );
          })}
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full transition-all duration-500"
            style={{ width: `${(state.step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Running total */}
      {total > 0 && (
        <div className="px-4 max-w-lg mx-auto mb-2">
          <div className="glass-card px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-white/50">Subtotal parcial</span>
            <span className="text-sm font-bold text-gradient">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      <main className="px-4 pb-32 max-w-lg mx-auto">
        <div key={state.step} className="step-enter">
          {state.step === 1 && (
            <StepCalendar
              selectedDate={state.eventDate}
              onSelect={(d) => setState((s) => ({ ...s, eventDate: d }))}
              blockedDates={blockedDateStrings}
              closedDays={closedDays}
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
              onChange={(updates) => setState((s) => ({ ...s, ...updates }))}
              allowUpload={tenant.featuresConfig.allow_photo_upload}
            />
          )}
          {state.step === 5 && (
            <StepSummary
              state={state}
              tenant={tenant}
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

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-gradient-to-t from-[var(--tenant-bg)] via-[var(--tenant-bg)] to-transparent pt-8 pb-4 px-4">
          <div className="max-w-lg mx-auto flex gap-3">
            {state.step > 1 && (
              <button onClick={goBack} className="btn-secondary flex-shrink-0" id="btn-back">
                <ArrowLeft className="w-4 h-4" />
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
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast bg-success text-white">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   STEP 1: Calendar
   ============================================================ */

function StepCalendar({
  selectedDate,
  onSelect,
  blockedDates,
  closedDays,
}: {
  selectedDate: string | null;
  onSelect: (date: string) => void;
  blockedDates: string[];
  closedDays: number[];
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
  minDate.setDate(minDate.getDate() + 3);

  return (
    <div>
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-brand-primary" />
        Quando sera sua festa?
      </h2>
      <p className="text-white/50 text-sm mb-5">Selecione a data desejada para a entrega do bolo</p>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/10 transition-colors" id="cal-prev">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-semibold">
            {monthNames[viewMonth]} {viewYear}
          </h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/10 transition-colors" id="cal-next">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-white/40 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
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
              >
                {day}
                {blocked && !isPast && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-error/60" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5 text-[11px] text-white/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-primary" />
            Selecionado
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-error/60" />
            Esgotado
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white/15" />
            Indisponivel
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="mt-4 glass-card-light p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-primary/20 flex items-center justify-center">
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

/* ============================================================
   STEP 2: Size / Slices
   ============================================================ */

function StepSize({
  sizes,
  selected,
  onSelect,
}: {
  sizes: CakeSizeData[];
  selected: CakeSizeData | null;
  onSelect: (size: CakeSizeData) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Cake className="w-5 h-5 text-brand-primary" />
        Qual o tamanho ideal?
      </h2>
      <p className="text-white/50 text-sm mb-5">Escolha o tamanho do bolo baseado no numero de convidados</p>

      <div className="space-y-3">
        {sizes.map((size) => {
          const isSelected = selected?.id === size.id;
          return (
            <button
              key={size.id}
              onClick={() => onSelect(size)}
              className={cn("selection-card w-full text-left", isSelected && "selected")}
              id={`size-${size.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isSelected ? "bg-brand-primary/20" : "bg-white/5"
                  )}>
                    <Cake className={cn("w-6 h-6", isSelected ? "text-brand-primary" : "text-white/40")} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{size.name}</p>
                    <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {size.servings}
                      </span>
                      <span className="flex items-center gap-1">
                        <Weight className="w-3 h-3" />
                        {size.weightKg}kg
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("font-bold", isSelected ? "text-brand-primary" : "text-white/80")}>
                    {formatCurrency(size.basePrice)}
                  </p>
                  {isSelected && (
                    <div className="mt-1">
                      <Check className="w-4 h-4 text-brand-primary ml-auto" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   STEP 3: Flavors & Addons
   ============================================================ */

function StepFlavors({
  doughs,
  fillings,
  addons,
  selectedDough,
  selectedFillings,
  selectedAddons,
  onSelectDough,
  onToggleFilling,
  onToggleAddon,
}: {
  doughs: CakeFlavorData[];
  fillings: CakeFlavorData[];
  addons: AddonData[];
  selectedDough: CakeFlavorData | null;
  selectedFillings: CakeFlavorData[];
  selectedAddons: AddonData[];
  onSelectDough: (d: CakeFlavorData) => void;
  onToggleFilling: (f: CakeFlavorData) => void;
  onToggleAddon: (a: AddonData) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Dough */}
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-primary" />
          Escolha a Massa
        </h2>
        <p className="text-white/50 text-sm mb-4">Selecione uma opcao de massa</p>

        <div className="grid grid-cols-2 gap-3">
          {doughs.map((dough) => {
            const isSelected = selectedDough?.id === dough.id;
            return (
              <button
                key={dough.id}
                onClick={() => onSelectDough(dough)}
                className={cn("selection-card text-center", isSelected && "selected")}
                id={`dough-${dough.id}`}
              >
                {dough.imageUrl && (
                  <img
                    src={dough.imageUrl}
                    alt={dough.name}
                    className="w-full h-20 object-cover rounded-lg mb-2"
                  />
                )}
                <p className="font-medium text-sm">{dough.name}</p>
                {dough.isSpecial && (
                  <span className="badge badge-special text-[10px] mt-1">
                    <Star className="w-2.5 h-2.5" /> Especial
                  </span>
                )}
                {dough.additionalPrice > 0 && (
                  <p className="text-xs text-brand-secondary mt-1">+{formatCurrency(dough.additionalPrice)}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fillings */}
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Palette className="w-5 h-5 text-brand-primary" />
          Escolha os Recheios
        </h2>
        <p className="text-white/50 text-sm mb-4">
          Selecione um ou mais recheios ({selectedFillings.length} selecionado{selectedFillings.length !== 1 ? "s" : ""})
        </p>

        <div className="space-y-2">
          {fillings.map((filling) => {
            const isSelected = selectedFillings.some((f) => f.id === filling.id);
            return (
              <button
                key={filling.id}
                onClick={() => onToggleFilling(filling)}
                className={cn("selection-card w-full text-left", isSelected && "selected")}
                id={`filling-${filling.id}`}
              >
                <div className="flex items-center gap-3">
                  {filling.imageUrl && (
                    <img
                      src={filling.imageUrl}
                      alt={filling.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{filling.name}</p>
                      {filling.isSpecial && (
                        <span className="badge badge-special text-[10px]">
                          <Star className="w-2.5 h-2.5" /> Especial
                        </span>
                      )}
                    </div>
                    {filling.additionalPrice > 0 && (
                      <p className="text-xs text-brand-secondary mt-0.5">+{formatCurrency(filling.additionalPrice)}</p>
                    )}
                  </div>
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    isSelected ? "bg-brand-primary border-brand-primary" : "border-white/20"
                  )}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Addons */}
      {addons.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-primary" />
            Adicionais
          </h2>
          <p className="text-white/50 text-sm mb-4">Itens opcionais para complementar sua encomenda</p>

          <div className="space-y-2">
            {addons.map((addon) => {
              const isSelected = selectedAddons.some((a) => a.id === addon.id);
              return (
                <button
                  key={addon.id}
                  onClick={() => onToggleAddon(addon)}
                  className={cn("selection-card w-full text-left", isSelected && "selected")}
                  id={`addon-${addon.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      isSelected ? "bg-brand-primary/20" : "bg-white/5"
                    )}>
                      <Plus className={cn("w-5 h-5", isSelected ? "text-brand-primary" : "text-white/40")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{addon.name}</p>
                      {addon.description && (
                        <p className="text-xs text-white/40 mt-0.5 truncate">{addon.description}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn("font-semibold text-sm", isSelected ? "text-brand-primary" : "text-white/70")}>
                        +{formatCurrency(addon.price)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   STEP 4: Details & Reference
   ============================================================ */

function StepDetails({
  state,
  onChange,
  allowUpload,
}: {
  state: SimulatorState;
  onChange: (updates: Partial<SimulatorState>) => void;
  allowUpload: boolean;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
        <FileText className="w-5 h-5 text-brand-primary" />
        Detalhes do Pedido
      </h2>
      <p className="text-white/50 text-sm mb-5">Informacoes adicionais para personalizar seu bolo</p>

      <div>
        <label className="block text-sm font-medium mb-2 text-white/80">
          Mensagem / Placa do Bolo
        </label>
        <input
          type="text"
          value={state.cakeMessage}
          onChange={(e) => onChange({ cakeMessage: e.target.value })}
          placeholder='Ex: "Parabens Maria - 30 anos"'
          className="input-field"
          id="input-cake-message"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-white/80">
          Observacoes adicionais
        </label>
        <textarea
          value={state.details}
          onChange={(e) => onChange({ details: e.target.value })}
          placeholder="Descreva detalhes da decoracao, tema, alergias, etc."
          rows={3}
          className="input-field resize-none"
          id="input-details"
        />
      </div>

      {allowUpload && (
        <div>
          <label className="block text-sm font-medium mb-2 text-white/80">
            Foto de Referencia (opcional)
          </label>
          <div className="glass-card p-6 text-center border-2 border-dashed border-white/10 hover:border-brand-primary/30 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="text-sm text-white/50">Arraste uma imagem ou clique para enviar</p>
            <p className="text-xs text-white/30 mt-1">PNG, JPG ate 5MB</p>
            <input
              type="url"
              value={state.referenceImage || ""}
              onChange={(e) => onChange({ referenceImage: e.target.value })}
              placeholder="Ou cole a URL da imagem de referencia"
              className="input-field mt-4 text-center text-xs"
              id="input-reference-url"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   STEP 5: Summary & Checkout
   ============================================================ */

function StepSummary({
  state,
  tenant,
  total,
  deposit,
  copied,
  onCopyPix,
  onSendWhatsApp,
  onChange,
}: {
  state: SimulatorState;
  tenant: TenantFullData["tenant"];
  total: number;
  deposit: number;
  copied: boolean;
  onCopyPix: () => void;
  onSendWhatsApp: () => void;
  onChange: (updates: Partial<SimulatorState>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-brand-primary" />
        Resumo do Pedido
      </h2>
      <p className="text-white/50 text-sm">Confira os detalhes antes de enviar</p>

      {/* Customer Info */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-2 text-white/80 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Seu Nome
          </label>
          <input
            type="text"
            value={state.customerName}
            onChange={(e) => onChange({ customerName: e.target.value })}
            placeholder="Nome completo"
            className="input-field"
            id="input-name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-white/80 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Seu WhatsApp
          </label>
          <input
            type="tel"
            value={state.customerPhone}
            onChange={(e) => onChange({ customerPhone: e.target.value })}
            placeholder="(11) 99999-9999"
            className="input-field"
            id="input-phone"
          />
        </div>
      </div>

      {/* Order Summary */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="font-semibold text-sm text-white/80 mb-3">Detalhamento</h3>

        <div className="flex justify-between text-sm">
          <span className="text-white/50">Data do evento</span>
          <span>
            {state.eventDate
              ? new Date(state.eventDate + "T12:00:00").toLocaleDateString("pt-BR")
              : "-"}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-white/50">Tamanho</span>
          <span>{state.cakeSize?.name} ({state.cakeSize?.servings})</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-white/50">Massa</span>
          <span>
            {state.dough?.name}
            {state.dough && state.dough.additionalPrice > 0 && (
              <span className="text-brand-secondary ml-1">+{formatCurrency(state.dough.additionalPrice)}</span>
            )}
          </span>
        </div>

        {state.fillings.length > 0 && (
          <div>
            <span className="text-sm text-white/50 block mb-1">Recheios</span>
            {state.fillings.map((f) => (
              <div key={f.id} className="flex justify-between text-sm pl-3">
                <span>{f.name}</span>
                {f.additionalPrice > 0 && (
                  <span className="text-brand-secondary">+{formatCurrency(f.additionalPrice)}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {state.addons.length > 0 && (
          <div>
            <span className="text-sm text-white/50 block mb-1">Adicionais</span>
            {state.addons.map((a) => (
              <div key={a.id} className="flex justify-between text-sm pl-3">
                <span>{a.name}</span>
                <span className="text-brand-secondary">+{formatCurrency(a.price)}</span>
              </div>
            ))}
          </div>
        )}

        {state.cakeMessage && (
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Placa</span>
            <span className="text-right max-w-[60%] truncate">&quot;{state.cakeMessage}&quot;</span>
          </div>
        )}

        <div className="border-t border-white/10 pt-3 mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Base ({state.cakeSize?.name})</span>
            <span>{formatCurrency(state.cakeSize?.basePrice || 0)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg mt-2">
            <span>Total</span>
            <span className="text-gradient">{formatCurrency(total)}</span>
          </div>
          {tenant.featuresConfig.deposit_mode === "50_percent" && (
            <div className="flex justify-between text-sm mt-1 text-brand-secondary">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Sinal (50%)
              </span>
              <span className="font-semibold">{formatCurrency(deposit)}</span>
            </div>
          )}
        </div>
      </div>

      {/* PIX Key */}
      {tenant.pixKey && deposit > 0 && (
        <div className="glass-card p-4">
          <p className="text-sm font-medium mb-2 text-white/80">Chave PIX para pagamento</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white/5 px-3 py-2 rounded-lg text-sm text-white/70 truncate">
              {tenant.pixKey}
            </code>
            <button
              onClick={onCopyPix}
              className={cn(
                "p-2.5 rounded-lg transition-all flex-shrink-0",
                copied ? "bg-success text-white" : "bg-white/10 hover:bg-white/20 text-white/60"
              )}
              id="btn-copy-pix"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Send via WhatsApp */}
      <button
        onClick={onSendWhatsApp}
        disabled={!state.customerName || !state.customerPhone}
        className="btn-primary w-full py-4 text-base"
        id="btn-send-whatsapp"
      >
        <MessageCircle className="w-5 h-5" />
        Enviar Pedido no WhatsApp
      </button>
    </div>
  );
}
