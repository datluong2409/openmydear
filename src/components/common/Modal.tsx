import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  compact?: boolean;
  children: ReactNode;
}

export function Modal({ open, onClose, onConfirm, title, compact, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && onConfirm) {
        e.preventDefault();
        onConfirm();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[100] animate-[fadeIn_0.15s_ease]"
      style={{ background: "rgba(0,0,0,0.4)" }}
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-[90%] max-w-[460px] max-h-[85vh] overflow-auto rounded-[var(--radius-lg)] animate-[slideUp_0.15s_ease]"
        style={{
          background: "var(--color-bg-secondary)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div
          className={`flex items-center justify-between ${compact ? "px-4 pt-3 pb-2" : "px-5 pt-4 pb-3"}`}
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <h3 className={`${compact ? "text-[13px]" : "text-[15px]"} font-semibold`}>{title}</h3>
          <button
            className={`${compact ? "w-6 h-6 text-[16px]" : "w-7 h-7 text-[18px]"} flex items-center justify-center rounded-[var(--radius-sm)] transition-colors cursor-pointer`}
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-bg-hover)";
              e.currentTarget.style.color = "var(--color-text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="px-5 pt-4 pb-5">{children}</div>
      </div>
    </div>
  );
}
