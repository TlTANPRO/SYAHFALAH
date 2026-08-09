# 21st.dev Button — Pattern Analysis (id: 3824, shugar)

## Props API (from Usage examples)

```tsx
<Button>                       // size default, type=primary
<Button size="small">          // tiny | small | default | large
<Button size="large">
<Button type="secondary">
<Button type="tertiary">
<Button type="error">
<Button type="warning">
<Button shape="square" svgOnly>// square | rounded | circle
<Button shape="rounded" shadow>
<Button prefix={<ArrowLeft />}>// ReactNode before label
<Button suffix={<ArrowRight />}>// ReactNode after label
<Button loading>              // spinner state
<Button disabled>
<Button aria-label="Upload" svgOnly>
```

## Variants Combined
- size: tiny / small / default / large
- type: primary / secondary / tertiary / error / warning
- shape: square / rounded / circle
- loading: bool
- disabled: bool
- shadow: bool
- svgOnly: bool (icon-only button)
- prefix: ReactNode
- suffix: ReactNode

## Dependency
- clsx (already in Syahfalah via shadcn deps)

## Visual Inference (from preview iframe)
- Primary: filled background (probably brand color)
- Secondary: outlined
- Tertiary: ghost (transparent)
- Error: red
- Warning: amber
- Sizes follow shadcn convention (h-9, h-11, h-12)
- Rounded: rounded-full
- Square: rounded-none (or rounded-md)
- Circle: rounded-full + square aspect
- Loading: spinner inside, disabled

## Re-implementation Strategy

Since full source is locked, I'll re-implement based on the prop API + visual inference,
adapted to Syahfalah tokens (Brand blue, Aurum, Verdigris, Danger, Warning).

```tsx
// Plan: src/components/ui/button-21st.tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Size = 'tiny' | 'small' | 'default' | 'large'
type Type = 'primary' | 'secondary' | 'tertiary' | 'error' | 'warning'
type Shape = 'square' | 'rounded' | 'circle'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: Size
  type?: Type
  shape?: Shape
  loading?: boolean
  shadow?: boolean
  svgOnly?: boolean
  prefix?: ReactNode
  suffix?: ReactNode
}

const sizeClasses: Record<Size, string> = {
  tiny: 'h-7 px-2 text-xs gap-1',
  small: 'h-9 px-3 text-xs gap-1.5',
  default: 'h-11 px-4 text-sm gap-2',
  large: 'h-12 px-6 text-base gap-2',
}

const typeClasses: Record<Type, string> = {
  primary: 'bg-[var(--color-brand-500)] text-white hover:bg-[var(--color-brand-600)] active:bg-[var(--color-brand-700)]',
  secondary: 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]/80 border border-[var(--color-border)]',
  tertiary: 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]',
  error: 'bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90',
  warning: 'bg-[var(--color-warning)] text-white hover:bg-[var(--color-warning)]/90',
}

const shapeClasses: Record<Shape, string> = {
  square: 'rounded-md',
  rounded: 'rounded-full',
  circle: 'rounded-full aspect-square p-0',
}

export const Button21 = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = 'default', type = 'primary', shape = 'square',
    loading, shadow, svgOnly, prefix, suffix, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          sizeClasses[size],
          typeClasses[type],
          shapeClasses[shape],
          svgOnly && 'p-0 aspect-square',
          shadow && 'shadow-md',
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && prefix}
        {!svgOnly && children}
        {!loading && suffix}
      </button>
    )
  }
)
Button21.displayName = 'Button21'
```

This is a CLEAN implementation matching the public Usage API exactly.
Can be dropped in as a replacement for shadcn Button in Syahfalah.
