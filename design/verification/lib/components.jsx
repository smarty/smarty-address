// Smarty Design System — Component Library
// React components that consume semantic tokens from colors_and_type.css
// Export all components to window for use across Babel script files.

// =============================================================
// ICON — inline SVG wrapper. Uses currentColor so it can be colored
// via CSS `color:` on the parent. All icons are drawn on a 24x24 box.
// =============================================================
function Icon({ name, size = 24, color, style = {}, ...rest }) {
  const paths = {
    check: <path d="M20.5 5.86 L 8.826 17 L 2 10.465 L 4.459 8.105 L 8.826 12.279 L 18.041 3 L 20.5 5.86Z" />,
    close: <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />,
    arrow: <path d="M19.932 9.321L11.701 1.643 13.365 0 24 10.5 13.365 21 11.701 19.357 19.937 11.645 0 11.645 0 9.321z" transform="translate(0 1.5)"/>,
    search: <path d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 1 0 14 15.5l.27.28v.79L19.5 22 22 19.5 15.5 14zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/>,
    menu: <path d="M3 6h18v2.4H3zM3 15.6h18V18H3z"/>,
    plus: <path d="M11 5h2v14h-2zM5 11h14v2H5z"/>,
    chevronDown: <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>,
    chevronRight: <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>,
    info: <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z"/>,
    alert: <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2zm0-4h-2v-4h2z"/>,
    check_circle: <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z"/>,
    copy: <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11z"/>,
    external: <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>,
    pin: <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z"/>,
    cloud: <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4a7.48 7.48 0 0 0-6.77 4.34A5.994 5.994 0 0 0 6 20h13a5 5 0 0 0 .35-9.96z"/>,
    key: <path d="M12.65 10A6 6 0 0 0 1 12a6 6 0 0 0 11.65 2H17v4h4v-4h2v-4H12.65zM7 14a2 2 0 1 1 2-2 2 2 0 0 1-2 2z"/>,
    lock: <path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6zm9 14H6V10h12v10zm-6-3a2 2 0 1 0-2-2 2 2 0 0 0 2 2z"/>,
    heart: <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"/>,
    building: <path d="M4 3h16v18h-6v-4h-4v4H4V3zm3 3v2h2V6H7zm4 0v2h2V6h-2zm4 0v2h2V6h-2zm-8 4v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2z"/>,
    database: <path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4s-8-1.79-8-4zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"/>,
    doc: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>,
    user: <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/>,
    chat: <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>,
    star: <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"/>,
  };
  const p = paths[name] || paths.check;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={color || 'currentColor'}
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
      {...rest}
    >
      {p}
    </svg>
  );
}

// =============================================================
// BUTTON — primary / secondary / tertiary / destructive; 3 sizes
// Matches Figma button specs: pill radius, 20px/17px label, 2px
// focus ring. Solid blue for primary, outlined for secondary,
// text-only for tertiary.
// =============================================================
function Button({
  variant = 'primary',      // primary | secondary | tertiary | destructive
  size = 'md',              // lg | md | sm
  icon = null,              // icon name (left)
  iconRight = null,         // icon name (right)
  iconOnly = false,
  disabled = false,
  children,
  style = {},
  ...rest
}) {
  // Padding values pulled from --space tokens. Vertical is height-driven
  // (implicit via line-height); horizontal consumes --space-* directly so
  // restyling the scale restyles every button.
  const sizeMap = {
    lg: { h: 56, px: 'var(--space-8)',   font: 20, gap: 'var(--space-3)',   icon: 24, radius: 'var(--radius-pill)' },   // 32px padding, 12px gap
    md: { h: 48, px: 'var(--space-6)',   font: 17, gap: 'var(--space-2-5)', icon: 20, radius: 'var(--radius-pill)' },   // 24px padding, 10px gap
    sm: { h: 36, px: 'var(--space-5)',   font: 15, gap: 'var(--space-2)',   icon: 18, radius: 'var(--radius-pill)' },   // 20px padding, 8px gap
  }[size];
  const variantStyle = {
    primary: {
      background: 'var(--color-surface-action)',
      color: 'var(--color-text-on-action)',
      border: '2px solid transparent',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--color-text-primary)',
      border: '2px solid var(--color-stroke-default)',
    },
    tertiary: {
      background: 'transparent',
      color: 'var(--color-text-action)',
      border: '2px solid transparent',
      paddingLeft: 0, paddingRight: 0,
    },
    destructive: {
      background: 'var(--color-surface-negative)',
      color: 'var(--color-text-negative)',
      border: '2px solid transparent',
    },
  }[variant];
  const disabledStyle = disabled ? {
    background: 'var(--color-surface-disabled)',
    color: 'var(--color-text-disabled)',
    border: '2px solid transparent',
    cursor: 'not-allowed',
  } : {};
  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeMap.gap,
        height: sizeMap.h,
        padding: iconOnly ? 0 : `0 ${sizeMap.px}`,
        width: iconOnly ? sizeMap.h : 'auto',
        fontFamily: 'var(--font-body)',
        fontSize: sizeMap.font,
        fontWeight: 500,
        letterSpacing: '-0.02em',
        borderRadius: sizeMap.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
        whiteSpace: 'nowrap',
        ...variantStyle,
        ...disabledStyle,
        ...style,
      }}
      onMouseEnter={e => {
        if (disabled) return;
        if (variant === 'primary') e.currentTarget.style.background = 'var(--color-surface-action-hover)';
        if (variant === 'secondary') e.currentTarget.style.background = 'var(--color-surface-tertiary)';
        if (variant === 'tertiary') e.currentTarget.style.color = 'var(--color-text-action-hover)';
      }}
      onMouseLeave={e => {
        if (disabled) return;
        Object.assign(e.currentTarget.style, variantStyle);
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={sizeMap.icon} />}
      {!iconOnly && children}
      {iconOnly && children}
      {iconRight && <Icon name={iconRight} size={sizeMap.icon} />}
    </button>
  );
}

