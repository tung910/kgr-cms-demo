import type { ThemeConfig } from 'antd';

import { colors, referenceColors, softTones } from './tokens';

/**
 * Values absent from the design contract (spacing, radii, control heights,
 * shadows, gradients, motion, and responsive rules) deliberately use Ant
 * Design defaults until Design supplies their exact definitions.
 */
export const theme: ThemeConfig = {
  token: {
    borderRadius: 20,
    fontFamily:
      "'Be Vietnam Pro', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

    // Brand and interactive colors
    colorPrimary: referenceColors.primary,
    colorInfo: referenceColors.info,
    colorLink: colors.interactive.main,
    controlOutline: colors.interactive.border,

    // Semantic feedback colors
    colorSuccess: colors.success.main,
    colorSuccessBorder: colors.success.border,
    colorSuccessBg: colors.success.surface,
    colorWarning: referenceColors.warning,
    colorWarningBorder: colors.warning.border,
    colorWarningBg: colors.warning.surface,
    colorError: referenceColors.danger,
    colorErrorBorder: colors.danger.border,
    colorErrorBg: colors.danger.surface,

    // Text, surfaces, and borders
    colorTextBase: colors.text.primary,
    colorText: colors.text.primary,
    colorTextHeading: colors.text.primary,
    colorTextLabel: colors.text.primary,
    colorTextSecondary: colors.text.secondary,
    colorTextDescription: colors.text.secondary,
    colorTextPlaceholder: colors.text.disabled,
    colorTextDisabled: colors.text.disabled,
    colorTextLightSolid: colors.text.inverse,
    colorBgBase: colors.surface.primary,
    colorBgLayout: colors.background.primary,
    colorBgContainer: colors.surface.primary,
    colorBgElevated: colors.surface.primary,
    colorBgContainerDisabled: colors.surface.secondary,
    colorFillContent: colors.surface.secondary,
    colorFillAlter: colors.surface.secondary,
    colorBgTextHover: colors.interactive.surface,
    colorBgTextActive: colors.interactive.surface,
    colorBorder: colors.border.default,
    colorBorderSecondary: colors.border.subtle,
    colorSplit: colors.border.subtle,
  },
  components: {
    Card: {
      colorBgContainer: referenceColors.card,
    },
    Input: {
      hoverBorderColor: colors.interactive.border,
      activeBorderColor: colors.interactive.border,
    },
    Select: {
      optionActiveBg: colors.interactive.surface,
      optionSelectedBg: colors.interactive.surface,
      optionSelectedColor: colors.interactive.main,
    },
    Table: {
      rowHoverBg: colors.surface.secondary,
      rowSelectedBg: colors.interactive.surface,
      headerBg: colors.surface.secondary,
      headerColor: colors.text.primary,
      borderColor: colors.border.subtle,
    },
    Layout: {
      bodyBg: referenceColors.canvas,
      headerBg: referenceColors.card,
      siderBg: referenceColors.card,
    },
    Menu: {
      itemBg: referenceColors.card,
      subMenuItemBg: referenceColors.card,
      itemSelectedBg: softTones.primary,
      itemSelectedColor: referenceColors.primary,
      itemHoverBg: colors.surface.secondary,
    },
  },
};
