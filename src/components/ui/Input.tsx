import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded border border-neutral-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-zinc-500 focus:border-neutral-900 dark:focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-purple-500 ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-neutral-900 dark:text-zinc-300 font-medium">{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`rounded border border-neutral-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-zinc-500 focus:border-neutral-900 dark:focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-purple-500 resize-none ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-neutral-900 dark:text-zinc-300 font-medium">{error}</p>}
    </div>
  )
}
