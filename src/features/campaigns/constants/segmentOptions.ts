// Option lists for the segmentation form. Kept in sync with the mock audience
// dataset (`src/mocks/fixtures/campaignAudience.ts`) and the device catalogues
// so previewed counts stay meaningful. Models come from the live reference
// query, so they are not listed here.
export const SEGMENT_REGIONS = [
  'Hà Nội',
  'Hải Phòng',
  'Đà Nẵng',
  'Hồ Chí Minh',
] as const;

export const SEGMENT_FIRMWARE_VERSIONS = ['2.1.4', '2.0.9', '1.9.5'] as const;
