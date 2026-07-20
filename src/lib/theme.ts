/**
 * Paleta oficial da Iter Mídia.
 *
 * Nenhuma marca/hex oficial foi encontrado no repositório na criação deste
 * projeto, então esta é uma paleta provisória "tecnológica" (indigo/violeta +
 * teal + ciano sobre fundo escuro). Troque os valores abaixo — e os mesmos
 * valores em `src/styles/globals.css` (bloco `:root`) — quando a marca oficial
 * estiver definida. Os dois arquivos precisam ficar em sincronia porque o
 * Tailwind lê as CSS vars, e este objeto existe para uso em JS/TS puro
 * (ex: cores de gráficos, exportações, e-mails).
 */
export const theme = {
  colors: {
    primary: '#7C6BFF',
    primaryHover: '#8F80FF',
    secondary: '#22D3C4',
    accent: '#38BDF8',
    background: '#090A0F',
    backgroundAlt: '#0D0F15',
    surface: '#13151D',
    surfaceAlt: '#181B25',
    surfaceHover: '#1E212C',
    border: '#262A38',
    borderSoft: '#1B1E28',
    text: '#F3F4F7',
    textMuted: '#9AA0B2',
    textFaint: '#676D80',
    success: '#34D399',
    warning: '#F5A623',
    danger: '#EF4444',
    info: '#60A5FA',
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
