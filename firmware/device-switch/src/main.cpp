#include <Arduino.h>
#include <ESP8266WiFi.h>

#include <QuickESPNow.h>
#include <EasyButton.h>
#include <ArduinoJson.h>

#include "entities/EntityRegistry.h"
#include "entities/BinarySensor.h"
#include "entities/Switch.h"

// ----- Configuration -----
#define ESPNOW_WIFI_CHANNEL 6
#define SERIAL_BAUD_RATE 9600
#define MAX_PAYLOAD_SIZE 250
#define BUTTON_PIN 0
#define DEVICE_ID "switch-device"

u8 GATEWAY_ADDRESS[6] = {0x8c, 0xaa, 0xb5, 0x52, 0xcf, 0x7a};

// ----- Globals -----
EasyButton button(BUTTON_PIN);

EntityRegistry registry;
BinarySensor flashBtn("flash-button", DEVICE_ID);
Switch ledSwitch("led-switch", DEVICE_ID);

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
  JsonDocument doc;
  deserializeJson(doc, data, len);

  if(doc["id"] == "led-switch") {
    ledSwitch.setState(doc["stat"] == "ON");
  }
}

void onDataSend(uint8_t *macaddr, uint8_t status) {
}


void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

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
  registry.add(&ledSwitch);
  
  button.onPressed([](){ ledSwitch.setState(!ledSwitch.state()); });
  ledSwitch.onChange = [](bool st){ digitalWrite(LED_BUILTIN, !st); };

  // bool allOk = true;
  // registry.forEach([&](Entity& e) {
  //   allOk = allOk && sendDiscovery(e);
  // });

  while(!sendDiscovery(flashBtn)){
    continue;
  };
  while(!sendDiscovery(ledSwitch)){
    continue;
  }
}

void loop() {
  button.read();

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

  if(ledSwitch.isDirty()){
    if(sendState(ledSwitch)){
      ledSwitch.clearDirty();
    }
  }
}
