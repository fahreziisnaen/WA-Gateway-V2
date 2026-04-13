# WhatsApp Gateway

A production-ready middleware that lets external systems (monitoring tools, alert platforms, automation scripts) send WhatsApp messages via a simple HTTP API.

**Stack:** Node.js · Baileys · Express · BullMQ · Redis · React · Vite · TailwindCSS · nginx · Docker

---

## Architecture

```
External System (SolarWinds, etc.)
      │  POST /send-message
      │  Authorization: Bearer <api-key>
      ▼
  Backend :3000 (Express)
      │  Auth middleware  → validates API key
      │  ID normalizer   → converts to WhatsApp JID
      │  getRecipientName → resolves display name
      ▼
  Queue Service (BullMQ + Redis)
      │  3 attempts, exponential backoff (2s → 4s → 8s)
      │  falls back to in-process direct send if Redis unavailable
      ▼
  Baileys (WhatsApp Web)
      │  multi-device session per instance
      ▼
  WhatsApp Group / Personal

  ─────────────────────────────────────────────────────
  Admin Dashboard :3001 (React + nginx)
      │  nginx proxies /api/*      → backend:3000
      │  nginx proxies /socket.io/ → backend:3000 (WebSocket)
      └  real-time status via Socket.IO `instance_status` event
```

---

## Quick Start (Docker)

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env — at minimum set API_KEY and JWT_SECRET:
#   openssl rand -hex 32

# 2. Build and launch all services
docker compose up -d --build

# 3. Watch backend logs
docker compose logs -f backend
```

Open the admin UI at **http://localhost:3001**

Default login: `admin` / `admin123` — **change this immediately** via Settings → Users.

---

## First-Time Setup

1. Log in at **http://localhost:3001**
2. Go to **Instances** — the default instance `wa1` is already created
3. Click the **QR** button (or **Add Instance** for a new one) — a QR code modal opens automatically
4. Scan the QR with WhatsApp on your phone (Settings → Linked Devices → Link a Device)
5. Once connected, go to **Groups** to find and copy your group IDs
6. Go to **Settings → API Keys** → generate a key for SolarWinds or any external system

---

## Local Development (without Docker)

**Prerequisites:** Node.js 20+, Redis (optional — app falls back to direct send if unavailable)

### Backend

```bash
cd backend
# Create a local .env manually (copy values from root .env.example, set REDIS_HOST=localhost)
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

The Vite dev server proxies `/api/*` and `/socket.io/*` to `http://localhost:3000` automatically.

---

## API Reference

### Authentication

| Route | Auth required |
|-------|--------------|
| `POST /send-message` | API key — `Authorization: Bearer <key>` or `x-api-key: <key>` |
| `/instances/*`, `/logs`, `/admin/*` | JWT — `Authorization: Bearer <jwt>` (issued by `/auth/login`) |
| `/health`, `/status`, `/auth/login` | None |

> **Rate limiting:** All endpoints (except `/health`) are limited to **100 requests per minute per IP**.

---

### `GET /health` — public

```json
{ "ok": true, "ts": 1712345678901 }
```

---

### `GET /status` — public (legacy)

Returns status of all instances. Kept for backwards compatibility.

```json
{
  "status": "connected",
  "phone": "628111000111",
  "name": "Your Name",
  "instances": [
    {
      "id": "wa1",
      "name": "WhatsApp 1",
      "status": "connected",
      "phone": "628111000111",
      "waName": "Your Name"
    }
  ]
}
```

`status`, `phone`, `name` reflect the **first** instance. Use `GET /instances` for full multi-instance data.

---

### `POST /auth/login` — public

**Request:**
```json
{ "username": "admin", "password": "admin123" }
```

**Response (200):**
```json
{
  "token": "<jwt — valid 8 hours>",
  "user": { "id": "a1b2c3d4", "username": "admin", "role": "admin" }
}
```

---

### `POST /send-message` — API key required

