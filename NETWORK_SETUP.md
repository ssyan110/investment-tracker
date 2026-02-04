# Multi-Device Network Setup

This app can now be accessed from any device on your network. Follow these steps:

## Starting the App

### 1. Start the Backend Server
```bash
cd backend
npm run dev
```

The backend will start on port `3000` and listen on all network interfaces.

### 2. Start the Frontend (Vite Dev Server)
In a new terminal:
```bash
npm run dev
```

Vite will start on port `5173` by default.

### 3. Find Your Machine's IP Address

#### On macOS:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Look for an IP like `192.168.x.x` or `10.x.x.x`

#### On Linux:
```bash
hostname -I
```

#### On Windows:
```bash
ipconfig
```

Look for "IPv4 Address" under your network adapter.

## Accessing from Different Devices

### On Local Machine
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000/api`

### From Other Devices on the Same Network
- Frontend: `http://<YOUR_MACHINE_IP>:5173`
- Backend: `http://<YOUR_MACHINE_IP>:3000/api`

**Example:** If your machine's IP is `192.168.1.100`:
- Open `http://192.168.1.100:5173` on your phone/tablet browser

### Note for Mobile Devices
- Ensure your phone/tablet is connected to the same WiFi network
- Disable VPN if the connection doesn't work
- If you get a blank screen, the phone may be blocking HTTP. Try:
  - Using HTTPS (requires certificate setup)
  - Adding `http://` explicitly in browser
  - Checking firewall settings

## Configuration Options

### Dynamic API Detection (Default)
The app automatically detects your device's IP and connects to the backend on the same host.
This works seamlessly for multi-device access.

### Static Configuration
If you need to set a specific API endpoint, create a `.env` file:

```env
VITE_API_URL=http://192.168.1.100:3000/api
```

Then rebuild the frontend:
```bash
npm run build
```

## Troubleshooting

### "Connection Refused" Error
1. Verify the backend is running: `curl http://localhost:3000/health`
2. Check your firewall allows port 3000
3. Ensure both devices are on the same network

### "Cannot GET /api/assets"
1. The backend is running but not connected to Supabase
2. Check backend/.env has valid Supabase credentials
3. Verify Supabase tables exist (assets, transactions)

### iOS Safari Blank Screen
1. Check browser console (long-press -> Inspect Element)
2. Verify the API URL is correct
3. Try clearing cache (Settings > Safari > Clear History and Website Data)

### CORS Errors
The backend has CORS enabled for all origins. If you still see CORS errors:
1. Restart the backend server
2. Hard refresh the frontend (Cmd+Shift+R or Ctrl+Shift+F5)
