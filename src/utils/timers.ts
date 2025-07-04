import { setTimeout } from "node:timers/promises";

export type IntervalTimer = ReturnType<typeof setInterval>;

export function sleep(ms: number) {
  return setTimeout(ms);
}
