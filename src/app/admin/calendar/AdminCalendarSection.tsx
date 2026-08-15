"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { CustomSelect } from "../components/AdminControls";

interface BlockedDateItem {
  id: string;
  date: string;
  reason: string;
}

interface WorkScheduleItem {
  dayOfWeek: number;
  isOpen: boolean;
}

export function AdminCalendarSection({ tenantId, showToast }: { tenantId: string; showToast: (message: string) => void }) {
  const [blockedDates, setBlockedDates] = useState<BlockedDateItem[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("Agenda Lotada");
  const daysName = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

  const fetchCalendar = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/calendar?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
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
    async function loadCalendar() {
      try {
        const response = await fetch(`/api/admin/calendar?tenantId=${tenantId}`);
        if (response.ok) {
          const data = await response.json();
          setBlockedDates(data.blockedDates || []);
          setWorkSchedule(data.workSchedule || []);
        }
      } catch {
        showToast("Erro ao carregar agenda");
      } finally {
        setLoading(false);
      }
    }
    void loadCalendar();
  }, [tenantId, showToast]);

  const toggleDayOpen = async (dayOfWeek: number, currentOpen: boolean) => {
    try {
      const response = await fetch("/api/admin/calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, dayOfWeek, isOpen: !currentOpen }),
      });
      if (response.ok) {
        showToast("Horario atualizado!");
        void fetchCalendar();
      }
    } catch {
      showToast("Erro ao atualizar horario");
    }
  };

  const handleBlockDate = async () => {
    if (!newDate) return;
    try {
      const response = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, date: newDate, reason: newReason }),
      });
      if (response.ok) {
        showToast("Data bloqueada com sucesso!");
        setNewDate("");
        void fetchCalendar();
      } else {
        const data = await response.json();
        showToast(data.error || "Erro ao bloquear data");
      }
    } catch {
      showToast("Erro ao bloquear data");
    }
  };

  const handleUnblockDate = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/calendar?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        showToast("Data desbloqueada!");
        void fetchCalendar();
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
        <div className="glass-card p-12 text-center text-white/50" role="status" aria-live="polite">Carregando configuracoes da agenda...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2"><CalendarIcon aria-hidden="true" className="w-5 h-5 text-brand-primary" /><h2 className="font-bold text-base">Dias de Funcionamento Semanal</h2></div>
            <p className="text-xs text-white/50">Marque os dias em que a confeitaria atende pedidos</p>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                const item = workSchedule.find((entry) => entry.dayOfWeek === dayIdx);
                const isOpen = item ? item.isOpen : true;
                return (
                  <div key={dayIdx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-sm font-medium">{daysName[dayIdx]}</span>
                    <button aria-pressed={isOpen} onClick={() => toggleDayOpen(dayIdx, isOpen)} className={cn("px-3 py-1 rounded-full text-xs font-semibold transition-all", isOpen ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30")}>{isOpen ? "Aberto" : "Fechado"}</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2"><Ban aria-hidden="true" className="w-5 h-5 text-brand-secondary" /><h2 className="font-bold text-base">Bloquear Data Específica</h2></div>
            <p className="text-xs text-white/50">Bloqueie datas para feriados, folgas ou quando a agenda estiver cheia</p>
            <div className="space-y-3 pt-2">
              <div>
                <label htmlFor="admin-block-date" className="block text-xs font-medium text-white/70 mb-1">Selecione a Data</label>
                <div className="flex gap-2 items-center">
                  <input id="admin-block-date" type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} className="input-field text-xs flex-1" />
                  <button type="button" onClick={() => setNewDate(new Date().toISOString().split("T")[0])} className="btn-secondary text-[11px] py-2 px-2.5 flex-shrink-0">Hoje</button>
                  <button type="button" onClick={() => { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); setNewDate(tomorrow.toISOString().split("T")[0]); }} className="btn-secondary text-[11px] py-2 px-2.5 flex-shrink-0">Amanhã</button>
                </div>
              </div>
              <CustomSelect label="Motivo do Bloqueio" value={newReason} onChange={setNewReason} options={[{ value: "Agenda Lotada", label: "Agenda Lotada / Esgotado" }, { value: "Feriado", label: "Feriado Nacional / Municipal" }, { value: "Folga / Manutencao", label: "Folga do Ateliê / Manutenção" }, { value: "Ferias Coletivas", label: "Férias Coletivas" }]} />
              <button onClick={handleBlockDate} disabled={!newDate} className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 mt-2"><Plus aria-hidden="true" className="w-4 h-4" /> Bloquear Data</button>
            </div>
            <div className="pt-4 border-t border-white/10 space-y-2">
              <h3 className="text-xs font-bold text-white/70">Datas Bloqueadas ({blockedDates.length})</h3>
              {blockedDates.length === 0 ? (
                <p className="text-xs text-white/40">Nenhuma data bloqueada manualmente.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {blockedDates.map((blockedDate) => (
                    <div key={blockedDate.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs">
                      <div><span className="font-semibold text-white">{blockedDate.date}</span><span className="text-white/50 ml-2">({blockedDate.reason})</span></div>
                      <button aria-label={`Desbloquear ${blockedDate.date}`} onClick={() => handleUnblockDate(blockedDate.id)} className="p-1 text-error hover:bg-error/10 rounded"><Trash2 aria-hidden="true" className="w-3.5 h-3.5" /></button>
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
