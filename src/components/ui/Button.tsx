import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { OUTLINE_BORDER } from "@/lib/ui/styles";

type Variant = "primary" | "outline";
type Size = "sm" | "md" | "pill";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc]",
  outline: `border ${OUTLINE_BORDER}`,
};

const SIZES: Record<Size, string> = {
  sm: "rounded-md px-3 py-1.5 text-xs font-medium",
  md: "rounded-md px-4 py-2 text-sm font-medium",
  pill: "rounded-full px-5 py-3 text-sm font-medium",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
