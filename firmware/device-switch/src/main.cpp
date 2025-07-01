#include <Arduino.h>
#include <ESP8266WiFi.h>

#include <QuickESPNow.h>
#include <EasyButton.h>
#include <ArduinoJson.h>

#include <Config.h>
#include <SendUtils.h>
#include <DiscoveryManager.h>
#include <entities/EntityRegistry.h>
#include <entities/BinarySensor.h>
#include <entities/Switch.h>


// ----- Configuration -----
#define BUTTON_PIN 0

#define DEVICE_ID "switch-device"
#define FLASH_BUTTON_ID "flash-button"
#define LED_SWITCH_ID "led-switch"


// ----- Globals -----
EasyButton button(BUTTON_PIN);

EntityRegistry registry;
BinarySensor flashBtn(FLASH_BUTTON_ID, DEVICE_ID);
Switch ledSwitch(LED_SWITCH_ID, DEVICE_ID);

// ----- Callbacks -----
static JsonDocument doc;
void IRAM_ATTR onDataRcvd(uint8_t *macaddr, uint8_t *data, uint8_t len, signed int rssi, bool broadcast) {
  DeserializationError err = deserializeJson(doc, data, len);
  if (err) return; 

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

  if (strcmp(id, ledSwitch.id()) == 0) {
    const char* stat = doc["stat"] | "";
    ledSwitch.setState(strcmp(stat, "ON") == 0);
  }
}

void onDataSend(uint8_t *macaddr, uint8_t status) {}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  button.begin();

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(false);

  registry.add(&flashBtn);
  registry.add(&ledSwitch);

  if (!quickEspNow.begin(ESPNOW_WIFI_CHANNEL)) {
    delay(1000);
    ESP.restart();
  }

  quickEspNow.onDataSent(onDataSend);
  quickEspNow.onDataRcvd(onDataRcvd);

  button.onPressed([](){ ledSwitch.setState(!ledSwitch.state()); });
  ledSwitch.onChange = [](bool st){ digitalWrite(LED_BUILTIN, !st); };

  discoveryInit();
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

  discoveryTick();
}
