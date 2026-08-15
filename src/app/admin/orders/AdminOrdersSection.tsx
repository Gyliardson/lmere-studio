"use client";

import { useEffect, useId, useState } from "react";
import { Clock, ShoppingBag, X } from "lucide-react";

import { formatCurrency } from "@/lib/pricing";
import type { CustomFieldSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useModalFocus } from "../components/AdminControls";

export interface AdminOrder {
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
  selectionSnapshot?: string;
}

function depositLabel(mode?: string) {
  if (mode === "50_percent") return "Sinal (50%)";
  if (mode === "100_percent") return "Pagamento integral";
  if (mode === "quote_only") return "Orçamento (sem sinal)";
  return "Sinal";
}

function historicalCustomFields(snapshot?: string): CustomFieldSnapshot[] {
  if (!snapshot) return [];
  try {
    const parsed = JSON.parse(snapshot) as { customFields?: unknown };
    if (!Array.isArray(parsed.customFields)) return [];
    return parsed.customFields.filter((entry): entry is CustomFieldSnapshot => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
      const item = entry as Record<string, unknown>;
      return typeof item.id === "string" && typeof item.label === "string" && typeof item.value === "string"
        && (item.type === "text" || item.type === "select" || item.type === "number");
    });
  } catch {
    return [];
  }
}

async function requestOrders(tenantId: string): Promise<AdminOrder[]> {
  const response = await fetch(`/api/admin/orders?tenantId=${tenantId}`);
  if (!response.ok) throw new Error("Não foi possível carregar pedidos");
  const data = await response.json() as { orders?: AdminOrder[] };
  return data.orders || [];
}

