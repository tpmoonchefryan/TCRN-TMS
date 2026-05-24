export const PUBLIC_PRESENCE_ROUTE_LOADING_TIMEOUT_MS = 8_000;

export async function withPublicPresenceRouteTimeout<T>(
  promise: Promise<T>,
  errorMessage: string,
  timeoutMs = PUBLIC_PRESENCE_ROUTE_LOADING_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(errorMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
