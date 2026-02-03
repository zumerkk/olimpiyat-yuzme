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

  // Hero variant styles
  if (variant === 'hero') {
    return (
      <a
        href="https://zmkagency.com/"
        target="_blank"
        rel="noopener noreferrer"
        className={`flex flex-col items-center gap-4 group ${className}`}
        title="ZMK Agency - Digital Renaissance"
      >
        <div className="relative">
          <div className="absolute -inset-4 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all duration-500"></div>
          <img
            src="/zmk-logo.png"
            alt="ZMK Agency"
            className="h-24 w-auto relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70 group-hover:to-white transition-all duration-500 tracking-tight">
            ZMK AGENCY
          </span>
          <span className="text-white/60 text-sm tracking-[0.3em] font-light uppercase group-hover:text-white/80 transition-colors">
            ÜRÜNÜDÜR
          </span>
        </div>
      </a>
    )
  }

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
        src="/zmk-logo.png"
        alt="ZMK Agency"
        className={`${logoSize} flex-shrink-0`}
      />
      <span className={textClasses[variant] || (isLightBg ? 'text-sm text-white' : textClasses.light)}>
        ZMK AGENCY Ürünüdür.
      </span>
    </a>
  )
}
