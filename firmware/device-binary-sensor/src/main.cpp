#include <Arduino.h>
#include <ESP8266WiFi.h>

#include <QuickESPNow.h>
#include <EasyButton.h>
#include <ArduinoJson.h>

#include "config.h"
#include "helpers.h"

#include "utils/LedBlinker.h"
#include "entities/BinarySensor.h"
#include "entities/EntityRegistry.h"
#include "DiscoveryManager.h"

// ----- Configuration -----
#define BUTTON_PIN 0

#define DEVICE_ID "sensor-device"
#define FLASH_BUTTON_ID "flash-button"


// ----- Globals -----
EasyButton button(BUTTON_PIN);
LedBlinker blinker(LED_BUILTIN);

EntityRegistry registry;
BinarySensor flashBtn(FLASH_BUTTON_ID, DEVICE_ID);


// ----- Callbacks -----
JsonDocument doc;
void IRAM_ATTR onDataRcvd(uint8_t *macaddr, uint8_t *data, uint8_t len, signed int rssi, bool broadcast) {
  blinker.blink(5);

  DeserializationError err = deserializeJson(doc, data,len);
  if(err) return;

  const char* typ = doc["typ"] | "";
  const char* id  = doc["id"]  | "";

  if(strcmp(typ, "dscvry") == 0){
    registry.forEach([&](Entity& e){
      if (strcmp(id, e.id()) == 0) {
        discoEnqueue(&e);
      }
    });
    return;
  }
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

  registry.add(&flashBtn);

  if (!quickEspNow.begin(ESPNOW_WIFI_CHANNEL)) {
    delay(1000);
    ESP.restart();
  }

  quickEspNow.onDataSent(onDataSend);
  quickEspNow.onDataRcvd(onDataRcvd);

  discoveryInit();
  registry.forEach([](Entity& e) {
    discoEnqueue(&e); 
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

  discoveryTick();
}
