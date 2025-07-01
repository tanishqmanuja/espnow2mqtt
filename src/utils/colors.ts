import pc from "picocolors";

const ESC = "\x1b[";
const RESET = "\x1b[0m";

export function rgb(r: number, g: number, b: number): (s: string) => string {
  const code = `${ESC}38;2;${r};${g};${b}m`;
  return pc.isColorSupported
    ? (txt: string) => code + txt + RESET
    : (txt: string) => txt;
}
