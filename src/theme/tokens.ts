export const referenceColors = {
  canvas: '#F7F8F8',
  card: '#FFFFFF',
  border: '#E7E8E9',
  primary: '#058642',
  info: '#2F7EDE',
  warning: '#F26522',
  danger: '#D9131F',
  water: '#12A5C4',
} as const;

export const softTones = {
  primary: '#E7F4EC',
  info: '#E9F1FC',
  warning: '#FEF0E9',
  danger: '#FBE3E4',
  water: '#E4F6FA',
} as const;

export const palette = {
  orange: {
    50: '#FEF0E9',
    100: '#FBD0BB',
    200: '#F9B899',
    300: '#F6986B',
    400: '#F4844E',
    500: '#F16725',
    600: '#DC6023',
    700: '#AB4819',
    800: '#853813',
    900: '#652B0F',
  },
  green: {
    50: '#ECF8ED',
    100: '#C5EAC6',
    200: '#A8DFA9',
    300: '#81D182',
    400: '#75CC77',
    500: '#51BE53',
    600: '#3EA940',
    700: '#008242',
    800: '#005C2F',
    900: '#00371C',
  },
  blue: {
    50: '#EBF9FF',
    100: '#C1EDFF',
    200: '#A3E4FF',
    300: '#7AD7FF',
    400: '#60D0FF',
    500: '#38C4FF',
    600: '#33B2E8',
    700: '#288BB5',
    800: '#1F6C8C',
    900: '#18526B',
  },
  gray: {
    50: '#FFFFFF',
    100: '#F7F8F8',
    200: '#F4F4F4',
    300: '#EEEFF0',
    400: '#EBECED',
    500: '#E7E8E9',
    600: '#B7B7B7',
    700: '#636466',
    800: '#353536',
    900: '#020204',
  },
} as const;

export const colors = {
  brand: {
    green: referenceColors.primary,
    orange: referenceColors.warning,
    blue: referenceColors.info,
  },
  background: {
    primary: referenceColors.canvas,
  },
  surface: {
    primary: referenceColors.card,
    secondary: '#FAFBFC',
  },
  text: {
    primary: '#020204',
    secondary: '#636466',
    tertiary: '#B7B7B7',
    disabled: '#B7B7B7',
    inverse: '#FFFFFF',
  },
  border: {
    subtle: '#EEEFF0',
    default: referenceColors.border,
    strong: '#B7B7B7',
  },
  success: {
    border: '#93CBB5',
    main: '#3DD257',
    surface: '#F1F8F5',
  },
  warning: {
    border: '#E1B77F',
    main: '#CA9326',
    surface: '#FFF5EB',
  },
  danger: {
    border: '#FF4B50',
    main: '#D9131F',
    surface: '#FFD2D2',
  },
  interactive: {
    border: '#4D8FF9',
    main: '#346EC6',
    surface: '#EAF0F5',
  },
} as const;
