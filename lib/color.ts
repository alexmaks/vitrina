// Выбирает читаемый цвет текста (тёмный или белый) для заданного фона
// по относительной яркости — чтобы кнопки оставались читаемыми при любом
// акцентном цвете (например, на жёлтом нужен тёмный текст).
export function readableTextColor(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#FFFFFF'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1A1A1A' : '#FFFFFF'
}
