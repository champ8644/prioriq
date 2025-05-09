(globalThis as any).requestIdleCallback = (cb: any) =>
  setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0);

(globalThis as any).cancelIdleCallback = (id: any) => clearTimeout(id);
