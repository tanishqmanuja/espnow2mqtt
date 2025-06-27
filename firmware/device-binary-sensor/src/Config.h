#pragma once
#include <c_types.h>

#define ESPNOW_WIFI_CHANNEL 6

typedef uint8_t espnow_addr_t[6];
const espnow_addr_t GATEWAY_ADDRESS = {0x8c, 0xaa, 0xb5, 0x52, 0xcf, 0x7a};