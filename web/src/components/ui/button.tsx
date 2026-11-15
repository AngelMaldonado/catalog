import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { tv, type VariantProps } from 'tailwind-variants'
import { cn } from '../../lib/utils'
import { marcarDireccion } from '../../lib/transicion'

// Mismas variantes que Comandas (shadcn): botones de 44 px, muy redondeados.
export const buttonVariants = tv({
  base: "focus-visible:border-ring focus-visible:ring-ring/30 inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-4xl border border-transparent bg-clip-padding text-sm font-medium transition-all outline-none select-none focus-visible:ring-3 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/80',
      outline: 'border-border bg-background hover:bg-muted dark:bg-transparent dark:hover:bg-input/30',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]',
      ghost: 'hover:bg-muted dark:hover:bg-muted/50',
      destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-11 px-4 text-base',
      sm: 'h-9 gap-1.5 px-3',
      lg: 'h-12 px-5 text-base font-semibold',
      icon: 'size-11',
      'icon-sm': 'size-8',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

type Variantes = VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & Variantes) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

/** Un enlace con aspecto de botón; navega con transición de vista. */
export function ButtonLink({ to, className, variant, size, children, ...rest }: { to: string; className?: string; children: ReactNode; 'aria-label'?: string } & Variantes) {
  const { pathname } = useLocation()
  return (
    <Link to={to} viewTransition onClick={() => marcarDireccion(pathname, to)} className={cn(buttonVariants({ variant, size }), className)} {...rest}>
      {children}
    </Link>
  )
}
