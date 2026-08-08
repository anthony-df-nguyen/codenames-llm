import type { ButtonHTMLAttributes } from "react";
import { selectableStyle } from "@/lib/ui/styles";
import { cn } from "@/lib/utils";

export interface OptionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  selected: boolean;
}

/**
 * A toggle in a mutually-exclusive picker (role, difficulty). Owns the
 * selected/unselected border treatment and the `aria-pressed` wiring so
 * every picker in the app behaves the same for keyboard and screen readers.
 */
export function OptionButton({
  selected,
  className,
  ...props
}: OptionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "border transition-colors",
        selectableStyle(selected),
        className,
      )}
      {...props}
    />
  );
}
