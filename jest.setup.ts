(global as any).requestIdleCallback = (cb: IdleRequestCallback) =>
  setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0);

(global as any).cancelIdleCallback = (id: number) => clearTimeout(id);
