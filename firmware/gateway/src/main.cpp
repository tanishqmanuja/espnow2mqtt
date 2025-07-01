#include <Arduino.h>
#include <ESP8266WiFi.h>

#include <QuickESPNow.h>

#include "utils/LedBlinker.h"
#include "serial/PacketEncoder.h"
#include "serial/PacketDecoder.h"

#define ESPNOW_WIFI_CHANNEL 6
#define SERIAL_BAUD_RATE 9600

PacketDecoder decoder;
LedBlinker blinker(LED_BUILTIN);

void onDataSend(uint8_t *macaddr, uint8_t status) {
  if (status == 0) {
    blinker.blink(); 
  }

  PacketEncoder::sendEspNowTxStatusPacket(macaddr, status);
}

void onDataRcvd(uint8_t *macaddr, uint8_t *data, uint8_t len, signed int rssi, bool broadcast) {
  blinker.blink(5);

  PacketEncoder::sendEspNowPacket(macaddr, rssi, data, len);
}

void onEspNowTx(const uint8_t* mac, const uint8_t* payload, uint8_t len) {
  quickEspNow.send(mac, payload, len);
}

void setup() {
  /* Setup Serial */
  Serial.begin(SERIAL_BAUD_RATE);

  /* Setup Blinker  */
  blinker.setup(); 
  
  /* Setup ESP Now */
  quickEspNow.begin(ESPNOW_WIFI_CHANNEL);
  quickEspNow.onDataSent(onDataSend);
  quickEspNow.onDataRcvd(onDataRcvd);

  /* Setup Packet Decoder */
  decoder.onEspNowTx(onEspNowTx);

  /* Send Gateway Init */
  uint8_t mac[6];
  WiFi.macAddress(mac);
  PacketEncoder::sendGatewayInitPacket(mac);
}

void loop() {
  decoder.parse();
  blinker.update();
}