import { createTheme, alpha } from '@mui/material/styles';
import { palette, radius, shadow, typography as tokenType } from './tokens';

/**
 * MUI theme wired to BuyWise tokens. We keep MUI for primitives (buttons,
 * dialogs, inputs, a11y) but override hard so nothing reads as default Material.
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: palette.brand, dark: palette.brandPressed, light: palette.brandBright, contrastText: '#fff' },
    success: { main: palette.positive },
    warning: { main: palette.caution },
    error: { main: palette.negative },
    info: { main: palette.info },
    background: { default: palette.paper, paper: palette.surface },
    text: { primary: palette.ink, secondary: palette.inkSecondary, disabled: palette.inkDisabled },
    divider: palette.hairline,
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: tokenType.fontFamily,
    htmlFontSize: 16,
    h1: { fontSize: 'clamp(2.4rem, 4vw, 3.25rem)', fontWeight: 650, letterSpacing: '-0.025em', lineHeight: 1.05 },
    h2: { fontSize: 'clamp(1.75rem, 2.6vw, 2.25rem)', fontWeight: 640, letterSpacing: '-0.02em', lineHeight: 1.12 },
    h3: { fontSize: '1.375rem', fontWeight: 620, letterSpacing: '-0.015em', lineHeight: 1.22 },
    h4: { fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
    subtitle1: { fontSize: '1.0625rem', fontWeight: 500, lineHeight: 1.5 },
    body1: { fontSize: '1rem', lineHeight: 1.6, letterSpacing: '-0.003em' },
    body2: { fontSize: '0.9375rem', lineHeight: 1.55, color: palette.inkSecondary },
    caption: { fontSize: '0.8125rem', lineHeight: 1.45, color: palette.inkTertiary },
    overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: palette.inkTertiary },
    button: { textTransform: 'none', fontWeight: 560, letterSpacing: '-0.005em' },
  },
  components: {
    MuiAvatar: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiSkeleton: {
      defaultProps: { variant: 'rectangular' },
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: palette.paper, color: palette.ink, WebkitFontSmoothing: 'antialiased' },
        '::selection': { background: palette.brandSoftBorder, color: palette.ink },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          padding: '10px 18px',
          fontSize: '0.9375rem',
          transition: 'transform .16s cubic-bezier(.22,.61,.36,1), background-color .16s, box-shadow .16s',
          '&:active': { transform: 'translateY(0.5px) scale(0.995)' },
          '&:focus-visible': { boxShadow: shadow.focus },
        },
        containedPrimary: {
          background: palette.brand,
          boxShadow: shadow.xs,
          '&:hover': { background: palette.brandHover, boxShadow: shadow.sm },
        },
        outlined: {
          borderColor: palette.hairlineStrong,
          color: palette.ink,
          background: palette.surface,
          '&:hover': { borderColor: palette.ink, background: palette.surfaceWarm },
        },
        text: { color: palette.ink, '&:hover': { background: alpha(palette.ink, 0.04) } },
        sizeLarge: { padding: '13px 24px', fontSize: '1rem', borderRadius: radius.md },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: palette.hairline },
      },
    },
    MuiTextField: { defaultProps: { variant: 'outlined' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          background: palette.surface,
          '& fieldset': { borderColor: palette.hairlineStrong },
          '&:hover fieldset': { borderColor: palette.inkTertiary },
          '&.Mui-focused fieldset': { borderColor: palette.brand, borderWidth: 1.5 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: radius.sm, fontWeight: 500, fontSize: '0.8125rem' },
        outlined: { borderColor: palette.hairlineStrong, background: palette.surface },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: palette.night,
          color: palette.onNight,
          fontSize: '0.8125rem',
          padding: '7px 10px',
          borderRadius: radius.sm,
          fontWeight: 450,
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: radius.lg, boxShadow: shadow.lg } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: radius.pill, backgroundColor: palette.paperSunken, height: 8 },
        bar: { borderRadius: radius.pill },
      },
    },
  },
});

export default theme;
