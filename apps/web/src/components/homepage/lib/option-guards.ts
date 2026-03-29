export function isOptionValue<T extends string>(options: readonly T[], value: string): value is T {
  return (options as readonly string[]).includes(value);
}
