"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ActionButtonVariant =
  | "primary"
  | "secondary"
  | "subtle"
  | "ghost"
  | "danger"
  | "success";

type ActionButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASS_NAMES: Record<ActionButtonVariant, string> = {
  primary:
    "border border-transparent bg-primary text-white shadow-[0_18px_38px_-24px_rgba(37,99,235,0.58)] hover:bg-primary-hover",
  secondary:
    "border border-[var(--app-border)] bg-white text-slate-700 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.2)] hover:border-sky-200 hover:bg-slate-50 hover:text-slate-900",
  subtle:
    "border border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900",
  ghost:
    "border border-transparent bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  danger:
    "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700",
  success:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
};

const SIZE_CLASS_NAMES: Record<ActionButtonSize, string> = {
  sm: "h-9 rounded-full px-4 text-sm",
  md: "h-11 rounded-full px-5 text-sm",
  lg: "h-12 rounded-full px-6 text-[15px]",
};

interface BaseActionButtonProps {
  href?: string;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type ActionButtonProps = BaseActionButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement>;

function ActionButtonContent({
  icon,
  trailingIcon,
  children,
}: Pick<BaseActionButtonProps, "icon" | "trailingIcon" | "children">) {
  return (
    <>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="truncate">{children}</span>
      {trailingIcon ? <span className="shrink-0">{trailingIcon}</span> : null}
    </>
  );
}

export function ActionButton({
  href,
  icon,
  trailingIcon,
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ActionButtonProps) {
  const classNames = cn(
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
    "disabled:pointer-events-none disabled:opacity-55",
    VARIANT_CLASS_NAMES[variant],
    SIZE_CLASS_NAMES[size],
    fullWidth ? "w-full" : "",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-disabled={disabled}
        onClick={disabled ? (event) => event.preventDefault() : undefined}
        className={classNames}
      >
        <ActionButtonContent icon={icon} trailingIcon={trailingIcon}>
          {children}
        </ActionButtonContent>
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={classNames} {...props}>
      <ActionButtonContent icon={icon} trailingIcon={trailingIcon}>
        {children}
      </ActionButtonContent>
    </button>
  );
}
