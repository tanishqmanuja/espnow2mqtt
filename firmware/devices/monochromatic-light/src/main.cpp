#include <QuickESPNow.h>
#include <EasyButton.h>

#include <NowLink.h>
#include <components/MonochromaticLight.h>

#include "config.h"

#define BUTTON_PIN 0
#define LED_PIN LED_BUILTIN

EasyButton button(BUTTON_PIN);

NowMonochromaticLight lamp("desk_lamp");

bool sendCb(const uint8_t* data, size_t len){
  return quickEspNow.send(GW, data, len) == 0; 
}
void onRx(const uint8_t* mac, const uint8_t* data, uint8_t len, int rssi, bool is_broadcast){
  Now.handlePacket(data,len); 
}

void setup(){
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(false);
  
  quickEspNow.begin(ESPNOW_WIFI_CHANNEL);
  quickEspNow.onDataRcvd(onRx);
  
  Now.begin(DEVICE_ID);
  Now.onSend(sendCb);
  
  lamp.onChange = [](bool s, u8_t br){
    if (s){
      analogWrite(LED_BUILTIN, 255 - br);
    } else {
      digitalWrite(LED_BUILTIN, HIGH);
    }
  };

  button.begin();
  button.onPressed([](){ lamp.setOn(!lamp.isOn()); });
}  
void loop (){
  button.read();
  Now.loop();
}