// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export const runSingleFlightTask = <T>(params: {
  currentPromise: Promise<T> | null;
  setPromise: (promise: Promise<T> | null) => void;
  task: () => Promise<T>;
  onStart?: () => void;
}): Promise<T> => {
  const { currentPromise, setPromise, task, onStart } = params;

  if (currentPromise) {
    return currentPromise;
  }

  onStart?.();

  const promise = task().finally(() => {
    setPromise(null);
  });

  setPromise(promise);

  return promise;
};
