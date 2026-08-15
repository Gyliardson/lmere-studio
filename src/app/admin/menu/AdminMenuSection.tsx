"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { Edit3, Plus, Sparkles, Trash2, UtensilsCrossed, X } from "lucide-react";

import { formatCurrency } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import {
  ConfirmModal,
  CurrencyInput,
  CustomSelect,
  ImageUploaderDropzone,
  StyledCheckbox,
  useModalFocus,
} from "../components/AdminControls";

type MenuTab = "sizes" | "flavors" | "addons";

interface MenuSizeItem { id: string; name: string; servings: string; weightKg: number; basePrice: number; maxFillings: number; sortOrder: number; active: boolean; }
interface MenuFlavorItem { id: string; name: string; type: string; additionalPrice: number; isSpecial: boolean; imageUrl: string; active: boolean; sortOrder: number; }
interface MenuAddonItem { id: string; name: string; description: string; price: number; imageUrl: string; active: boolean; sortOrder: number; }
type MenuSizeDraft = Omit<MenuSizeItem, "id"> & { id?: string };
type MenuFlavorDraft = Omit<MenuFlavorItem, "id"> & { id?: string };
type MenuAddonDraft = Omit<MenuAddonItem, "id"> & { id?: string };
type MenuEditModal = { type: "size"; item: MenuSizeDraft } | { type: "flavor"; item: MenuFlavorDraft } | { type: "addon"; item: MenuAddonDraft };
interface MenuData { sizes: MenuSizeItem[]; flavors: MenuFlavorItem[]; addons: MenuAddonItem[]; }

async function responseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null) as { error?: string } | null;
  return data?.error || fallback;
}

