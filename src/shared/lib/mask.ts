// Display conventions from docs/CMS_QnA_V1_SPEC.md §2.1/3.2/3.4 (Nghị định
// 13/2023/NĐ-CP). Masking must happen at the response layer (MSW handlers
// today, backend later) so API and export payloads match the UI — never in
// components.

export function maskPhone(phone: string): string {
  const digits = phone.trim();
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 2)}${'•'.repeat(digits.length - 4)}${digits.slice(-2)}`;
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return email;
  return `${email.slice(0, 2)}••••${email.slice(at)}`;
}

// ponytail: fixtures store address as one flat string with no ward/district
// fields, so this keeps only the coarsest (last) comma-separated segment as
// a stand-in for "down to ward/commune level". Real ward-level masking needs
// structured address fields on the device/customer record.
export function maskInstallAddress(address: string): string {
  const segments = address.split(',');
  return segments[segments.length - 1]!.trim();
}
