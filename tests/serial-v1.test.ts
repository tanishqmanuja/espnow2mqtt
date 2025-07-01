import { describe, it, expect, vi } from "vitest";
import {
  PacketEncoder,
  PacketDecoder,
  SYNC_BYTE,
  PROTOCOL_VERSION,
  SIZE,
  FIXED_HEADER_SIZE,
  crc8,
  toInt8,
  TX_PACKET,
  RX_PACKET,
  PACKET_BYTE,
} from "@/interfaces/protocols/serial";

// Mock the MAC utility so tests remain self-contained
vi.mock("@/utils/mac", () => {
  const stringToBuf = (mac: string) =>
    Buffer.from(mac.split(":").map((b) => parseInt(b, 16)));
  const bufToString = (buf: Buffer) =>
    Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join(":");
  return {
    MAC: {
      toBuffer: stringToBuf,
      fromBuf: bufToString,
    },
  };
});

const MAC_STRING = "aa:bb:cc:dd:ee:ff";
const MAC_BUFFER = Buffer.from([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]);

const buildFrame = (typeByte: number, body: Buffer) => {
  const header = Buffer.from([SYNC_BYTE, PROTOCOL_VERSION, typeByte]);
  const crc = Buffer.from([crc8(Buffer.concat([header.subarray(1), body]))]);
  return Buffer.concat([header, body, crc]);
};

describe("utils", () => {
  it("crc8 XOR checksum", () => {
    expect(crc8(Buffer.from([1, 2, 3]))).toBe(0); // 1 ^ 2 ^ 3 === 0
  });

  it("toInt8 wraps correctly", () => {
    expect(toInt8(0xfc)).toBe(-4);
    expect(toInt8(0x7f)).toBe(127);
  });
});

describe("PacketEncoder", () => {
  it("encodes ESPNOW_TX packet correctly", () => {
    const payload = Buffer.from(JSON.stringify({ a: 1 }));
    const buf = PacketEncoder.encode(TX_PACKET.ESPNOW_TX, {
      mac: MAC_STRING,
      payload,
    });

    expect(buf[0]).toBe(SYNC_BYTE);
    expect(buf[1]).toBe(PROTOCOL_VERSION);
    expect(buf[2]).toBe(PACKET_BYTE[TX_PACKET.ESPNOW_TX]);

    // Length = header + mac + len + payload + crc
    expect(buf.length).toBe(
      FIXED_HEADER_SIZE + SIZE.MAC + SIZE.LEN + payload.length + SIZE.CRC,
    );

    const crcExpected = crc8(buf.subarray(1, buf.length - 1));
    expect(buf[buf.length - 1]).toBe(crcExpected);
  });

  it("encodes RAW type packet", () => {
    const DATA = Buffer.from([0x01, 0x02, 0x03]);
    const t = 0x30;
    const buf = PacketEncoder.encode("RAW", { type: t, payload: DATA });
    expect(buf[2]).toBe(t);
    expect(buf.slice(3, -1)).toEqual(DATA);
  });
});

describe("PacketDecoder", () => {
  it("decodes GATEWAY_INIT", async () => {
    const body = MAC_BUFFER;
    const frame = buildFrame(PACKET_BYTE[RX_PACKET.GATEWAY_INIT], body);
    const dec = new PacketDecoder();
    const p = new Promise((res) => dec.once("packet", res));
    dec.feed(frame);
    const pkt: any = await p;
    expect(pkt.type).toBe(RX_PACKET.GATEWAY_INIT);
    expect(pkt.mac).toBe(MAC_STRING);
  });

  it("decodes ESPNOW_RX with RSSI and JSON payload", async () => {
    const payloadObj = { led: true };
    const payloadBuf = Buffer.from(JSON.stringify(payloadObj));
    const lenBuf = Buffer.from([payloadBuf.length]);
    const rssiBuf = Buffer.from([toInt8(-42) & 0xff]); // store as uint8

    const body = Buffer.concat([MAC_BUFFER, rssiBuf, lenBuf, payloadBuf]);
    const frame = buildFrame(PACKET_BYTE[RX_PACKET.ESPNOW_RX], body);

    const dec = new PacketDecoder();
    const p = new Promise((res) => dec.once("packet", res));
    dec.feed(frame.subarray(0, 5)); // feed partial first
    dec.feed(frame.subarray(5));
    const pkt: any = await p;

    expect(pkt.type).toBe(RX_PACKET.ESPNOW_RX);
    expect(pkt.mac).toBe(MAC_STRING);
    expect(pkt.rssi).toBe(-42);
    expect(pkt.payload).toEqual(payloadObj);
  });

  it("decodes ESPNOW_TX_STATUS", async () => {
    const statusBuf = Buffer.from([0x01]);
    const body = Buffer.concat([MAC_BUFFER, statusBuf]);
    const frame = buildFrame(PACKET_BYTE[RX_PACKET.ESPNOW_TX_STATUS], body);

    const dec = new PacketDecoder();
    const p = new Promise((res) => dec.once("packet", res));
    dec.feed(frame);
    const pkt: any = await p;

    expect(pkt.type).toBe(RX_PACKET.ESPNOW_TX_STATUS);
    expect(pkt.mac).toBe(MAC_STRING);
    expect(pkt.status).toBe(0x01);
  });

  it("skips corrupted CRC", async () => {
    const body = MAC_BUFFER;
    const frame = buildFrame(PACKET_BYTE[RX_PACKET.GATEWAY_INIT], body);
    frame[frame.length - 1]! ^= 0xff; // corrupt CRC

    const dec = new PacketDecoder();
    let called = false;
    dec.on("packet", () => (called = true));
    dec.feed(frame);
    expect(called).toBe(false);
  });
});