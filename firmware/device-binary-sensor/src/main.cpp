#include <Arduino.h>
#include <ESP8266WiFi.h>

#include <QuickESPNow.h>
#include <EasyButton.h>
#include <ArduinoJson.h>

#include "utils/LedBlinker.h"
#include "entities/BinarySensor.h"
#include "entities/EntityRegistry.h"

// ----- Configuration -----
#define ESPNOW_WIFI_CHANNEL 6
#define SERIAL_BAUD_RATE 9600
#define MAX_PAYLOAD_SIZE 250
#define BUTTON_PIN 0
#define DEVICE_ID "sensor-device"

u8 GATEWAY_ADDRESS[6] = {0x8c, 0xaa, 0xb5, 0x52, 0xcf, 0x7a};

// ----- Globals -----
EasyButton button(BUTTON_PIN);
LedBlinker blinker(LED_BUILTIN);

EntityRegistry registry;
BinarySensor flashBtn("flash-button", DEVICE_ID);

// ----- Helpers -----
bool sendJson(const JsonDocument& doc) {
  String buffer;
  size_t len = serializeJson(doc, buffer);
  return esp_now_send(GATEWAY_ADDRESS, (uint8_t *) buffer.c_str(), len) == 0;
}

bool sendDiscovery(Entity& e) {
  JsonDocument doc;
  e.serializeDiscovery(doc);
  return sendJson(doc);
}

bool sendState(Entity& e) {
  JsonDocument doc;
  e.serializeState(doc);
  return sendJson(doc);
}

// ----- Callbacks -----
void onDataRcvd(uint8_t *macaddr, uint8_t *data, uint8_t len, signed int rssi, bool broadcast) {
  blinker.blink(5);
}

void onDataSend(uint8_t *macaddr, uint8_t status) {
  if (status == 0) {
    blinker.blink(); 
  }
}


void setup() {
  blinker.setup(); 
  button.begin();

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(false);

  if (!quickEspNow.begin(ESPNOW_WIFI_CHANNEL)) {
    delay(1000);
    ESP.restart();
  }

  quickEspNow.onDataSent(onDataSend);
  quickEspNow.onDataRcvd(onDataRcvd);

  registry.add(&flashBtn);

  bool allOk = true;
  registry.forEach([&](Entity& e) {
    allOk = allOk && sendDiscovery(e);
  });
}

void loop() {
  button.read();
  blinker.update();

  if(button.pressedFor(5)){
    flashBtn.setState(true);
  }

  if(button.releasedFor(10)){
    flashBtn.setState(false);
  }

   if (flashBtn.isDirty()) {
    if(sendState(flashBtn)){
      flashBtn.clearDirty();
    }
  }
}
