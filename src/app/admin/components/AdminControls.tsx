"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronRight, Trash2, Upload } from "lucide-react";

import {
  imageUploadHelpText,
  SUPPORTED_IMAGE_MIME_TYPES,
  validateImageFileMetadata,
  validateImageReference,
} from "@/lib/image-reference";
import { cn } from "@/lib/utils";

export function useModalFocus<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = containerRef.current;
    if (!container) return;

    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
    const initial = focusables()[0] ?? container;
    initial.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  return containerRef;
}

export function ConfirmModal({
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
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen, onCancel);
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="confirm-card space-y-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", variant === "danger" ? "bg-error/15" : "bg-brand-primary/15")}>
            <AlertTriangle aria-hidden="true" className={cn("w-5 h-5", variant === "danger" ? "text-error" : "text-brand-primary")} />
          </div>
          <div>
            <h3 id={titleId} className="font-bold text-base text-white">{title}</h3>
            <p id={descriptionId} className="text-sm text-white/60 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="btn-secondary text-xs px-4 py-2">{cancelLabel}</button>
          <button onClick={onConfirm} className={cn("px-4 py-2 rounded-lg text-xs font-semibold transition-all", variant === "danger" ? "bg-error hover:bg-error/80 text-white" : "btn-primary")}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function StyledCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("checkbox-styled", checked && "checked")}>
      <span className="check-icon" aria-hidden="true">{checked && <Check className="w-3 h-3 text-white" />}</span>
      <span>{label}</span>
    </button>
  );
}

export function CurrencyInput({ value, onChange, label, required = false }: { value: number; onChange: (value: number) => void; label: string; required?: boolean }) {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const inputId = useId();
  const displayValue = draftValue ?? String(value);

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium text-white/70 mb-1">{label}</label>
      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        required={required}
        value={displayValue}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "" || raw === "-") {
            setDraftValue(raw);
            return;
          }
          if (/^\d*\.?\d*$/.test(raw)) {
            setDraftValue(raw);
            const parsed = parseFloat(raw);
            if (!Number.isNaN(parsed)) onChange(parsed);
          }
        }}
        onBlur={() => {
          const parsed = parseFloat(displayValue);
          if (Number.isNaN(parsed) || displayValue === "") onChange(0);
          else onChange(parsed);
          setDraftValue(null);
        }}
        className="input-field"
        placeholder="0.00"
      />
    </div>
  );
}

