const numberFormatter = new Intl.NumberFormat('zh-TW', {
  maximumFractionDigits: 2,
})

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toLocaleString('zh-TW', {
    maximumFractionDigits: 2,
  })}%`
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-TW', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Taipei',
  }).format(new Date(value))
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Taipei',
  }).format(new Date(`${value}T12:00:00Z`))
}
