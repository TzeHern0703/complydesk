import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  children: ReactNode
}

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-sm shadow-indigo-200',
  secondary: 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 hover:border-indigo-300',
  ghost: 'bg-transparent text-neutral-600 border-transparent hover:bg-indigo-50 hover:text-indigo-700',
  danger: 'bg-white text-red-600 border-red-200 hover:bg-red-50',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function Button({ variant = 'secondary', size = 'md', children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
