#pragma once

#include <Arduino.h>

class PacketEncoder {
public:
    static constexpr uint8_t SYNC_BYTE = 0xAA;
    static constexpr uint8_t VERSION   = 0x01;

    static constexpr uint8_t TYPE_GATEWAY_INIT = 0x01;
    static constexpr uint8_t TYPE_ESPNOW_RX = 0x20;
    static constexpr uint8_t TYPE_ESPNOW_TX_STATUS = 0x22;

    static void sendGatewayInitPacket(
        const uint8_t* mac
    );

    static void sendEspNowPacket(
        const uint8_t* mac,
        int8_t rssi,
        const uint8_t* data,
        uint8_t len
    );

    static void sendEspNowTxStatusPacket(
        const uint8_t* mac,
        uint8_t status
    );

private:
    static uint8_t crc8(const uint8_t* data, size_t len);
};
