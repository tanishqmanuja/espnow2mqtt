export const WIZMOTE_BUTTON_CODES = {
  on: 1,
  off: 2,
  night: 3,
  down: 8,
  up: 9,
  scene1: 16,
  scene2: 17,
  scene3: 18,
  scene4: 19,
  smart_on: 100,
  smart_off: 101,
  smart_up: 102,
  smart_down: 103,
} as const;

let sequenceNumber = 1;

export function isWizmoteCommand(cmd: string): boolean {
  return Object.keys(WIZMOTE_BUTTON_CODES).includes(cmd);
}

export function getWizmoteButtonCode(cmd: string): number | undefined {
  return WIZMOTE_BUTTON_CODES[cmd as keyof typeof WIZMOTE_BUTTON_CODES];
}

export function getWizmotePayload(buttonCode: number): Buffer {
  sequenceNumber += 1;

  const program = buttonCode === 1 || buttonCode === 100 ? 0x91 : 0x81;

  const payload = Buffer.alloc(13);

  payload[0] = program;
  payload[1] = sequenceNumber & 0xff;
  payload[2] = (sequenceNumber >> 8) & 0xff;
  payload[3] = (sequenceNumber >> 16) & 0xff;
  payload[4] = (sequenceNumber >> 24) & 0xff;
  payload[5] = 0x32; // dt1
  payload[6] = buttonCode; // button
  payload[7] = 0x01; // dt2
  payload[8] = 90; // batLevel
  payload[9] = 0x00;
  payload[10] = 0x00;
  payload[11] = 0x00;
  payload[12] = 0x00;

  return payload;
}
