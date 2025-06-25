import { setTimeout } from "node:timers/promises";

export function sleep(ms: number) {
  return setTimeout(ms);
}
