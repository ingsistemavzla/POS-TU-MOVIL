import type { CSSProperties } from 'react';
import { INVENTORY_SYSTEM_NAME } from '@/constants/inventorySystemBranding';

/** Tema azul solo para páginas públicas (sin login). Reutiliza nombres --verde-* para no tocar lógica. */
export const PUBLIC_INVENTORY_THEME_VARS = {
  ['--verde-primario' as string]: '#2563EB',
  ['--verde-oscuro' as string]: '#0B1F44',
  ['--verde-secundario' as string]: '#60A5FA',
} as CSSProperties;

export const PUBLIC_PAGE_BG = '#F0F4FA';
export const PUBLIC_THEME_COLOR = '#2563EB';

export const PUBLIC_BRAND_FOOTER = `${INVENTORY_SYSTEM_NAME} · Public inventory reports · No login required`;
