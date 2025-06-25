#include "PacketDecoder.h"

void PacketDecoder::onEspNowTx(EspNowTxHandler handler) {
  espNowTxHandler = handler;
}

bool PacketDecoder::parse() {
  while (Serial.available()) {
    unsigned long now = millis();
    if (state != WAIT_SYNC && now - lastByteTime > BYTE_TIMEOUT_MS) {
      reset();
    }
    lastByteTime = now;

    uint8_t byte = Serial.read();

    switch (state) {
      case WAIT_SYNC:
        if (byte == SYNC) {
          state = WAIT_VERSION;
        }
        break;

      case WAIT_VERSION:
        version = byte;
        if (version != VERSION) {
          reset();
        } else {
          state = WAIT_TYPE;
        }
        break;

      case WAIT_TYPE:
        type = byte;
        crc = version ^ type;
        tdataLen = 0;
        expectedLen = 0;
        if (type == TYPE_ESPNOW_TX) {
          state = READ_TDATA;
        } else {
          reset();  // Unknown type
        }
        break;

      case READ_TDATA:
        tdata[tdataLen++] = byte;
        crc ^= byte;

        if (type == TYPE_ESPNOW_TX && tdataLen >= 7 && expectedLen == 0) {
          expectedLen = 6 + 1 + tdata[6];
          if (expectedLen > sizeof(tdata)) {
            reset();
            break;
          }
        }

        if (expectedLen && tdataLen == expectedLen) {
          state = WAIT_CRC;
        }
        break;

      case WAIT_CRC:
        state = WAIT_SYNC;
        if (byte != crc) return false;

        if (type == TYPE_ESPNOW_TX && espNowTxHandler) {
          const uint8_t* mac = tdata;
          uint8_t len = tdata[6];
          const uint8_t* payload = tdata + 7;
          espNowTxHandler(mac, payload, len);
        }
        Serial.write(crc);

        return true;
    }
  }

  return false;
}

void PacketDecoder::reset() {
  state = WAIT_SYNC;
  tdataLen = 0;
  expectedLen = 0;
}