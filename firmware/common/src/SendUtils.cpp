#include <QuickESPNow.h>

#include <SendUtils.h>

#ifndef GATEWAY_ADDRESS
uint8_t GATEWAY_ADDRESS[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
#endif

bool sendJson(const JsonDocument& doc) {
  String buffer;
  size_t len = serializeJson(doc, buffer);
  return quickEspNow.send(GATEWAY_ADDRESS, (uint8_t *) buffer.c_str(), len) == 0;
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