export function CustomSelect({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; label?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const labelId = useId();
  const listboxId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selectedOption = options[selectedIndex] || options[0];
  const openAtSelected = () => { setActiveIndex(selectedIndex); setIsOpen(true); };
  const selectActive = () => { const option = options[activeIndex]; if (option) onChange(option.value); setIsOpen(false); };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); if (!isOpen) openAtSelected(); else setActiveIndex((index) => Math.min(options.length - 1, index + 1)); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); if (!isOpen) openAtSelected(); else setActiveIndex((index) => Math.max(0, index - 1)); return; }
    if (event.key === "Home" && isOpen) { event.preventDefault(); setActiveIndex(0); return; }
    if (event.key === "End" && isOpen) { event.preventDefault(); setActiveIndex(Math.max(0, options.length - 1)); return; }
    if (event.key === "Escape" && isOpen) { event.preventDefault(); event.stopPropagation(); setIsOpen(false); return; }
    if ((event.key === "Enter" || event.key === " ") && isOpen) { event.preventDefault(); selectActive(); }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {label && <span id={labelId} className="block text-xs font-medium text-white/70 mb-1">{label}</span>}
      <button
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
        aria-label={label ? undefined : "Selecionar opção"}
        aria-activedescendant={isOpen && options[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined}
        onKeyDown={handleKeyDown}
        onClick={() => { if (isOpen) setIsOpen(false); else openAtSelected(); }}
        className="input-field text-left flex items-center justify-between gap-2 cursor-pointer bg-[#161225]/80 hover:bg-[#1c172e] transition-colors"
      >
        <span className="truncate text-white font-medium text-xs sm:text-sm">{selectedOption?.label}</span>
        <ChevronRight aria-hidden="true" className={cn("w-4 h-4 text-white/50 transition-transform duration-200 flex-shrink-0", isOpen && "rotate-90")} />
      </button>
      {isOpen && (
        <div id={listboxId} role="listbox" aria-labelledby={label ? labelId : undefined} className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#161225] border border-white/20 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5 animate-fade-in backdrop-blur-2xl">
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={cn("w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between gap-2", index === activeIndex && "ring-1 ring-brand-primary/70", option.value === value ? "bg-brand-primary text-white font-semibold shadow-md" : "text-white/80 hover:bg-white/10 hover:text-white")}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check aria-hidden="true" className="w-3.5 h-3.5 flex-shrink-0 text-white" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ImageUploaderDropzone({ label, value, onChange, aspect = "square" }: { label: string; value: string; onChange: (url: string) => void; aspect?: "square" | "banner" }) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState(() => value.startsWith("data:") ? "" : value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const helpId = useId();
  const errorId = useId();
  const urlInputId = useId();

  const processFile = (file: File) => {
    const validation = validateImageFileMetadata(file);
    if (!validation.ok) {
      setImageError(validation.message);
      return;
    }
    setImageError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUrlDraft("");
        onChange(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.[0]) processFile(event.dataTransfer.files[0]);
  };

  const validateUrlDraft = () => {
    if (!urlDraft.trim()) {
      setImageError(null);
      onChange("");
      return;
    }
    const validation = validateImageReference(urlDraft);
    if (!validation.ok || validation.kind !== "url") {
      setImageError(validation.ok ? "Use uma URL HTTPS válida." : validation.message);
      return;
    }
    setImageError(null);
    setUrlDraft(validation.value);
    onChange(validation.value);
  };

  return (
    <div className="space-y-1.5 flex flex-col justify-between h-full">
      <span className="block text-xs font-medium text-white/70">{label}</span>
      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_IMAGE_MIME_TYPES.join(",")}
        className="hidden"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) processFile(file);
          event.target.value = "";
        }}
      />
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-white/20 group bg-black/40 h-28 sm:h-32 flex items-center justify-center">
          <img src={value} alt={label} referrerPolicy="no-referrer" className={cn("object-cover", aspect === "banner" ? "w-full h-full" : "w-24 h-24 sm:w-28 sm:h-28 rounded-lg shadow-md border border-white/10")} />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button type="button" aria-label={`Trocar ${label}`} onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium flex items-center gap-1"><Upload aria-hidden="true" className="w-3.5 h-3.5" /> Trocar</button>
            <button type="button" aria-label={`Remover ${label}`} onClick={() => { setImageError(null); setUrlDraft(""); onChange(""); }} className="px-3 py-1.5 rounded-lg bg-error/40 hover:bg-error/60 text-white text-xs font-medium flex items-center gap-1"><Trash2 aria-hidden="true" className="w-3.5 h-3.5" /> Remover</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          aria-describedby={`${helpId} ${errorId}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn("border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 h-28 sm:h-32", isDragging ? "border-brand-primary bg-brand-primary/10" : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10")}
        >
          <Upload aria-hidden="true" className="w-5 h-5 text-white/40" />
          <span className="text-xs text-white/70 font-medium">Clique ou arraste uma imagem</span>
          <span id={helpId} className="text-[10px] text-white/40">{imageUploadHelpText()}</span>
        </button>
      )}
      <label htmlFor={urlInputId} className="sr-only">URL de {label}</label>
      <input
        id={urlInputId}
        type="url"
        value={urlDraft}
        onChange={(event) => { setUrlDraft(event.target.value); setImageError(null); if (!event.target.value) onChange(""); }}
        onBlur={validateUrlDraft}
        placeholder="Ou cole a URL da imagem (https://...)"
        className={cn("input-field text-[11px] py-1.5 mt-1", imageError && "border-error/60 focus:border-error")}
        aria-invalid={imageError ? true : undefined}
        aria-describedby={`${helpId} ${errorId}`}
      />
      {imageError && <p id={errorId} role="alert" className="text-[11px] text-error mt-1">{imageError}</p>}
    </div>
  );
}
