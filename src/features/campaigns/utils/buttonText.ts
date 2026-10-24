import {
  defaultLabelKeyOf,
  labelKeyOfDeeplink,
  MAX_BUTTON_LABEL_LENGTH,
  type ButtonType,
  type CoreMode,
} from '../constants/campaignCta';
import type { CoreOption } from '../schemas/campaignSchemas';

type Translate = (key: string, options?: Record<string, unknown>) => string;

interface ButtonLike {
  type: ButtonType;
  coreMode?: CoreMode | undefined;
  coreSkus?: string[] | undefined;
  screen?: string | undefined;
}

// Label offered when the author leaves the field empty: the type's default, or
// "Mua lõi <tên lõi>" when exactly one core is targeted.
export function suggestButtonLabel(
  button: ButtonLike,
  cores: readonly CoreOption[],
  t: Translate
): string {
  if (
    button.type === 'buy_core' &&
    button.coreMode === 'specific' &&
    button.coreSkus?.length === 1
  ) {
    const core = cores.find((item) => item.sku === button.coreSkus?.[0]);
    if (core)
      return t('button.suggest.core', { name: core.name }).slice(
        0,
        MAX_BUTTON_LABEL_LENGTH
      );
  }
  return t(defaultLabelKeyOf(button.type));
}

// Where a button leads, in words: "Mua lõi — theo máy khách", "Mua lõi: PP Cotton".
export function describeButtonTarget(
  button: ButtonLike,
  cores: readonly CoreOption[],
  t: Translate
): string {
  if (button.type === 'buy_core') {
    if (button.coreMode === 'specific' && button.coreSkus?.length)
      return t('button.target.cores', {
        names: button.coreSkus
          .map((sku) => cores.find((core) => core.sku === sku)?.name ?? sku)
          .join(', '),
      });
    return t('button.target.auto');
  }
  if (button.type === 'open_screen') {
    const key = labelKeyOfDeeplink(button.screen ?? null);
    return key ? t(key) : '—';
  }
  return t(`button.type.${button.type}`);
}
