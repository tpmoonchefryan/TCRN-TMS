export function mergeUrlSearchParams(
  searchParams: Pick<URLSearchParams, 'toString'>,
  updates: Record<string, string | null | undefined>
) {
  const next = new URLSearchParams(searchParams.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      next.delete(key);
      return;
    }

    next.set(key, value);
  });

  return next;
}

export function parseBooleanSearchParam(value: string | null) {
  if (value === '1' || value === 'true') {
    return true;
  }

  if (value === '0' || value === 'false') {
    return false;
  }

  return null;
}

export function parseEnumSearchParam<const TAllowed extends readonly string[]>(
  value: string | null,
  allowedValues: TAllowed
) {
  return value && allowedValues.includes(value) ? (value as TAllowed[number]) : null;
}
