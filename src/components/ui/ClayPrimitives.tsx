import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  MoreHorizontal,
  X,
  Info,
} from 'lucide-react';

/* 1. Switch (Toggle) */
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const ClaySwitch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled }) => (
  <label className={`inline-flex items-center gap-2.5 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 shadow-inner ${
        checked ? 'bg-[#4A7C82]' : 'bg-slate-400/70'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#F4F9FB] shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
    {label && <span className="text-xs font-semibold">{label}</span>}
  </label>
);

/* 2. Toast (Snackbar) — top on mobile, bottom-right on desktop, 3s auto-dismiss */
export interface ToastMessage {
  id: number;
  text: string;
  variant?: 'success' | 'info' | 'warning';
}

export const ClayToastContainer: React.FC<{ toasts: ToastMessage[]; onDismiss: (id: number) => void }> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 left-4 right-4 md:top-auto md:left-auto md:bottom-6 md:right-6 z-[70] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto clay-hero px-4 py-3 text-white text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-2xl border border-white/20 max-w-md ml-auto w-full md:w-auto"
        >
          <div className="flex items-center gap-2">
            {t.variant === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            ) : t.variant === 'info' ? (
              <Info className="w-4 h-4 text-[#92C2C2] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#92C2C2] shrink-0" />
            )}
            <span>{t.text}</span>
          </div>
          <button onClick={() => onDismiss(t.id)} className="text-slate-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

/* 3. Confirm Modal (Dialog) */
export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export const ConfirmDialog: React.FC<{
  state: ConfirmDialogState | null;
  onClose: () => void;
}> = ({ state, onClose }) => {
  if (!state || !state.open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#ECF3F7] p-6 shadow-2xl border border-white space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              state.danger ? 'bg-rose-100 text-rose-600' : 'bg-[#92C2C2]/40 text-[#4A7C82]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2B3E50]">{state.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">{state.description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="clay-btn-soft px-4 py-2 text-xs font-semibold">
            ยกเลิก
          </button>
          <button
            onClick={() => {
              state.onConfirm();
              onClose();
            }}
            className={`px-5 py-2 text-xs font-bold rounded-full text-white shadow-md transition ${
              state.danger
                ? 'bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-105'
                : 'clay-btn-primary'
            }`}
          >
            {state.confirmLabel || 'ยืนยันดำเนินการ'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* 4. Accordion */
interface AccordionItem {
  id: string;
  title: React.ReactNode;
  subtitle?: string;
  content: React.ReactNode;
}

export const ClayAccordion: React.FC<{
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
}> = ({ items, allowMultiple = true, defaultOpenIds = [] }) => {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return allowMultiple ? [...prev, id] : [id];
    });
  };

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        return (
          <div key={item.id} className="rounded-2xl bg-white/75 border border-white/80 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-white/60 transition"
            >
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-[#2B3E50]">{item.title}</div>
                {item.subtitle && <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-3.5 pb-3 pt-1 border-t border-slate-200/60 text-xs text-slate-700">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* 5. Row Action Dropdown Menu (...) */
export interface DropdownAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export const RowActionDropdown: React.FC<{ actions: DropdownAction[] }> = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="clay-btn-soft p-1.5 text-slate-600 hover:text-[#2B3E50]"
        aria-label="เมนูคำสั่งเพิ่มเติม"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-[#ECF3F7] border border-white shadow-xl py-1.5 z-30">
          {actions.map((act) => (
            <button
              key={act.label}
              type="button"
              onClick={() => {
                setOpen(false);
                act.onClick();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#2B3E50] hover:bg-[#D5E4EC] flex items-center gap-2 transition"
            >
              {act.icon}
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* 6. Skeleton Loading */
export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="space-y-2.5 animate-pulse py-2">
    <div className="h-9 rounded-xl bg-slate-300/60 w-full" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-12 rounded-xl bg-white/50 w-full flex items-center gap-3 px-3">
        <div className="w-4 h-4 rounded bg-slate-300/70" />
        <div className="w-3 h-3 rounded-full bg-slate-300/70" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-slate-300/70 rounded w-1/3" />
          <div className="h-2.5 bg-slate-300/50 rounded w-1/2" />
        </div>
        <div className="w-12 h-6 rounded-full bg-slate-300/60" />
      </div>
    ))}
  </div>
);