**Request:**
```json
{
  "message": "🚨 *Device Down Alert*\n\n*Device:* Core-Switch-01\n*IP:* 10.10.10.1\n*Status:* DOWN",
  "id": "120363025600132873@g.us",
  "from": "wa1"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `message` | Yes | Text to send. Supports WhatsApp markdown: `*bold*`, `_italic_`, `~strikethrough~` |
| `id` | Yes | Recipient — see accepted formats below |
| `from` | No | Instance ID to send from (e.g. `wa1`). Defaults to the first connected instance. |

**Accepted `id` formats:**

| Format | Type | Example |
|--------|------|---------|
| Plain number | Personal | `628123456789` |
| `@c.us` suffix | Personal (legacy) | `628123456789@c.us` |
| `@s.whatsapp.net` suffix | Personal | `628123456789@s.whatsapp.net` |
| `@g.us` suffix | Group | `120363025600132873@g.us` |

**Response (202 Accepted):**
```json
{
  "success": true,
  "jobId": "42",
  "message": "Message queued successfully",
  "destination": "120363025600132873@g.us",
  "type": "group",
  "sentFrom": "wa1",
  "sentFromName": "WhatsApp 1"
}
```

**Error responses:**

| Code | Reason |
|------|--------|
| 400 | Missing/invalid `message` or `id`, invalid ID format |
| 401 | Missing or invalid API key |
| 404 | Instance `from` not found |
| 422 | Personal number not registered on WhatsApp |
| 503 | No connected WhatsApp instance available |

---

### `GET /instances` — JWT required

```json
[
  {
    "id": "wa1",
    "name": "WhatsApp 1",
    "status": "connected",
    "phone": "628111000111",
    "waName": "Your Name"
  }
]
```

`status` values: `"connected"` | `"connecting"` | `"disconnected"`

---

### `POST /instances` — JWT required

**Request:**
```json
{ "id": "wa2", "name": "WhatsApp 2" }
```

> `id` must only contain letters, numbers, `_`, or `-`. It is stored in lowercase.

**Response (201):**
```json
{ "success": true, "id": "wa2", "name": "WhatsApp 2" }
```

After creation, the instance starts connecting and a QR code becomes available immediately.

---

### `GET /instances/:id/status` — JWT required

Returns the same shape as a single element from `GET /instances`.

---

### `GET /instances/:id/qr` — JWT required

Returns QR code while the instance is waiting to be scanned. Refreshes every ~20 seconds by Baileys.

```json
{ "qr": "data:image/png;base64,..." }
```

Returns `404` if the instance is already connected, or if QR hasn't been generated yet.

> The admin dashboard polls this endpoint every **3 seconds** and shows an updated QR image in real time.

---

### `POST /instances/:id/reset` — JWT required

Disconnects the instance, wipes all session files, and triggers a new QR code.

```json
{ "success": true, "message": "Instance reset. Scan new QR to reconnect." }
```

---

### `DELETE /instances/:id` — JWT required

Permanently removes the instance and deletes its session directory.

```json
{ "success": true }
```

---

### `GET /instances/:id/groups` — JWT required

Returns all WhatsApp groups the instance is a member of. Order depends on WhatsApp's response (the admin UI sorts them alphabetically client-side).

```json
[
  { "id": "120363025600132873@g.us", "name": "Network Team" },
  { "id": "120363099887700123@g.us", "name": "NOC Alerts" }
]
```

---

### `GET /logs?limit=100` — JWT required

Returns the most recent log entries in reverse chronological order (newest first). Maximum `limit` is 1000.

```json
[
  {
    "timestamp": "2026-04-13T10:00:00.000Z",
    "sourceIp": "192.168.1.10",
    "instanceId": "wa1",
    "instancePhone": "628111000111",
    "id": "120363025600132873@g.us",
    "recipientName": "Network Team",
    "message": "Device Down Alert",
    "status": "success",
    "error": null
  }
]
```

`status` values: `"success"` | `"failed"`. On failure, `error` contains the error message.

---

### `GET /admin/users` — JWT required

```json
[
  {
    "id": "a1b2c3d4",
    "username": "admin",
    "role": "admin",
    "createdAt": "2026-04-13T08:00:00.000Z"
  }
]
```

Password hashes are never returned.

---

### `POST /admin/users` — JWT required

**Request:**
```json
{ "username": "ops", "password": "securepassword" }
```

> Password must be at least **6 characters**.

**Response (201):**
```json
{ "id": "e5f6g7h8", "username": "ops", "role": "admin", "createdAt": "2026-04-13T09:00:00.000Z" }
```

---

### `PUT /admin/users/:id/password` — JWT required

**Request:**
```json
{ "password": "newpassword" }
```

**Response:** `{ "success": true }`

---

### `DELETE /admin/users/:id` — JWT required

`{ "success": true }`

> Cannot delete your own account. Cannot delete the last remaining user.

---

### `GET /admin/apikeys` — JWT required

Key values are masked — only the first 8 and last 4 characters visible.

```json
[
  {
    "id": "abc12345",
    "name": "SolarWinds Prod",
    "keyMasked": "wag_1234••••••••5678",
    "createdAt": "2026-04-13T08:00:00.000Z",
    "lastUsed": "2026-04-13T10:00:00.000Z"
  }
]
```

---

### `POST /admin/apikeys` — JWT required

**Request:**
```json
{ "name": "SolarWinds Prod" }
```

**Response (201):** The full key is returned **only this once** — copy it immediately.

```json
{
  "id": "abc12345",
  "name": "SolarWinds Prod",
  "key": "wag_a1b2c3d4e5f6...48hexchars",
  "createdAt": "2026-04-13T08:00:00.000Z",
  "lastUsed": null
}
```

Key format: `wag_` prefix followed by 48 random hex characters.

---

### `DELETE /admin/apikeys/:id` — JWT required

`{ "success": true }`

---

## Real-Time Updates (Socket.IO)

The backend emits a `instance_status` event over Socket.IO whenever an instance changes state. The admin dashboard subscribes to this event and updates the UI without polling.

**Event payload:**
```json
{
  "id": "wa1",
  "name": "WhatsApp 1",
  "status": "connected",
  "phone": "628111000111",
  "waName": "Your Name"
}
```

Emitted on: QR generated, connection established, disconnection, logout.

---

## Example cURL

```bash
# Send to a group
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wag_your_api_key_here" \
  -d '{
    "message": "🚨 *Alert:* Router01 is DOWN",
    "id": "120363025600132873@g.us"
  }'

