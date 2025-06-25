#pragma once

#include <Arduino.h>

class PacketDecoder {
public:
  static constexpr uint8_t SYNC = 0xAA;
  static constexpr uint8_t VERSION = 0x01;

  static constexpr uint8_t TYPE_ESPNOW_TX = 0x21;

  using EspNowTxHandler = void (*)(const uint8_t mac[6], const uint8_t* payload, uint8_t len);
  void onEspNowTx(EspNowTxHandler handler);


  bool parse();

private:
  EspNowTxHandler espNowTxHandler = nullptr;

  enum State {
    WAIT_SYNC,
    WAIT_VERSION,
    WAIT_TYPE,
    READ_TDATA,
    WAIT_CRC
  };

  State state = WAIT_SYNC;

  uint8_t version = 0;
  uint8_t type = 0;
  uint8_t tdata[256];
  uint8_t tdataLen = 0;
  uint8_t expectedLen = 0;
  uint8_t crc = 0;

  unsigned long lastByteTime = 0;
  static constexpr uint16_t BYTE_TIMEOUT_MS = 10;

  void reset();
};
