# Glow 58 mm thermal printer companion

Run this small local service on the computer connected to the printer:

```bash
npm install
npm start
```

The dashboard automatically calls `http://127.0.0.1:4001` whenever **Print** is selected. The companion discovers compatible serial 58 mm ESC/POS printers and sends the receipt directly. To use another local address or port, set `VITE_THERMAL_PRINTER_COMPANION_URL` when building the dashboard.

If the printer is installed only as a normal Windows/macOS printer, the dashboard instead opens the system print dialog. Select the printer there and set its paper size to **58 mm** with zero margins.
