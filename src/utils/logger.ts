import pc from "picocolors";

const DEBUG_ENABLED =
  !!process.env.DEBUG ||
  process.argv.includes("--debug") ||
  process.argv.includes("-d");

const LEVEL_COLORS = {
  INFO: pc.white,
  WARN: pc.yellow,
  ERROR: pc.red,
  DEBUG: pc.gray,
};

type Level = keyof typeof LEVEL_COLORS;

const LEVEL_PAD = 5;
const pad = (s: string) => s.padEnd(LEVEL_PAD);

const level = (label: Level) => {
  const color = LEVEL_COLORS[label];
  return color(pad(label));
};

export interface Logger {
  info: (...a: unknown[]) => void;
  warn: (...a: unknown[]) => void;
  error: (...a: unknown[]) => void;
  debug: (...a: unknown[]) => void;
}

export function createLogger(
  module?: string,
  color: (s: string) => string = s => s,
): Logger {
  const tag = module ? color(`[ ${module} ]`) : undefined;

  /* pick correct console fn once */
  const consoleFn = {
    INFO: console.log,
    WARN: console.warn,
    ERROR: console.error,
    DEBUG: console.debug,
  } as const;

  function out(lvl: Level, ...args: unknown[]) {
    if (lvl === "DEBUG" && !DEBUG_ENABLED) return;
    consoleFn[lvl](level(lvl), ...(tag ? [tag] : []), ...args);
  }

  return {
    info: (...a) => out("INFO", ...a),
    warn: (...a) => out("WARN", ...a),
    error: (...a) => out("ERROR", ...a),
    debug: (...a) => out("DEBUG", ...a),
  };
}

export const logger = createLogger();
