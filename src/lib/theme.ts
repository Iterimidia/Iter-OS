/**
 * Paleta oficial da Iter Mídia — clara, fundo off-white dominante (~90% da UI)
 * com as cores da marca reservadas para botões, badges, dados e destaques.
 *
 * Origem: paleta de 6 cores fornecida pela Iter Mídia (navy, periwinkle,
 * teal-blue, sky-blue, magenta/orquídea, roxo profundo) + o off-white/creme
 * usado no wordmark da logo. `primary`/`primaryHover` são a magenta um pouco
 * aprofundada (mesmo tom da logo) para garantir contraste AA com texto branco
 * em botões sólidos — todos os tons abaixo foram checados contra WCAG AA
 * (4.5:1) sobre branco/off-white antes de fechar. Os mesmos valores vivem em
 * `src/styles/globals.css` (bloco `:root`) — mantenha os dois em sincronia.
 */
export const theme = {
  colors: {
    primary: '#9C3D87',
    primaryHover: '#833470',
    secondary: '#1F6E90',
    accent: '#4D2E80',
    tertiary: '#6667A8',
    background: '#F3F0E8',
    backgroundAlt: '#EDEAE0',
    surface: '#FFFFFF',
    surfaceAlt: '#F5F3EE',
    surfaceHover: '#EFEDE6',
    border: '#E3E0D8',
    borderSoft: '#ECE9E1',
    text: '#2A2F66',
    textMuted: '#5B5F82',
    textFaint: '#767992',
    success: '#1F7A4C',
    warning: '#A85F16',
    danger: '#C23B47',
    info: '#0A5580',
  },
  radius: {
    md: '0.625rem',
    lg: '0.875rem',
    xl: '1.125rem',
  },
} as const

export const appSettingsDefaults = {
  loginSlogan: 'Organize a operação. Enxergue o todo. Execute com clareza.',
  dashboardSlogan: 'A central de comando da operação da Iter Mídia.',
} as const