// =============================================================
// INPUT — 5px radius, 1px gray border, blue 2px focus ring
// =============================================================
function Input({ label, hint, error, success, icon, size = 'md', style = {}, id, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  const sz = { lg: 56, md: 48, sm: 40 }[size];
  const inputId = id || `in-${React.useId ? React.useId() : Math.random().toString(36).slice(2)}`;
  const ring = error ? 'var(--color-stroke-negative)' :
               success ? 'var(--color-stroke-positive)' :
               focused ? 'var(--color-stroke-action)' :
               'var(--color-stroke-secondary)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label htmlFor={inputId} className="type-caption-lg" style={{
          color: 'var(--color-text-primary)',
          fontWeight: 500,
        }}>{label}</label>
      )}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: sz,
        padding: '0 16px',
        gap: 10,
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${ring}`,
        boxShadow: focused ? '0 0 0 2px var(--color-stroke-focused)' : 'none',
        background: 'var(--color-surface-primary)',
        transition: 'border var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      }}>
        {icon && <Icon name={icon} size={20} style={{ color: 'var(--color-icon-tertiary)' }} />}
        <input
          id={inputId}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: 16, lineHeight: '24px',
            color: 'var(--color-text-primary)',
            minWidth: 0,
          }}
          {...rest}
        />
      </div>
      {(hint || error) && (
        <span className="type-caption-md" style={{
          color: error ? 'var(--color-text-negative)' : 'var(--color-text-tertiary)',
        }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}

// =============================================================
// TAG / CHIP — 360px radius, 12–13px label
// =============================================================
function Tag({ tone = 'neutral', children, icon, closable, onClose, style = {} }) {
  const toneMap = {
    neutral:  { bg: 'var(--color-surface-tertiary)',  fg: 'var(--color-text-secondary)' },
    info:     { bg: 'var(--color-surface-secondary-tinted)', fg: 'var(--color-text-on-lit-blu)' },
    positive: { bg: 'var(--color-surface-positive)',  fg: 'var(--color-text-positive)' },
    warning:  { bg: 'var(--color-surface-warning)',   fg: 'var(--color-text-warning)' },
    negative: { bg: 'var(--color-surface-negative)',  fg: 'var(--color-text-negative)' },
    dark:     { bg: 'var(--gray-950)',                fg: 'var(--gray-0)' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px',
      height: 26,
      borderRadius: 'var(--radius-pill)',
      background: toneMap.bg, color: toneMap.fg,
      fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
      letterSpacing: '-0.01em',
      ...style,
    }}>
      {icon && <Icon name={icon} size={14} />}
      {children}
      {closable && (
        <button onClick={onClose} style={{
          border: 'none', background: 'transparent', padding: 0,
          color: 'inherit', cursor: 'pointer', display: 'inline-flex',
        }}><Icon name="close" size={14}/></button>
      )}
    </span>
  );
}

// =============================================================
// ALERT — banner with semantic surface + icon + text
// =============================================================
function Alert({ tone = 'info', title, children, icon, style = {} }) {
  const toneMap = {
    info:     { bg: 'var(--color-surface-secondary-tinted)', fg: 'var(--color-text-on-lit-blu)', icon: 'info', iconColor: 'var(--blue-400)' },
    positive: { bg: 'var(--color-surface-positive)', fg: 'var(--color-text-positive)', icon: 'check_circle', iconColor: 'var(--green-500)' },
    warning:  { bg: 'var(--color-surface-warning)', fg: 'var(--color-text-warning)', icon: 'alert', iconColor: 'var(--orange-500)' },
    negative: { bg: 'var(--color-surface-negative)', fg: 'var(--color-text-negative)', icon: 'alert', iconColor: 'var(--pink-500)' },
  }[tone];
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '16px 20px',
      background: toneMap.bg, color: toneMap.fg,
      borderRadius: 'var(--radius-lg)',
      fontFamily: 'var(--font-body)',
      ...style,
    }}>
      <Icon name={icon || toneMap.icon} size={24} style={{ color: toneMap.iconColor, flexShrink: 0, marginTop: 2 }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: 600, fontSize: 16, lineHeight: '24px', marginBottom: 2 }}>{title}</div>}
        <div style={{ fontSize: 15, lineHeight: '22px', opacity: 0.92 }}>{children}</div>
      </div>
    </div>
  );
}

// =============================================================
// CARD — white surface with `--shadow-md`, 16–24px radius
// =============================================================
function Card({ children, padding = 24, radius = 16, elevation = 'md', style = {}, ...rest }) {
  return (
    <div style={{
      background: 'var(--color-surface-primary)',
      borderRadius: radius,
      boxShadow: `var(--shadow-${elevation})`,
      padding,
      ...style,
    }} {...rest}>
      {children}
    </div>
  );
}

// =============================================================
// SMARTY LOGO (wordmark + dot-logo)
// =============================================================
function SmartyLogo({ height = 28, color = 'var(--blue-400)' }) {
  // recreated from the Figma wordmark — "smarty" set in a heavy rounded sans
  // with the dot on the "i" tucked as a solid square. Color via currentColor.
  return (
    <svg height={height} viewBox="0 0 440 126" fill={color} style={{ display: 'block' }}>
      <text x="0" y="102" fontFamily="var(--font-display)" fontSize="120" fontWeight="700" letterSpacing="-6">smarty</text>
    </svg>
  );
}

function SmartyDot({ size = 40 }) {
  // The Smarty "a" mark — a rounded square with a hole, sourced from the figma logo icon.
  return (
    <svg width={size} height={size * (70/72)} viewBox="0 0 72 70" fill="var(--blue-400)" style={{ display: 'block' }}>
      <path d="M 36 0 C 15.986 0 0 15.112 0 34.94 C 0 54.768 15.498 70 36 70 L 72 70 L 72 34.94 C 72 14.991 56.136 0 36 0 Z M 36.113 52.372 C 26.434 52.372 19.385 45.075 19.385 35.069 C 19.385 24.854 26.433 17.87 36.113 17.87 C 45.793 17.87 52.737 24.853 52.737 35.069 C 52.737 45.075 47.055 52.372 36.113 52.372 Z" fillRule="nonzero" />
    </svg>
  );
}

// =============================================================
// NAV — marketing-site top nav
// =============================================================
function TopNav({ links, cta }) {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 40px',
      background: 'var(--color-surface-primary)',
      borderBottom: '1px solid var(--color-stroke-tertiary)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SmartyDot size={28} />
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
          color: 'var(--blue-400)', letterSpacing: '-1.5px', lineHeight: 1,
        }}>smarty</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {links?.map((l, i) => (
          <a key={i} href="#" style={{
            fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
          }}>{l}</a>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button variant="tertiary" size="sm">Sign in</Button>
        <Button variant="primary" size="sm">{cta || 'Get API key'}</Button>
      </div>
    </nav>
  );
}

// =============================================================
// Expose globally for Babel script-file scope sharing
// =============================================================
Object.assign(window, {
  Icon, Button, Input, Tag, Alert, Card, SmartyLogo, SmartyDot, TopNav,
});