# Send to a personal number via a specific instance
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wag_your_api_key_here" \
  -d '{
    "message": "Test message",
    "id": "628123456789",
    "from": "wa1"
  }'

# Get JWT (dashboard login)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get recent logs (last 50)
curl "http://localhost:3000/logs?limit=50" \
  -H "Authorization: Bearer <jwt>"
```

---

## SolarWinds Setup

1. In SolarWinds Alert Manager, create a new alert action → **HTTP POST**
2. URL: `http://<server-ip>:3000/send-message`
3. Authentication: **Token**
4. Token: paste the key generated from **Settings → API Keys**
5. Content-Type: `application/json`
6. Body:
```json
{
  "message": "🚨 *Device Down Alert*\n\n*Device :* ${NodeName}\n*IP Address :* ${IP_Address}\n*Status :* DOWN",
  "id": "120363025600132873@g.us"
}
```

> Copy your Group ID from the **Groups** page in the admin dashboard.
> To send from a specific WhatsApp account, add `"from": "wa1"` to the body.

---

## Admin Dashboard

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Overview of all instances — status, phone, WhatsApp name |
| Instances | `/instances` | Add/remove instances, scan QR (auto-refreshes every 3s), reset session |
| Groups | `/groups` | Browse and search group IDs per connected instance |
| Logs | `/logs` | Message history — status, source IP, instance, recipient, message preview |
| Settings | `/settings` | API Keys tab and Users tab |

### Dashboard
Shows all instances as cards with status badges (connected/connecting/disconnected). When more than one instance is connected, a hint banner shows the `from` field usage example.

### Instances
- Instance list auto-polls every 5 seconds + receives real-time Socket.IO updates
- Click **QR** on a disconnected instance to open the QR modal
- QR modal auto-refreshes every 3 seconds; automatically shows "Connected!" when scan completes
- **Reset** disconnects, wipes session, and immediately opens a new QR modal
- Instance ID can be clicked to copy to clipboard

### Groups
- Automatically selects the first connected instance
- Instance switcher appears when multiple instances are connected
- Groups sorted alphabetically with live search (by name or group ID)
- Hover a group to reveal the **Copy ID** button

### Settings — API Keys
- Generate named keys; full key value is shown **once** immediately after creation
- Listed keys show masked value, creation date, and last used date
- Revoke any key permanently with confirmation dialog

### Settings — Users
- All users are `admin` role
- Cannot delete your own account or the last remaining user
- Change password modal accessible for any user (min 6 characters)

---

## Multi-Instance

Multiple WhatsApp accounts run simultaneously. Each instance has its own independent Baileys session in `sessions/<id>/`.

