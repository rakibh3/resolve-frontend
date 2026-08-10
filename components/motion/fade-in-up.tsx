import { cn } from "@/lib/utils"
import { enterDelayStyle } from "@/lib/motion"

/**
 * A CSS-driven entrance.
 *
 * No client JS: the keyframes live in `globals.css` and the only per-item value
 * is a custom property, so this renders directly inside Server Components. Pass
 * `index` when mapping a list and the delays stagger themselves — capped, so a
 * long list's later items appear immediately rather than trickling in. A
 * stagger that keeps growing reads as lag, not as choreography.
 *
 * The element is the item itself, not a wrapper around it, so it can carry the
 * grid or flex classes of whatever it is animating into place.
 */
export function FadeInUp({
  index = 0,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { index?: number }) {
  return (
    <div
      className={cn("animate-fade-in-up", className)}
      style={enterDelayStyle(index)}
      {...props}
    >
      {children}
    </div>
  )
}

/** The same entrance without the rise — for content that shouldn't move. */
export function FadeIn({
  index = 0,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { index?: number }) {
  return (
    <div
      className={cn("animate-fade-in", className)}
      style={enterDelayStyle(index)}
      {...props}
    >
      {children}
    </div>
  )
}
