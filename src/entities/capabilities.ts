import type { DecodedPacket } from "@/interfaces/protocols/serial";

export interface PacketProcessor {
  /** Handle an incoming ESP‑NOW packet. */
  processPacket(packet: DecodedPacket): void;
}

export interface CommandProcessor {
  /** Handle an incoming MQTT command message. */
  processMessage(topic: string, payload: Buffer): void;
}

export function isPacketProcessor(obj: any): obj is PacketProcessor {
  return "processPacket" in obj && typeof obj.processPacket === "function";
}

export function isCommandProcessor(obj: any): obj is CommandProcessor {
  return "processMessage" in obj && typeof obj.processMessage === "function";
}
