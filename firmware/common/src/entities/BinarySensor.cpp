#include <entities/BinarySensor.h>

BinarySensor::BinarySensor(const char* id, const char* node_id)
  : _id(id), _node(node_id) {}

void BinarySensor::setState(bool newState) {
  if (_state != newState) {
    _state  = newState;
    _dirty  = true;
    if (onChange) onChange(_state);
  }
}

void BinarySensor::serializeDiscovery(JsonDocument& doc) const {
  doc["typ"]      = "dscvry";
  doc["dev_id"]   = _node;
  doc["p"]        = platform();
  doc["id"]       = _id;
}

void BinarySensor::serializeState(JsonDocument& doc) const {
  doc["dev_id"]   = _node;
  doc["p"]        = platform();
  doc["id"]       = _id;
  doc["stat"]     = _state ? "ON" : "OFF";
}
