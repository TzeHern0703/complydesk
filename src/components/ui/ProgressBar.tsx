interface ProgressBarProps {
  value: number
  max: number
  label?: string
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex justify-between text-xs text-neutral-500">
          <span>{label}</span>
          <span className="font-medium text-neutral-900">
            {value} / {max}
          </span>
        </div>
      )}
      <div className="h-1 w-full rounded-full bg-neutral-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-neutral-900 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
