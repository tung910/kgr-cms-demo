import type {
  CampaignOffer,
  PromotedPackage,
} from '../schemas/campaignSchemas';

type Translate = (key: string, options?: Record<string, unknown>) => string;

// Why a voucher cannot be attached to the chosen package (spec 4.2).
export type PackageOfferIssue =
  | 'free_package_discount'
  | 'quotation_amount_discount'
  | 'discount_exceeds_price';

function isDiscountVoucher(
  offer: CampaignOffer | null
): offer is CampaignOffer {
  return offer?.type === 'voucher';
}

// Free/bundled packages take no discount voucher, quotation packages only a
// percentage one, and an amount can never exceed the price of one period.
// Loyalty points do not depend on the package.
export function validatePackageOffer(
  pkg: PromotedPackage,
  offer: CampaignOffer | null
): PackageOfferIssue | null {
  if (!isDiscountVoucher(offer)) return null;
  if (pkg.pricingMode === 'free_or_included') return 'free_package_discount';
  if (pkg.pricingMode === 'quotation')
    return offer.discountType === 'amount' ? 'quotation_amount_discount' : null;
  if (
    offer.discountType === 'amount' &&
    (offer.discountValue ?? 0) > (pkg.price ?? 0)
  )
    return 'discount_exceeds_price';
  return null;
}

// Price of the first billing period after the voucher; null when the package is
// priced by quotation. Recurring packages are only discounted on that first
// period, renewals use the catalogue price. Preview only, never a stored price.
export function firstPeriodPrice(
  pkg: PromotedPackage,
  offer: CampaignOffer | null
): number | null {
  if (pkg.pricingMode === 'quotation' || pkg.price === null) return null;
  if (!isDiscountVoucher(offer) || offer.discountType === undefined)
    return pkg.price;
  const value = offer.discountValue ?? 0;
  const discount =
    offer.discountType === 'percent' ? (pkg.price * value) / 100 : value;
  return Math.max(0, Math.round(pkg.price - discount));
}

function formatMoney(amount: number, t: Translate): string {
  return `${amount.toLocaleString('vi')}${t('unit.vnd')}`;
}

// Lines the preview and summaries show for the promoted package's price, e.g.
// "480.000đ năm đầu" then "sau đó 600.000đ/năm".
export function packagePriceLines(
  pkg: PromotedPackage,
  offer: CampaignOffer | null,
  t: Translate
): string[] {
  if (pkg.pricingMode === 'free_or_included') return [t('package.price.free')];
  if (pkg.pricingMode === 'quotation')
    return offer?.type === 'voucher' && offer.discountType === 'percent'
      ? [
          t('package.price.quotation'),
          t('package.price.quotationDiscount', {
            value: offer.discountValue ?? 0,
          }),
        ]
      : [t('package.price.quotation')];

  const first = firstPeriodPrice(pkg, offer);
  if (first === null || pkg.price === null)
    return [t('package.price.quotation')];
  const months = pkg.billingPeriodMonths;
  if (pkg.billingType === 'one_time' || months === null)
    return [t('package.price.oneTime', { price: formatMoney(first, t) })];

  const period =
    months === 12
      ? t('package.period.year')
      : t('package.period.months', { count: months });
  const discounted = first !== pkg.price;
  return discounted
    ? [
        t('package.price.firstPeriod', {
          price: formatMoney(first, t),
          period,
          months,
        }),
        t('package.price.renewal', {
          price: formatMoney(pkg.price, t),
          period,
          months,
        }),
      ]
    : [
        t('package.price.perPeriod', {
          price: formatMoney(pkg.price, t),
          period,
          months,
        }),
      ];
}
