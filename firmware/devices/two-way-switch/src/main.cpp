#include <NowLink.h>
#include <QuickESPNow.h>
#include <EasyButton.h>

#include "config.h"

#define BUTTON_PIN 0
#define LED_PIN LED_BUILTIN

EasyButton button(BUTTON_PIN);

NowBinarySensor btn("flash_button");
NowSwitch       led("led_switch");

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
  
  led.onChange = [](bool s){ digitalWrite(LED_PIN, !s); };

  button.begin();
  button.onPressed([](){ led.setState(!led.state()); });
}  
void loop (){
  button.read();

  if(!btn.state() && button.pressedFor(5)){
    btn.setState(true);
  }
  
  if(btn.state() && button.releasedFor(10)){
    btn.setState(false);
  }

  Now.loop();
}