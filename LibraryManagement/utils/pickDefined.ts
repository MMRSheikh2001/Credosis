export function pickDefined(
  source: Record<string, any>,
  keys: string[]
): Record<string, any> {
  const result: Record<string, any> = {};
  keys.forEach((key) => {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  });
  return result;
}