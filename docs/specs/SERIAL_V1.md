# Serial V1

## Constants

- SYNC = `0xAA`
- VERSION = `0x01`

## Packet Types

| Name             | Byte | PC → ESP | ESP → PC |
| ---------------- | ---- | -------- | -------- |
| GATEWAY_INIT     | 0x01 | ❌       | ✅       |
| ESPNOW_RX        | 0x20 | ❌       | ✅       |
| ESPNOW_TX        | 0x21 | ✅       | ❌       |
| ESPNOW_TX_STATUS | 0x22 | ❌       | ✅       |

## Serial Encode (Device to App)

`<SYNC(1B)><VERSION(1B)><TYPE(1B)><...TDATA...><CRC8(1B)>`

### TYPE GATEWAY_INIT

TDATA = <MAC(6B)> // MAC of the gateway

### TYPE ESPNOW_RX

TDATA = <MAC(6B)><RSSI(1B)><LEN(1B)><PAYLOAD(LEN)> // MAC of the sender of ESPNOW msg

### TYPE ESPNOW_TX_STATUS

TDATA = <MAC(6B)><STATUS(1B)> // MAC of the destination ESPNOW device

## Serial Decode (App to Device)

`<SYNC(1B)><VERSION(1B)><TYPE(1B)><...TDATA...><CRC8(1B)>`

### TYPE ESPNOW_TX

TDATA = <MAC(6B)><LEN(1B)><PAYLOAD(LEN)> // MAC of the destination ESPNOW device

## Constraints and Assumptions

- ESPNOW Payload length will always be less than or equal to 250 bytes
- CRC8 will be a simple XOR on everything between <SYNC> and <CRC8>
