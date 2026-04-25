"use client";

type IdleCallbackHandle = number;

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallbackLike = (deadline: IdleDeadlineLike) => void;

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: IdleCallbackLike,
    options?: { timeout?: number },
  ) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

export function scheduleIdleTask(task: () => void, timeoutMs = 250) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const idleWindow = window as IdleCapableWindow;

  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(() => task(), { timeout: timeoutMs });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(task, 0);
  return () => window.clearTimeout(handle);
}
