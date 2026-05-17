export function parseBoundedInt(
  value: unknown,
  defaultValue: number,
  options: { min?: number; max?: number } = {}
): number {
  const parsed = typeof value === 'string' ? parseInt(value, 10) : NaN;
  const min = options.min ?? Number.MIN_SAFE_INTEGER;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  const normalized = Number.isFinite(parsed) ? parsed : defaultValue;
  return Math.max(min, Math.min(max, normalized));
}

export function parseBoundedFloat(
  value: unknown,
  defaultValue: number,
  options: { min?: number; max?: number } = {}
): number {
  const parsed = typeof value === 'string' ? parseFloat(value) : NaN;
  const min = options.min ?? Number.NEGATIVE_INFINITY;
  const max = options.max ?? Number.POSITIVE_INFINITY;
  const normalized = Number.isFinite(parsed) ? parsed : defaultValue;
  return Math.max(min, Math.min(max, normalized));
}
