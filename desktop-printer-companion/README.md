# Glow Thermal Printer Companion

This desktop companion can send ESC/POS receipt data directly to a supported 58mm thermal printer over USB serial.

## Setup

npm install
npm start

## API

GET /status
- Lists serial ports and connected printers.

POST /print
- Body: { "receipt": { ...receipt object... }, "port": "COM3" }
- If port is omitted, the companion will auto-detect a supported printer port.

## Supported printer profile

- Epson TM-T20II
- 58mm thermal printer workflow
