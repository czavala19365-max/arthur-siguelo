import { ESTADO_STYLES } from '@/lib/estados'

export default function EstadoBadge({ estado }: { estado: string }) {
  const style = ESTADO_STYLES[estado.toUpperCase()]
  if (style) {
    return (
      <span
        className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {estado}
      </span>
    )
  }
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 whitespace-nowrap">
      {estado}
    </span>
  )
}
