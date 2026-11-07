import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[var(--school-primary)] text-white hover:brightness-90',
        secondary: 'bg-secondary text-secondary-foreground hover:brightness-95',
        outline: 'border border-input bg-background hover:bg-muted',
        ghost: 'hover:bg-muted',
        destructive:
          'bg-destructive text-destructive-foreground hover:brightness-90',
      },
      size: {
        default: '',
        sm: 'min-h-9 rounded px-3 text-xs',
        lg: 'min-h-11 px-6',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return (
    <Component
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  )
}
