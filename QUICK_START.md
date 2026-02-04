# Quick Start Guide - Multi-Device Access

## Prerequisites
- macOS with Terminal or Linux/Windows with bash
- Node.js and npm installed
- Supabase project with credentials in `backend/.env`

## Step 1: Get Your Machine's IP Address

```bash
# On macOS/Linux:
ipconfig getifaddr en0  # or en1 for some Macs

# Result: 192.168.1.100 (example)
```

## Step 2: Start the Backend (Terminal 1)

```bash
cd backend
npm run dev
```

Expected output:
```
Server running on port 3000
   Local: http://localhost:3000
   Network: http://<your-ip>:3000
```

## Step 3: Start the Frontend (Terminal 2)

```bash
npm run dev
```

Expected output:
```
  Local:   http://localhost:5173/
  Network: http://<your-ip>:5173/
```

## Step 4: Access on Different Devices

### Local Machine
- Desktop/Laptop: `http://localhost:5173`

### Other Devices (Phone, Tablet, Another Computer)
- Open browser: `http://<YOUR_MACHINE_IP>:5173`
- Replace `<YOUR_MACHINE_IP>` with actual IP from Step 1

**Example:** If your IP is `192.168.1.100`:
- Phone: `http://192.168.1.100:5173`
- Tablet: `http://192.168.1.100:5173`
- Other laptop: `http://192.168.1.100:5173`

## Troubleshooting

### "Cannot reach server from phone"
1. Check both devices are on **same WiFi network**
2. Verify backend is running: `curl http://localhost:3000/health`
3. Try pinging your machine: `ping 192.168.1.100`
4. Check firewall isn't blocking port 3000/5173

### "Blank page on mobile"
1. Open browser console (long-press → Inspect) to see errors
2. Verify API URL is correctly formed
3. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+F5 on Windows)

### "Connection refused" 
- Backend not running
- Wrong IP address used
- Port not open in firewall

### CORS errors
- Hard refresh frontend
- Restart backend

## How It Works

1. **Frontend** (Vite) runs on port 5173 and listens on all network interfaces (`0.0.0.0`)
2. **Backend** (Express) runs on port 3000 and listens on all interfaces
3. **API Detection** - Frontend automatically detects its own host and connects backend on same IP
4. **Data** - All data synced through backend to Supabase

## Production Deployment

For production (not local network):
1. Deploy backend to cloud (Heroku, Render, AWS, etc.)
2. Set `VITE_API_URL` environment variable to production backend URL
3. Deploy frontend to cloud (Vercel, Netlify, AWS, etc.)
4. Both services need valid HTTPS certificates

See `NETWORK_SETUP.md` for more detailed information.