export function AdminOrdersSection({ tenantId, showToast }: { tenantId: string; showToast: (message: string) => void }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const orderDialogTitleId = useId();
  const orderDialogRef = useModalFocus<HTMLDivElement>(Boolean(selectedOrder), () => setSelectedOrder(null));

  useEffect(() => {
    let active = true;
    void requestOrders(tenantId)
      .then((nextOrders) => { if (active) setOrders(nextOrders); })
      .catch(() => { if (active) showToast("Erro ao carregar pedidos"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tenantId, showToast]);

  const refreshOrders = async () => {
    setLoading(true);
    try {
      setOrders(await requestOrders(tenantId));
    } catch {
      showToast("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (response.ok) {
        showToast("Status atualizado com sucesso!");
        if (selectedOrder) setSelectedOrder({ ...selectedOrder, status });
        await refreshOrders();
      } else {
        showToast("Não foi possível atualizar status");
      }
    } catch {
      showToast("Erro ao atualizar status");
    }
  };

  const filteredOrders = orders.filter((order) => (filter === "all" ? true : order.status === filter));
  const selectedCustomFields = historicalCustomFields(selectedOrder?.selectionSnapshot);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Gestão de Pedidos</h1>
          <p className="text-white/50 text-xs sm:text-sm">Acompanhe as encomendas recebidas</p>
        </div>
        <button onClick={() => void refreshOrders()} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
          <Clock aria-hidden="true" className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { id: "all", label: "Todos" },
          { id: "pending", label: "Pendentes" },
          { id: "confirmed", label: "Confirmados" },
          { id: "completed", label: "Concluídos" },
          { id: "cancelled", label: "Cancelados" },
        ].map((tab) => (
          <button key={tab.id} aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)} className={cn("px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0", filter === tab.id ? "bg-brand-primary text-white shadow-md" : "glass-card text-white/60 hover:text-white")}>
            {tab.label} ({orders.filter((order) => (tab.id === "all" ? true : order.status === tab.id)).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-white/50" role="status" aria-live="polite">Carregando pedidos...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card p-12 text-center text-white/40">
          <ShoppingBag aria-hidden="true" className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="text-sm font-medium">Nenhum pedido encontrado nesta categoria</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredOrders.map((order) => (
            <button type="button" key={order.id} onClick={() => setSelectedOrder(order)} className="glass-card p-4 hover:border-brand-primary/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <span className="space-y-1 min-w-0">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-base truncate">{order.customerName}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider", order.status === "pending" && "bg-amber-500/20 text-amber-300 border border-amber-500/30", order.status === "confirmed" && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30", order.status === "completed" && "bg-purple-500/20 text-purple-300 border border-purple-500/30", order.status === "cancelled" && "bg-rose-500/20 text-rose-300 border border-rose-500/30")}>{order.status}</span>
                </span>
                <span className="text-xs text-white/60 flex items-center gap-2 flex-wrap">
                  <span>Data: <strong>{order.eventDate}</strong></span><span>•</span><span>Whats: {order.customerPhone}</span>
                </span>
                {order.cakeSize && <span className="text-xs text-brand-primary/90 font-medium truncate block">{order.cakeSize.name} ({order.cakeSize.servings})</span>}
              </span>
              <span className="flex items-center justify-between sm:flex-col sm:items-end gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                <span className="text-base font-bold text-white">{formatCurrency(order.subtotal)}</span>
                <span className="text-[11px] text-white/50">Sinal: {formatCurrency(order.depositAmount)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div ref={orderDialogRef} role="dialog" aria-modal="true" aria-labelledby={orderDialogTitleId} tabIndex={-1} className="glass-card p-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto space-y-5 border border-white/20">
            <div className="flex items-start justify-between">
              <div>
                <h3 id={orderDialogTitleId} className="text-lg font-bold text-white">{selectedOrder.customerName}</h3>
                <p className="text-xs text-white/50">{selectedOrder.customerPhone} • Evento: {selectedOrder.eventDate}</p>
              </div>
              <button aria-label="Fechar detalhes do pedido" onClick={() => setSelectedOrder(null)} className="p-1 rounded-lg hover:bg-white/10"><X aria-hidden="true" className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs bg-white/5 p-4 rounded-xl border border-white/5">
              {selectedOrder.cakeMessage && <div><span className="text-white/40 block mb-0.5">Mensagem da Placa:</span><span className="font-semibold text-brand-primary text-sm">&quot;{selectedOrder.cakeMessage}&quot;</span></div>}
              {selectedOrder.details && <div><span className="text-white/40 block mb-0.5">Observações:</span><p className="text-white/80 whitespace-pre-wrap break-words">{selectedOrder.details}</p></div>}
              {selectedCustomFields.length > 0 && <div><span className="text-white/40 block mb-1">Informações personalizadas:</span><dl className="space-y-1.5">{selectedCustomFields.map((field) => <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3"><dt className="text-white/50 break-words">{field.label}</dt><dd className="text-white/90 break-words">{field.value}</dd></div>)}</dl></div>}
              {selectedOrder.referenceImageUrl && <div><span className="text-white/40 block mb-1">Foto de Referência:</span><img src={selectedOrder.referenceImageUrl} alt="Referência" referrerPolicy="no-referrer" className="w-full max-h-48 object-cover rounded-lg border border-white/10" /></div>}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <div><span className="text-xs text-white/50 block">Valor Total</span><span className="text-lg font-bold text-white">{formatCurrency(selectedOrder.subtotal)}</span></div>
              <div className="text-right"><span className="text-xs text-white/50 block">{depositLabel(selectedOrder.depositMode)}</span><span className="text-sm font-bold text-brand-secondary">{formatCurrency(selectedOrder.depositAmount)}</span></div>
            </div>
            <div>
              <span className="block text-xs font-medium text-white/70 mb-2">Alterar Status do Pedido</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "pending", label: "Pendente" },
                  { id: "confirmed", label: "Confirmado" },
                  { id: "completed", label: "Concluído" },
                  { id: "cancelled", label: "Cancelado" },
                ].map((status) => (
                  <button key={status.id} aria-pressed={selectedOrder.status === status.id} onClick={() => updateOrderStatus(selectedOrder.id, status.id)} className={cn("px-3 py-2 rounded-lg text-xs font-medium transition-all text-center", selectedOrder.status === status.id ? "bg-brand-primary text-white font-bold" : "bg-white/5 hover:bg-white/10 text-white/60")}>{status.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
