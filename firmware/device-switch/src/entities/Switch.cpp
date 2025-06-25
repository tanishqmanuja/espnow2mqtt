#include "Switch.h"

Switch::Switch(const char* id, const char* node_id)
  : _id(id), _node(node_id) {}

void Switch::setState(bool newState) {
  if (_state != newState) {
    _state = newState;
    _dirty = true;
    if (onChange) onChange(_state);
  }
}

void Switch::serializeDiscovery(JsonDocument& doc) const {
  doc["typ"]     = "dscvry";
  doc["dev_id"]  = _node;
  doc["p"]       = platform();   // "switch"
  doc["id"]      = _id;
}

void Switch::serializeState(JsonDocument& doc) const {
  doc["dev_id"]  = _node;
  doc["p"]       = platform();
  doc["id"]      = _id;
  doc["stat"]    = _state ? "ON" : "OFF";
}