- Add instances from the **Instances** page — provide an ID (e.g. `wa2`) and a display name
- QR modal opens automatically after adding — scan to link that account
- Use `"from": "<instance-id>"` in the API body to route through a specific account
- If `from` is omitted, the first connected instance is used
- Instances persist across restarts via `data/instances.json` (Docker bind-mount)

---

## Project Structure

```
WA-Gateway/
├── backend/
│   ├── src/
│   │   ├── server.js                    # Express + Socket.IO entry point
│   │   ├── routes/index.js              # All route registrations
│   │   ├── controllers/
│   │   │   ├── auth.controller.js       # POST /auth/login
│   │   │   ├── message.controller.js    # POST /send-message
│   │   │   ├── instance.controller.js   # /instances/* CRUD + QR + groups
│   │   │   ├── status.controller.js     # GET /status (legacy, all instances)
│   │   │   ├── log.controller.js        # GET /logs
│   │   │   └── settings.controller.js   # /admin/users, /admin/apikeys
│   │   ├── services/
│   │   │   ├── waManager.js             # Multi-instance Baileys manager + contacts cache
│   │   │   ├── queue.service.js         # BullMQ + Redis with direct-send fallback
│   │   │   ├── log.service.js           # NDJSON append log (getLogs / addLog)
│   │   │   ├── user.service.js          # Users in data/users.json (bcrypt hashed)
│   │   │   └── apikey.service.js        # API keys in data/apikeys.json
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js       # API key validation (Bearer / x-api-key)
│   │   │   ├── jwt.middleware.js        # JWT validation + signToken()
│   │   │   └── rateLimit.middleware.js  # 100 req/min per IP (skips /health)
│   │   └── utils/idNormalizer.js        # Converts any ID format → WhatsApp JID
│   ├── .dockerignore
│   └── Dockerfile                       # Multi-stage: builder (native addons) → slim runtime
├── frontend/
│   ├── src/
│   │   ├── App.jsx                      # Routes, auth guard, Socket.IO `instance_status` listener
│   │   ├── context/AuthContext.jsx      # Login state, JWT in localStorage, auto-logout on 401
│   │   ├── services/
│   │   │   ├── api.js                   # Axios instance with JWT interceptor
│   │   │   └── socket.js               # Socket.IO singleton (connects to /)
│   │   ├── pages/
│   │   │   ├── Login.jsx                # Login form
│   │   │   ├── Dashboard.jsx            # Instance overview cards
│   │   │   ├── Instances.jsx            # Instance management + QR modal (3s poll)
│   │   │   ├── Groups.jsx               # Group browser with search + instance selector
│   │   │   ├── Logs.jsx                 # Collapsible log entries, auto-refresh 15s
│   │   │   └── Settings.jsx             # API Keys tab + Users tab
│   │   └── components/
│   │       ├── Layout.jsx               # Sidebar navigation + logout
│   │       └── StatusBadge.jsx          # connected / connecting / disconnected pill
│   ├── nginx.conf                       # SPA fallback + /api/* + /socket.io/ proxy
│   ├── .dockerignore
│   └── Dockerfile                       # Multi-stage: Vite build → nginx:alpine
├── sessions/                            # Baileys session files — git-ignored, Docker bind-mounted
├── logs/                                # messages.log (NDJSON) — git-ignored, Docker bind-mounted
├── data/                                # instances.json, users.json, apikeys.json — git-ignored, Docker bind-mounted
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Queue Behaviour

| Mode | Condition | Behaviour |
|------|-----------|-----------|
| BullMQ + Redis | Redis reachable on startup | Jobs queued, 3 attempts, exponential backoff (2s → 4s → 8s) |
| Direct (fallback) | Redis unavailable | Send immediately in-process, same 3-attempt backoff |

The app detects Redis availability at startup automatically — no config change required to switch modes.

---

## Security Notes

- **API keys** are stored in plaintext in `data/apikeys.json` — the file is git-ignored and Docker bind-mounted; do not expose this directory
- **Passwords** are bcrypt-hashed (cost 10) — never stored in plaintext
- **JWT** sessions expire after 8 hours — set a strong `JWT_SECRET` in `.env`
- **Rate limiting** — 100 requests/minute/IP on all non-health endpoints
- `sessions/`, `logs/`, and `data/` are all git-ignored — never commit these directories
- In production: firewall port `3001` (admin UI) to internal network; port `3000` only if direct API access is needed

---

## License

MIT
