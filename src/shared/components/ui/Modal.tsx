"use client";

import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  /** Sticky footer — stays visible while body scrolls (e.g. Save / Cancel). */
  footer?: ReactNode;
}

export function Modal({ title, children, onClose, wide = false, footer }: ModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex max-h-[min(90vh,100dvh)] w-full flex-col rounded-t-2xl border border-surface-border bg-surface-card shadow-2xl sm:max-h-[90vh] sm:rounded-2xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-surface-border/60 px-4 py-4 sm:px-6">
          <h2 id="modal-title" className="text-lg font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-surface-border hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        {footer != null && (
          <div className="shrink-0 border-t border-surface-border/60 bg-surface-card px-4 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
