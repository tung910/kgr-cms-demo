import { APP_DEEPLINK_TARGETS } from './deeplinkTargets';

// Call-to-action buttons of a campaign (spec 7.1/7.3). A campaign carries up
// to MAX_CAMPAIGN_BUTTONS of them; each one opens an in-app screen, so authors
// pick a type (and its parameters) instead of typing a deeplink.
export const MAX_CAMPAIGN_BUTTONS = 2;
export const MAX_BUTTON_LABEL_LENGTH = 24;

export const BUTTON_TYPES = [
  {
    value: 'buy_core',
    labelKey: 'button.type.buy_core',
    defaultLabelKey: 'button.defaultLabel.buy_core',
    deeplink: 'onekangaroo://shop/cores',
  },
  {
    value: 'book_technician',
    labelKey: 'button.type.book_technician',
    defaultLabelKey: 'button.defaultLabel.book_technician',
    deeplink: 'onekangaroo://core/replace',
  },
  {
    value: 'renew_warranty',
    labelKey: 'button.type.renew_warranty',
    defaultLabelKey: 'button.defaultLabel.renew_warranty',
    deeplink: 'onekangaroo://warranty/renew',
  },
  {
    value: 'open_screen',
    labelKey: 'button.type.open_screen',
    defaultLabelKey: 'button.defaultLabel.open_screen',
    deeplink: null,
  },
] as const;
export type ButtonType = (typeof BUTTON_TYPES)[number]['value'];

// "Mua lõi" either follows the customer's own device (the core that is due) or
// targets the cores the author picked from the SKU catalogue.
export const CORE_MODES = [
  { value: 'auto', labelKey: 'button.coreMode.auto' },
  { value: 'specific', labelKey: 'button.coreMode.specific' },
] as const;
export type CoreMode = (typeof CORE_MODES)[number]['value'];

export interface CampaignButtonLike {
  type: ButtonType;
  coreMode?: CoreMode | undefined;
  coreSkus?: string[] | undefined;
  screen?: string | undefined;
}

export function defaultLabelKeyOf(type: ButtonType): string {
  return BUTTON_TYPES.find((item) => item.value === type)!.defaultLabelKey;
}

// The deeplink the app receives. `onekangaroo://shop/cores` with no `sku` is
// device-scoped at send time (see resolveDeviceDeeplink); with `sku` it names
// the chosen cores. The `sku` parameter is an assumed app contract.
export function buttonDeeplink(button: CampaignButtonLike): string | null {
  if (button.type === 'open_screen') return button.screen ?? null;
  const base = BUTTON_TYPES.find(
    (item) => item.value === button.type
  )!.deeplink;
  if (
    button.type === 'buy_core' &&
    button.coreMode === 'specific' &&
    button.coreSkus?.length
  )
    return `${base}?sku=${button.coreSkus.map(encodeURIComponent).join(',')}`;
  return base;
}

export function labelKeyOfDeeplink(deeplink: string | null): string | null {
  return (
    APP_DEEPLINK_TARGETS.find((target) => target.value === deeplink)
      ?.labelKey ?? null
  );
}

// Personalisation variables available in title/content (spec 7.1). The sample
// values drive the live preview only; real values are filled at send time.
export const PERSONALIZATION_VARIABLES = [
  { token: '{ten}', sample: 'Chị Lan' },
  { token: '{model}', sample: 'KGR-A100' },
  { token: '{ngay_loi}', sample: '5' },
  { token: '{ma_loi}', sample: 'ER00051' },
] as const;

export function personalize(text: string): string {
  return PERSONALIZATION_VARIABLES.reduce(
    (result, { token, sample }) => result.split(token).join(sample),
    text
  );
}
