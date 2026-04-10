# WhatsApp Gateway

A production-ready middleware that lets external systems (monitoring tools, alert platforms, automation scripts) send WhatsApp messages via a simple HTTP API.

**Stack:** Node.js · Baileys · Express · BullMQ · Redis · React · Vite · TailwindCSS · Docker

---

## Architecture

```
External System
      │  POST /send-message
      ▼
  Backend (Express)
      │  validates + normalises ID
      ▼
  BullMQ Queue ──► Redis
      │
      ▼
  Worker (Baileys)
      │
      ▼
  WhatsApp
```

---

## Quick Start (Docker)

```bash
# 1. Clone / enter the project directory
cd WA-Gateway

# 2. Create your environment file
cp .env.example .env
# Edit .env — set a strong API_KEY and matching VITE_API_KEY

# 3. Build and launch
docker-compose up -d --build

# 4. Watch backend logs to get the QR code
docker-compose logs -f backend
```

Once the QR appears in the terminal, open the admin UI at **http://localhost:3001** and navigate to **QR Code** to scan it with your phone.

---

## Local Development (without Docker)

### Prerequisites
- Node.js 20+
- Redis (running on localhost:6379)

### Backend

```bash
cd backend
cp .env.example .env
# Set REDIS_HOST=localhost in .env
npm install
npm run dev
# → http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3001
```

The Vite dev server automatically proxies `/api/*` and `/socket.io/*` to the backend.

---

## API Reference

All protected endpoints require the header:
```
x-api-key: <your API_KEY>
```

### `GET /status` (public)
Returns current WhatsApp connection state.
```json
{
  "status": "connected",
  "phone": "628123456789",
  "name": "Your Name"
}
```

### `GET /qr` (public)
Returns the QR code as a base64 `data:image/png;base64,...` string.
```json
{ "qr": "data:image/png;base64,..." }
```

### `POST /send-message` ⚑ protected
Queues a WhatsApp message for delivery.

**Request:**
```json
{
  "message": "*Device:* Router01\n*IP:* 10.10.10.1\n*Status:* DOWN",
  "id": "628123456789@c.us"
}
```

**Accepted `id` formats:**

| Format | Type | Example |
|--------|------|---------|
| Plain number | Personal | `628123456789` |
| `@c.us` suffix | Personal | `628123456789@c.us` |
| `@s.whatsapp.net` suffix | Personal | `628123456789@s.whatsapp.net` |
| `@g.us` suffix | Group | `120363025600132873@g.us` |

**Response (202):**
```json
{
  "success": true,
  "jobId": "1",
  "message": "Message queued successfully",
  "destination": "628123456789@s.whatsapp.net",
  "type": "personal"
}
```

### `GET /groups` ⚑ protected
Returns all groups the WhatsApp account has joined.
```json
[
  { "id": "120363025600132873@g.us", "name": "Network Team" }
]
```

### `GET /logs?limit=100` ⚑ protected
Returns the most recent message logs (newest first).
```json
[
  {
    "timestamp": "2026-04-10T10:00:00.000Z",
    "id": "628123456789@c.us",
    "message": "Test alert",
    "status": "success",
    "error": null
  }
]
```

### `POST /reset-session` ⚑ protected
Deletes the session files and forces a new QR login.

### `GET /health` (public)
Returns `{ "ok": true }` — used by Docker health checks.

---

## Example cURL

```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key_here" \
  -d '{
    "message": "*Alert:* Router01 is DOWN",
    "id": "628123456789"
  }'
```

### Send to a group

```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key_here" \
  -d '{
    "message": "Scheduled maintenance in 30 minutes",
    "id": "120363025600132873@g.us"
  }'
```

---

## Admin Dashboard

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Connection status, reset session |
| QR Code | `/qr` | Scan to link WhatsApp (auto-refreshes) |
| Groups | `/groups` | Browse and copy Group IDs |
| Logs | `/logs` | Message history with success/fail status |

---

## Project Structure

```
WA-Gateway/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express + Socket.IO entry point
│   │   ├── whatsapp.js            # Baileys singleton (QR, send, groups)
│   │   ├── routes/index.js        # Route registration
│   │   ├── controllers/           # One controller per resource
│   │   ├── services/
│   │   │   ├── queue.service.js   # BullMQ queue + worker
│   │   │   └── log.service.js     # NDJSON log file
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js
│   │   │   └── rateLimit.middleware.js
│   │   └── utils/idNormalizer.js
│   ├── sessions/                  # Baileys multi-file auth (git-ignored)
│   ├── logs/                      # Message logs (git-ignored)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Routes + Socket.IO client
│   │   ├── pages/                 # Dashboard, QRPage, Groups, Logs
│   │   ├── components/            # Layout, StatusBadge
│   │   └── services/api.js        # Axios instance + endpoint helpers
│   ├── nginx.conf                 # Reverse proxy config
│   └── Dockerfile
├── sessions/                      # Mounted by backend container
├── logs/                          # Mounted by backend container
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Security Notes

- The `x-api-key` header is required on all write/read endpoints. Set a strong random key (`openssl rand -hex 32`).
- The admin dashboard URL (port 3001) should **not** be exposed to the public internet. Place it behind a VPN or firewall.
- `sessions/` contains WhatsApp credentials — keep it out of version control (`.gitignore` it).
- The `VITE_API_KEY` is baked into the frontend JS bundle — anyone who can access the UI can see it. This is acceptable for internal tools; for public-facing deployments use a separate auth layer.

---

## .gitignore Recommendation

```
.env
sessions/
logs/
node_modules/
dist/
```

---

## Retry / Queue Behaviour

Messages are queued via **BullMQ + Redis**. Each job is attempted up to **3 times** with exponential back-off (2 s → 4 s → 8 s). Only after all attempts are exhausted is the job logged as `failed`.

---

## License

MIT
