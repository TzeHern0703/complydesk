import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  children: ReactNode
}

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent dark:bg-purple-600 dark:hover:bg-purple-700 dark:shadow-purple-900',
  secondary: 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800',
  ghost: 'bg-transparent text-neutral-600 border-transparent hover:bg-neutral-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
  danger: 'bg-white text-red-600 border-red-200 hover:bg-red-50 dark:bg-zinc-900 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-900/20',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function Button({ variant = 'secondary', size = 'md', children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