export function AdminMenuSection({ tenantId, showToast }: { tenantId: string; showToast: (message: string) => void }) {
  const [menu, setMenu] = useState<MenuData>({ sizes: [], flavors: [], addons: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MenuTab>("sizes");
  const [editModal, setEditModal] = useState<MenuEditModal | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; type: string; id: string; name: string }>({ isOpen: false, type: "", id: "", name: "" });
  const editDialogTitleId = useId();
  const editDialogRef = useModalFocus<HTMLFormElement>(Boolean(editModal), () => setEditModal(null));

  const fetchMenu = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/menu?tenantId=${tenantId}`);
      if (!response.ok) {
        showToast(await responseError(response, "Não foi possível carregar cardápio"));
        return false;
      }
      setMenu(await response.json());
      return true;
    } catch {
      showToast("Erro ao carregar cardápio");
      return false;
    } finally {
      setLoading(false);
    }
  }, [tenantId, showToast]);

  useEffect(() => {
    async function loadMenu() {
      try {
        const response = await fetch(`/api/admin/menu?tenantId=${tenantId}`);
        if (!response.ok) {
          showToast(await responseError(response, "Não foi possível carregar cardápio"));
          return;
        }
        setMenu(await response.json());
      } catch {
        showToast("Erro ao carregar cardápio");
      } finally {
        setLoading(false);
      }
    }
    void loadMenu();
  }, [tenantId, showToast]);

  const sanitizeItemForApi = (modal: MenuEditModal, isNew: boolean) => {
    switch (modal.type) {
      case "size": {
        const item = modal.item;
        const payload: Record<string, unknown> = { name: item.name, servings: item.servings, weightKg: Number(item.weightKg) || 0, basePrice: Number(item.basePrice) || 0, maxFillings: Number(item.maxFillings) || 1, sortOrder: Number(item.sortOrder) || 0, active: item.active !== false };
        if (!isNew) payload.id = item.id;
        return payload;
      }
      case "flavor": {
        const item = modal.item;
        const payload: Record<string, unknown> = { name: item.name, type: item.type || "RECHEIO", additionalPrice: Number(item.additionalPrice) || 0, isSpecial: Boolean(item.isSpecial), imageUrl: item.imageUrl || "", active: item.active !== false, sortOrder: Number(item.sortOrder) || 0 };
        if (!isNew) payload.id = item.id;
        return payload;
      }
      case "addon": {
        const item = modal.item;
        const payload: Record<string, unknown> = { name: item.name, description: item.description || "", price: Number(item.price) || 0, imageUrl: item.imageUrl || "", active: item.active !== false, sortOrder: Number(item.sortOrder) || 0 };
        if (!isNew) payload.id = item.id;
        return payload;
      }
    }
  };

  const handleSaveItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!editModal) return;
    const isNew = !editModal.item.id;
    const sanitized = sanitizeItemForApi(editModal, isNew);
    const method = isNew ? "POST" : "PUT";
    const body = isNew ? { tenantId, itemType: editModal.type, ...sanitized } : { itemType: editModal.type, ...sanitized };
    try {
      const response = await fetch("/api/admin/menu", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (response.ok) {
        showToast(isNew ? "Item criado com sucesso!" : "Item atualizado com sucesso!");
        setEditModal(null);
        void fetchMenu();
      } else {
        showToast(await responseError(response, `Erro ao salvar (${response.status})`));
      }
    } catch {
      showToast("Erro ao salvar item");
    }
  };

  const requestDeleteItem = (type: string, id: string, name: string) => setConfirmDialog({ isOpen: true, type, id, name });
  const executeDeleteItem = async () => {
    const { type, id } = confirmDialog;
    setConfirmDialog({ isOpen: false, type: "", id: "", name: "" });
    try {
      const response = await fetch(`/api/admin/menu?id=${id}&type=${type}`, { method: "DELETE" });
      if (response.ok) {
        showToast("Item excluido com sucesso!");
        void fetchMenu();
      } else {
        showToast(await responseError(response, "Erro ao excluir item"));
      }
    } catch {
      showToast("Erro ao excluir item");
    }
  };

  const menuTabs: Array<{ id: MenuTab; label: string }> = [
    { id: "sizes", label: `Tamanhos (${menu.sizes.length})` },
    { id: "flavors", label: `Massas & Recheios (${menu.flavors.length})` },
    { id: "addons", label: `Adicionais (${menu.addons.length})` },
  ];

  return <div className="space-y-6"><div><h1 className="text-xl sm:text-2xl font-bold">Gestao do Cardapio</h1><p className="text-white/50 text-xs sm:text-sm">Configure os tamanhos, massas, recheios e adicionais oferecidos</p></div><div role="tablist" aria-label="Categorias do cardápio" className="flex border-b border-white/10 gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">{menuTabs.map((tab) => <button role="tab" aria-selected={activeTab === tab.id} key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("pb-3 text-xs sm:text-sm font-semibold transition-all relative flex-shrink-0", activeTab === tab.id ? "text-brand-primary" : "text-white/50 hover:text-white")}>{tab.label}{activeTab === tab.id && <span aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" />}</button>)}</div>{loading ? <div className="glass-card p-12 text-center text-white/50" role="status" aria-live="polite">Carregando cardapio...</div> : <div>{activeTab === "sizes" && <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><p className="text-xs text-white/50">Defina fatias, peso, preco base e limite de recheios</p><button onClick={() => setEditModal({ type: "size", item: { name: "", servings: "10-15 pessoas", weightKg: 1.5, basePrice: 120, maxFillings: 2, sortOrder: menu.sizes.length, active: true } })} className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3 self-start sm:self-auto"><Plus aria-hidden="true" className="w-4 h-4" /> Novo Tamanho</button></div><div className="grid gap-3">{menu.sizes.map((size) => <div key={size.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"><div className="space-y-1"><div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-white text-base">{size.name}</span><span className="badge badge-primary text-[11px]">{size.servings}</span><span className="px-2 py-0.5 rounded-full bg-white/5 text-white/70 text-[11px]">Max {size.maxFillings} recheios</span></div><p className="text-xs text-white/50">Peso estimado: {size.weightKg} kg</p></div><div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5"><span className="text-base font-bold text-white">{formatCurrency(size.basePrice)}</span><div className="flex items-center gap-2"><button aria-label={`Editar ${size.name}`} onClick={() => setEditModal({ type: "size", item: size })} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"><Edit3 aria-hidden="true" className="w-4 h-4" /></button><button aria-label={`Excluir ${size.name}`} onClick={() => requestDeleteItem("size", size.id, size.name)} className="p-2 rounded-lg bg-error/10 hover:bg-error/20 text-error"><Trash2 aria-hidden="true" className="w-4 h-4" /></button></div></div></div>)}</div></div>}{activeTab === "flavors" && <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><p className="text-xs text-white/50">Cadastre massas e recheios com imagem e valores adicionais</p><button onClick={() => setEditModal({ type: "flavor", item: { name: "", type: "RECHEIO", additionalPrice: 0, isSpecial: false, imageUrl: "", active: true, sortOrder: menu.flavors.length } })} className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3 self-start sm:self-auto"><Plus aria-hidden="true" className="w-4 h-4" /> Novo Sabor</button></div><div className="grid sm:grid-cols-2 gap-3">{menu.flavors.map((flavor) => <div key={flavor.id} className="glass-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"><div className="flex items-center gap-3 min-w-0">{flavor.imageUrl ? <img src={flavor.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><UtensilsCrossed aria-hidden="true" className="w-5 h-5 text-white/30" /></div>}<div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 flex-wrap"><span className="font-semibold text-sm truncate text-white">{flavor.name}</span>{flavor.isSpecial && <span className="badge badge-special text-[9px]">Especial</span>}</div><p className="text-xs text-white/40">{flavor.type === "MASSA" ? "Massa" : "Recheio"}</p></div></div><div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5"><span className="text-xs font-semibold text-brand-secondary">{flavor.additionalPrice > 0 ? `+${formatCurrency(flavor.additionalPrice)}` : "Grátis"}</span><div className="flex items-center gap-1.5"><button aria-label={`Editar ${flavor.name}`} onClick={() => setEditModal({ type: "flavor", item: flavor })} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80"><Edit3 aria-hidden="true" className="w-3.5 h-3.5" /></button><button aria-label={`Excluir ${flavor.name}`} onClick={() => requestDeleteItem("flavor", flavor.id, flavor.name)} className="p-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error"><Trash2 aria-hidden="true" className="w-3.5 h-3.5" /></button></div></div></div>)}</div></div>}{activeTab === "addons" && <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><p className="text-xs text-white/50">Itens adicionais opcionais (Toppers, embalagens, velas)</p><button onClick={() => setEditModal({ type: "addon", item: { name: "", description: "", price: 20, imageUrl: "", active: true, sortOrder: menu.addons.length } })} className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3 self-start sm:self-auto"><Plus aria-hidden="true" className="w-4 h-4" /> Novo Adicional</button></div><div className="grid gap-3">{menu.addons.map((addon) => <div key={addon.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"><div className="flex items-center gap-3">{addon.imageUrl ? <img src={addon.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><Sparkles aria-hidden="true" className="w-5 h-5 text-brand-primary/60" /></div>}<div><h4 className="font-bold text-sm text-white">{addon.name}</h4>{addon.description && <p className="text-xs text-white/50">{addon.description}</p>}</div></div><div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5"><span className="text-sm font-bold text-white">+{formatCurrency(addon.price)}</span><div className="flex items-center gap-1.5"><button aria-label={`Editar ${addon.name}`} onClick={() => setEditModal({ type: "addon", item: addon })} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><Edit3 aria-hidden="true" className="w-4 h-4 text-white/70" /></button><button aria-label={`Excluir ${addon.name}`} onClick={() => requestDeleteItem("addon", addon.id, addon.name)} className="p-2 rounded-lg bg-error/10 hover:bg-error/20 text-error"><Trash2 aria-hidden="true" className="w-4 h-4" /></button></div></div></div>)}</div></div>}</div>}{editModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"><form ref={editDialogRef} role="dialog" aria-modal="true" aria-labelledby={editDialogTitleId} tabIndex={-1} onSubmit={handleSaveItem} className="glass-card p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto space-y-4 border border-white/20"><div className="flex justify-between items-center"><h3 id={editDialogTitleId} className="font-bold text-lg text-white">{editModal.item.id ? "Editar Item" : "Criar Novo Item"}</h3><button aria-label="Fechar edição do item" type="button" onClick={() => setEditModal(null)} className="p-1 rounded-lg hover:bg-white/10"><X aria-hidden="true" className="w-5 h-5" /></button></div>{editModal.type === "size" && <div className="space-y-3"><div><label className="block text-xs font-medium text-white/70 mb-1">Nome do Tamanho</label><input type="text" required value={editModal.item.name} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, name: event.target.value } })} className="input-field" placeholder="Ex: Medio" /></div><div><label className="block text-xs font-medium text-white/70 mb-1">Rendimento / Pessoas</label><input type="text" required value={editModal.item.servings} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, servings: event.target.value } })} className="input-field" placeholder="Ex: 20-25 pessoas" /></div><div className="grid grid-cols-2 gap-3"><CurrencyInput label="Preco Base (R$)" value={editModal.item.basePrice} onChange={(value) => setEditModal({ ...editModal, item: { ...editModal.item, basePrice: value } })} required /><div><label className="block text-xs font-medium text-white/70 mb-1">Max Recheios Permitidos</label><input type="number" min="1" max="10" required value={editModal.item.maxFillings} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, maxFillings: parseInt(event.target.value) || 1 } })} className="input-field" aria-label="Máximo de recheios permitidos" /></div></div></div>}{editModal.type === "flavor" && <div className="space-y-3"><div><label className="block text-xs font-medium text-white/70 mb-1">Nome do Sabor</label><input type="text" required value={editModal.item.name} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, name: event.target.value } })} className="input-field" placeholder="Ex: Ninho com Nutella" /></div><ImageUploaderDropzone label="Imagem Ilustrativa do Sabor" value={editModal.item.imageUrl || ""} onChange={(url) => setEditModal({ ...editModal, item: { ...editModal.item, imageUrl: url } })} aspect="square" /><CustomSelect label="Categoria" value={editModal.item.type} onChange={(value) => setEditModal({ ...editModal, item: { ...editModal.item, type: value } })} options={[{ value: "MASSA", label: "Massa do Bolo" }, { value: "RECHEIO", label: "Recheio do Bolo" }]} /><div className="grid grid-cols-2 gap-3 items-end"><CurrencyInput label="Valor Adicional (R$)" value={editModal.item.additionalPrice} onChange={(value) => setEditModal({ ...editModal, item: { ...editModal.item, additionalPrice: value } })} /><div><span className="block text-xs font-medium text-white/70 mb-1">Destaque</span><StyledCheckbox checked={editModal.item.isSpecial} onChange={(checked) => setEditModal({ ...editModal, item: { ...editModal.item, isSpecial: checked } })} label="Sabor Especial" /></div></div></div>}{editModal.type === "addon" && <div className="space-y-3"><div><label className="block text-xs font-medium text-white/70 mb-1">Nome do Adicional</label><input type="text" required value={editModal.item.name} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, name: event.target.value } })} className="input-field" placeholder="Ex: Topo de Bolo Personalizado" /></div><ImageUploaderDropzone label="Imagem do Adicional (Opcional)" value={editModal.item.imageUrl || ""} onChange={(url) => setEditModal({ ...editModal, item: { ...editModal.item, imageUrl: url } })} aspect="square" /><div><label className="block text-xs font-medium text-white/70 mb-1">Descricao</label><input type="text" value={editModal.item.description} onChange={(event) => setEditModal({ ...editModal, item: { ...editModal.item, description: event.target.value } })} className="input-field" placeholder="Ex: Topo em acrilico com nome" /></div><CurrencyInput label="Preco (R$)" value={editModal.item.price} onChange={(value) => setEditModal({ ...editModal, item: { ...editModal.item, price: value } })} required /></div>}<div className="pt-2 flex justify-end gap-2"><button type="button" onClick={() => setEditModal(null)} className="btn-secondary text-xs">Cancelar</button><button type="submit" className="btn-primary text-xs font-semibold">Salvar Alteracoes</button></div></form></div>}<ConfirmModal isOpen={confirmDialog.isOpen} title="Excluir Item" message={`Tem certeza que deseja excluir "${confirmDialog.name}"? Esta acao nao pode ser desfeita.`} confirmLabel="Sim, Excluir" cancelLabel="Cancelar" variant="danger" onConfirm={executeDeleteItem} onCancel={() => setConfirmDialog({ isOpen: false, type: "", id: "", name: "" })} /></div>;
}
