#include "PacketEncoder.h"

void PacketEncoder::sendGatewayInitPacket(
    const uint8_t* mac
) {
    uint8_t buffer[10]; // SYNC + VER + TYPE + MAC(6) + CRC
    uint8_t idx = 0;

    buffer[idx++] = SYNC_BYTE;
    buffer[idx++] = VERSION;
    buffer[idx++] = TYPE_GATEWAY_INIT;

    memcpy(&buffer[idx], mac, 6);
    idx += 6;

    uint8_t crc = crc8(&buffer[1], idx - 1);
    buffer[idx++] = crc;

    Serial.write(buffer, idx);
}

void PacketEncoder::sendEspNowPacket(
    const uint8_t* mac,
    int8_t rssi,
    const uint8_t* data,
    uint8_t len
) {
    uint8_t buffer[256];
    uint8_t idx = 0;

    buffer[idx++] = SYNC_BYTE;
    buffer[idx++] = VERSION;
    buffer[idx++] = TYPE_ESPNOW_RX;

    // MAC (6B)
    memcpy(&buffer[idx], mac, 6);
    idx += 6;

    // RSSI (1B)
    buffer[idx++] = static_cast<uint8_t>(rssi); // store as unsigned

    // LEN (1B)
    buffer[idx++] = len;

    // DATA
    memcpy(&buffer[idx], data, len);
    idx += len;

    // CRC8 from VERSION to end of DATA
    uint8_t crc = crc8(&buffer[1], idx - 1);
    buffer[idx++] = crc;

    // Send to serial
    Serial.write(buffer, idx);
}

void PacketEncoder::sendEspNowTxStatusPacket(
    const uint8_t* mac,
    uint8_t status
) {
    uint8_t buffer[10]; // SYNC + VER + TYPE + MAC(6) + STATUS + CRC
    uint8_t idx = 0;

    buffer[idx++] = SYNC_BYTE;
    buffer[idx++] = VERSION;
    buffer[idx++] = TYPE_ESPNOW_TX_STATUS;

    memcpy(&buffer[idx], mac, 6);
    idx += 6;

    buffer[idx++] = status;

    uint8_t crc = crc8(&buffer[1], idx - 1);
    buffer[idx++] = crc;

    Serial.write(buffer, idx);
}

uint8_t PacketEncoder::crc8(const uint8_t* data, size_t len) {
    uint8_t crc = 0x00;
    for (size_t i = 0; i < len; ++i) {
        crc ^= data[i];
    }
    return crc;
}
