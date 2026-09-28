import { referenceColors, softTones } from '@/theme/tokens';

export type PortalTone = 'primary' | 'info' | 'warning' | 'danger' | 'water';

export const toneColors: Record<PortalTone, { fg: string; bg: string }> = {
  primary: { fg: referenceColors.primary, bg: softTones.primary },
  info: { fg: referenceColors.info, bg: softTones.info },
  warning: { fg: referenceColors.warning, bg: softTones.warning },
  danger: { fg: referenceColors.danger, bg: softTones.danger },
  water: { fg: referenceColors.water, bg: softTones.water },
};
