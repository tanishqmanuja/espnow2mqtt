#include <Arduino.h>

#include "DiscoveryManager.h"
#include "helpers.h"

#define DISCOVERY_QUEUE_SIZE 5

static DiscoReq queue[DISCOVERY_QUEUE_SIZE];
static uint8_t head = 0, tail = 0, count = 0;

void discoveryInit() {
  head = tail = count = 0;
}

void discoEnqueue(Entity* e) {
  if (count < DISCOVERY_QUEUE_SIZE) {
    queue[tail] = {e, 0};
    tail = (tail + 1) % DISCOVERY_QUEUE_SIZE;
    count++;
  }
}

bool discoDequeue(DiscoReq& out) {
  if (count == 0) return false;
  out = queue[head];
  head = (head + 1) % DISCOVERY_QUEUE_SIZE;
  count--;
  return true;
}

void discoveryTick() {
  DiscoReq req;
  if (discoDequeue(req)) {
    if (!sendDiscovery(*req.ent)) {
      if (++req.attempts < 3) {
        delay(50);
        discoEnqueue(req.ent);
      }
    }
  }
}
