import { z } from 'zod';

import type { ProductConnectivity } from '@/shared/constants/productConnectivity';

export const productConnectivitySchema = z.enum([
  'iot',
  'non_iot',
] as const satisfies readonly ProductConnectivity[]);

// URL tabs of the device list: omitted = in use (bound to a customer).
export const deviceListTabSchema = z.enum(['in-use', 'inventory']);
export type DeviceListTab = z.infer<typeof deviceListTabSchema>;
