import { z } from 'zod';

import { SERVICE_PACKAGE_TYPES } from '../constants/servicePackageTypes';

const text = z.string().trim().min(1);
const months = z.number().int().positive();
const items = z.array(text).min(1);
const materials = z.array(z.object({ code: text, name: text })).min(1);

export const serviceTypeCodeSchema = z.enum(
  SERVICE_PACKAGE_TYPES.map((item) => item.value)
);

// Single-word keys keep the structured configuration identical on the wire.
export const servicePackageConfigurationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('LD-STD'),
    performer: text,
    appointment: z.boolean(),
    address: z.boolean(),
  }),
  z.object({
    type: z.literal('LD-PRO'),
    performer: text,
    survey: text,
    appointment: z.boolean(),
    address: z.boolean(),
  }),
  z.object({ type: z.literal('TH-OLD'), performer: text, documents: items }),
  z.object({ type: z.literal('BH-EXT'), coverage: text }),
  z.object({
    type: z.literal('BH-ADP'),
    provider: text,
    coverage: text,
    evidence: items,
  }),
  z.object({ type: z.literal('BH-CMP'), components: materials }),
  z.object({
    type: z.literal('BT-FIL'),
    interval: months,
    materials,
    delivery: z.enum(['self', 'technician']),
  }),
  z.object({
    type: z.literal('BT-CLN'),
    interval: months,
    visits: months,
    checklist: items,
  }),
  z.object({
    type: z.literal('BT-COR'),
    materials,
    delivery: z.enum(['shipment', 'technician']),
  }),
  z.object({ type: z.literal('CS-VIP'), policy: text, benefits: items }),
  z.object({
    type: z.literal('CS-WQ'),
    interval: months,
    checks: items,
    report: text,
  }),
  z.object({ type: z.literal('CS-APP'), content: text }),
  z.object({
    type: z.literal('TG-ALL'),
    packages: z.array(z.object({ id: text, quantity: months, months })).min(1),
  }),
  z.object({ type: z.literal('TG-SUB'), transfer: text, services: items }),
]);

export type ServicePackageConfiguration = z.infer<
  typeof servicePackageConfigurationSchema
>;

export const servicePackageDetailsSchema = z.object({
  service_type_code: serviceTypeCodeSchema,
  purpose: text,
  included_items: items,
  excluded_items: z.array(text),
  eligibility_description: text,
  model_scope: z
    .enum(['all', 'selected'])
    .nullish()
    .transform((value) => value ?? 'all'),
  eligible_model_ids: z
    .array(text)
    .nullish()
    .transform((value) => value ?? []),
  pricing_mode: z.enum(['fixed', 'free_or_included', 'quotation']),
  pricing_description: text.nullable(),
  additional_cost_description: text.nullable(),
  configuration: servicePackageConfigurationSchema,
});

export type ServicePackageDetailsDto = z.infer<
  typeof servicePackageDetailsSchema
>;
