export function debounce<T extends (...args: any) => any>(
  cb: T,
  delay = 1000,
): (...args: Parameters<T>) => void {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  return function (this: ThisParameterType<T>, ...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => cb.apply(this, args), delay);
  };
}
