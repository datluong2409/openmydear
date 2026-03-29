import { type CSSProperties } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}

const variantStyles: Record<string, CSSProperties> = {
  primary: {
    background: "var(--color-primary)",
    color: "var(--color-primary-text)",
  },
  secondary: {
    background: "var(--color-bg-hover)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
  },
  danger: {
    background: "var(--color-danger)",
    color: "white",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-text-secondary)",
  },
};

const sizeClasses: Record<string, string> = {
  md: "px-[14px] py-[6px] text-[13px]",
  sm: "px-[10px] py-[4px] text-[12px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-[6px] rounded-[var(--radius-sm)] font-medium transition-all duration-150 whitespace-nowrap select-none disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        className || "",
      ].join(" ")}
      style={{ ...variantStyles[variant], ...style }}
      onMouseEnter={(e) => {
        if (props.disabled) return;
        const el = e.currentTarget;
        if (variant === "primary") el.style.background = "var(--color-primary-hover)";
        else if (variant === "secondary") el.style.background = "var(--color-border)";
        else if (variant === "danger") el.style.background = "var(--color-danger-hover)";
        else if (variant === "ghost") {
          el.style.background = "var(--color-bg-hover)";
          el.style.color = "var(--color-text)";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        const base = variantStyles[variant];
        el.style.background = (base.background as string) ?? "";
        el.style.color = (base.color as string) ?? "";
      }}
      {...props}
    >
      {children}
    </button>
  );
}
