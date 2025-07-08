#pragma once

#include <ArduinoJson.h>
#include <functional>
#include <string.h>

class NowEntity;

namespace NowLink {
  using SendCallback = std::function<bool(const uint8_t* data, size_t len)>;

  void begin(const char* deviceId);
  void loop();
  const char* id();
  void handlePacket(const uint8_t* data, size_t len);
  void setSendCallback(SendCallback cb);

  void registerEntity(NowEntity* e, bool init_discovery);
}

#include "NowEntity.h"
#include "NowConstants.h"

namespace {
  namespace K = NowConstants::Keys;
  namespace T = NowConstants::Types;

  struct Registry {
    static constexpr uint8_t MAX = 10;
    NowEntity* arr[MAX];
    uint8_t n = 0;

    bool add(NowEntity* e) {
      if (n < MAX) {
        arr[n++] = e;
        return true;
      }
      return false;
    }

    template<typename F>
    void forEach(F&& f) {
      for (uint8_t i = 0; i < n; ++i)
        f(*arr[i]);
    }

    NowEntity* find(const char* id) {
      for (uint8_t i = 0; i < n; ++i)
        if (!strcmp(id, arr[i]->id()))
          return arr[i];
      return nullptr;
    }
  };

  struct DiscoveryRequest {
    NowEntity* ent;
    uint8_t attempts;
  };

  struct DiscoveryQueue {
    static constexpr uint8_t Q = 5;
    DiscoveryRequest q[Q];
    uint8_t h = 0, t = 0, c = 0;

    void push(NowEntity* e) {
      if (c < Q) {
        q[t] = { e, 0 };
        t = (t + 1) % Q;
        ++c;
      }
    }

    bool pop(DiscoveryRequest& out) {
      if (!c) return false;
      out = q[h];
      h = (h + 1) % Q;
      --c;
      return true;
    }
  };

  struct Core {
    const char* devId = "";
    Registry reg;
    DiscoveryQueue dq;
    NowLink::SendCallback sender = nullptr;
    JsonDocument _payload;

    bool send(const JsonDocument& d) {
      if (!sender) return false;
      String buf;
      size_t len = serializeJson(d, buf);
      return sender((const uint8_t*)buf.c_str(), len);
    }

    void loop() {
      reg.forEach([this](NowEntity& e) {
        if (e.isDirty()) {
          JsonDocument d;
          e.serializeState(d);
          if (send(d)) e.clearDirty();
        }
      });

      DiscoveryRequest r;
      if (dq.pop(r)) {
        JsonDocument d;
        r.ent->serializeDiscovery(d);
        send(d);
      }
    }

    void rx(const uint8_t* data, size_t len) {
      DeserializationError err = deserializeJson(_payload, data, len);
      if (err) return;

      const char* type = _payload[K::TYPE] | "";
      const char* id = _payload[K::ID] | "";

      if (!strcmp(type, T::DISCOVERY)) {
        if (auto* e = reg.find(id))
          dq.push(e);
        return;
      }

      if (auto* e = reg.find(id)) {
        e->handlePayload(_payload);
      }
    }
  } core;
}

namespace NowLink {
  void registerEntity(NowEntity* e, bool init_discovery) {
    core.reg.add(e);
    if (init_discovery) core.dq.push(e);
  }

  void begin(const char* deviceId) {
    core.devId = deviceId;
  }

  void loop() {
    core.loop();
  }

  const char* id() {
    return core.devId;
  }

  void handlePacket(const uint8_t* d, size_t l) {
    core.rx(d, l);
  }

  void setSendCallback(SendCallback cb) {
    core.sender = cb;
  }
}

class NowLinkClass {
public:
  void begin(const char* id){ NowLink::begin(id);}  
  void loop(){ NowLink::loop(); }
  void onSend(NowLink::SendCallback cb){ NowLink::setSendCallback(cb);}  
  void handlePacket(const uint8_t* d,size_t l){ NowLink::handlePacket(d,l);}  
  const char* id(){ return NowLink::id(); }
};
inline NowLinkClass Now;
