export function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-BR' : locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDuration(value: number | null): string {
  if (value === null || value < 0) return '--';
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
