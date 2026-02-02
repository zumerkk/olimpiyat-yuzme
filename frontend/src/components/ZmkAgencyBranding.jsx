// ═══════════════════════════════════════════════════════════════════════════════
//                    ZMK AGENCY Branding Component
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ZMK Agency marka bileşeni - logo ve "ZMK AGENCY Ürünüdür." metni
 * Tıklanınca https://zmkagency.com/ adresine yönlendirir
 * @param variant - 'default' (açık arka plan), 'light' (koyu arka plan), 'compact' (sidebar)
 */
export default function ZmkAgencyBranding({ variant = 'default', className = '' }) {
  const isLightBg = variant === 'default' || variant === 'compact'
  const baseClasses = 'inline-flex items-center gap-2 transition-opacity hover:opacity-90'
  const linkClasses = isLightBg
    ? 'flex items-center gap-2 py-2 px-3 rounded-lg bg-black text-white'
    : variant === 'compact'
      ? 'flex items-center gap-2 py-2 px-3 rounded-lg'
      : 'flex items-center gap-2'

  const textClasses = {
    default: 'text-sm text-white',
    light: 'text-sm text-white/80 hover:text-white',
    compact: 'text-xs text-white',
  }

  const logoSize = variant === 'compact' ? 'h-6 w-auto' : 'h-8 w-auto'

  return (
    <a
      href="https://zmkagency.com/"
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseClasses} ${linkClasses} ${className}`}
      title="ZMK Agency - Digital Renaissance"
    >
      <img
        src="/zmk-agency-logo.png"
        alt="ZMK Agency"
        className={`${logoSize} flex-shrink-0`}
      />
      <span className={textClasses[variant] || (isLightBg ? 'text-sm text-white' : textClasses.light)}>
        ZMK AGENCY Ürünüdür.
      </span>
    </a>
  )
}
