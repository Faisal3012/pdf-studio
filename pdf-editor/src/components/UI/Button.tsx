import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  children?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#23483B] text-[#FFFEFA] hover:bg-[#19392F] focus-visible:ring-[#C3A46B] dark:bg-[#A7C4AD] dark:text-[#171C19] dark:hover:bg-[#C2D8C6] shadow-xs',
  secondary:
    'bg-[#FFFEFA] text-[#202820] border border-[#DEDCCF] hover:bg-[#F5F2EA] dark:bg-[#262E29] dark:text-[#F0F0E8] dark:border-[#39443C] dark:hover:bg-[#202722] shadow-xs',
  ghost:
    'bg-transparent text-[#73776E] hover:bg-[#EAE6DC] dark:text-[#ADB5AA] dark:hover:bg-[#202722]',
  danger:
    'bg-[#B94B45] text-white hover:bg-[#9B3C37] focus-visible:ring-red-400 dark:bg-[#D9625C] dark:hover:bg-[#B94B45]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled ?? loading

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium rounded-lg',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : icon ? (
        <span aria-hidden="true">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </button>
  )
}
