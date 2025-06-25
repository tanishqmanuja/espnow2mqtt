export function bufToStr(mac: Buffer): string {
  return [...mac].map(b => b.toString(16).padStart(2, "0")).join(":");
}

export function strToBuf(mac: string): Buffer {
  return Buffer.from(mac.replace(/:/g, ""), "hex");
}

export const MAC = {
  toBuffer: strToBuf,
  fromBuf: bufToStr,
};
