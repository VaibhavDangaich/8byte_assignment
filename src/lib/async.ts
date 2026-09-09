export async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  const runner = async () => {
    while (next < items.length) await worker(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
