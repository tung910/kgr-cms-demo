// Shared idempotency / anti-replay primitive for mock write endpoints
// (plan "Phạm vi cập nhật 28/10/2026": chống trùng phải có trước bất kỳ
// endpoint ghi mới nào; spec §11 "Mọi lệnh ghi quyền lợi ... nhận header
// Idempotency-Key"). This file only builds and exports the primitive — no
// handler is wired through it yet in this task (Task 2 adds no new write
// endpoint). Task 3 wires package-create and the auto-attach toggle through
// it; Task 6/7/8 reuse it for entitlement usage/reversal/bulk-assign writes.
//
// Intended call pattern in a handler:
//
//   if (!allowed('some.capability')) return error('forbidden', 403);  // ALWAYS first
//   const idempotencyKey = request.headers.get('Idempotency-Key') ?? undefined;
//   const outcome = withIdempotency(actor(), 'POST /api/some/route', idempotencyKey, body, () => {
//     // ... validate + mutate store + push audit/event entries ...
//     return HttpResponse.json(result);
//   });
//   if (outcome.status === 'conflict') return error('idempotencyConflict', 409);
//   return outcome.result;
//
// Permission checks MUST run before calling withIdempotency, so a replay of
// an unauthorized call is still rejected rather than served a cached success
// (spec §11: "Kiểm tra quyền vẫn chạy trước khi trả kết quả cũ").

interface OperationRecord {
  fingerprint: string;
  result: unknown;
}

// Keyed by `${actor}:${route}:${operationKey}`.
const operationStore = new Map<string, OperationRecord>();

// Stable JSON stringify: sorts object keys so semantically identical payloads
// with differently-ordered keys produce the same fingerprint. Good enough for
// a mock-server utility — not a cryptographic hash, just equality-by-shape.
function fingerprintOf(payload: unknown): string {
  const sorted = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sorted);
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, val]) => [key, sorted(val)])
      );
    }
    return value;
  };
  return JSON.stringify(sorted(payload));
}

export type IdempotencyOutcome<T> =
  | { status: 'ran'; result: T }
  | { status: 'replayed'; result: T }
  | { status: 'conflict' };

// No `operationKey` → always runs, no tracking (e.g. GET, or a write endpoint
// that doesn't participate in idempotency). Same (actor, route, operationKey)
// + same payload fingerprint seen again → returns the cached result without
// calling `run()` again (no duplicate event/audit side effects). Same key +
// different payload fingerprint → `conflict` (caller maps this to an
// `idempotency_conflict` 400/409 response).
export function withIdempotency<T>(
  actor: string,
  route: string,
  operationKey: string | undefined,
  payload: unknown,
  run: () => T
): IdempotencyOutcome<T> {
  if (!operationKey) return { status: 'ran', result: run() };

  const storeKey = `${actor}:${route}:${operationKey}`;
  const fingerprint = fingerprintOf(payload);
  const existing = operationStore.get(storeKey);

  if (existing) {
    if (existing.fingerprint !== fingerprint) return { status: 'conflict' };
    return { status: 'replayed', result: existing.result as T };
  }

  const result = run();
  operationStore.set(storeKey, { fingerprint, result });
  return { status: 'ran', result };
}
