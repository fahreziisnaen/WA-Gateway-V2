# Phillip WA Gateway

WhatsApp Gateway middleware for **Phillip Securities Hong Kong** — lets external systems (monitoring tools, alert platforms, automation scripts) send WhatsApp messages via a simple HTTP API.

**Stack:** Node.js · Baileys · Express · BullMQ · Redis · SQLite · React · Vite · TailwindCSS · nginx · Docker

---

## Architecture

```
External System (SolarWinds, PRTG, etc.)
      │  POST /send-message
      │  Authorization: Bearer <api-key>
      ▼
  wa-backend :3000 (Express)
      │  Auth middleware  → validates API key / IP whitelist
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
  SQLite Database (gateway.db)
      │  users, API keys, instances, group aliases,
      │  allowed IPs, message logs
      └  persisted via Docker named volume (db_data)

  ─────────────────────────────────────────────────────
  wa-frontend :3001 (React + nginx)
      │  nginx proxies /api/*      → wa-backend:3000
      │  nginx proxies /socket.io/ → wa-backend:3000 (WebSocket)
      └  real-time status via Socket.IO events

  ─────────────────────────────────────────────────────
  wa-sqliteweb :3002 (coleifer/sqlite-web)
      └  read/write browser UI for gateway.db (password-protected)
```

---

## Quick Start (Docker)

### 1. Generate a secure `.env`

```bash
cp .env.example .env
```

Open `.env` and fill in the two required secrets:

```bash
# JWT_SECRET — signs all admin session tokens
openssl rand -hex 32

# SQLITE_WEB_PASSWORD — login password for the database browser on :3002
openssl rand -base64 16
```

Your `.env` when complete:

```env
JWT_SECRET=a3f8d2e1c7b94f0e2d6a1b8c4e3f5a7d9e2b1c4f6a8d3e5f7b2c9a1d4f6e8b3
SQLITE_WEB_PASSWORD=Xk9mP2rLqN4wT7vA
```

### 2. Launch all services

```bash
docker compose up -d --build
```

### 3. Verify startup

```bash
docker compose logs -f wa-backend
```

| Service | URL | Notes |
|---------|-----|-------|
| Admin dashboard | http://localhost:3001 | Login: `admin` / `admin123` |
| Backend API | http://localhost:3000 | External API endpoint |
| Database browser | http://localhost:3002 | Login with `SQLITE_WEB_PASSWORD` |

> **Change the default admin password immediately** — Settings → Users → change password.

---

## First-Time Setup

1. Log in at **http://localhost:3001** (`admin` / `admin123`)
2. Go to **Settings → Users** → change your password
3. Go to **Instances** → click **Add Instance**
4. Scan the QR code with WhatsApp (Settings → Linked Devices → Link a Device)
5. Once connected, go to **Groups** to find Group IDs or set Aliases
6. Go to **Settings → API Keys** → generate a key for each external system

---

## API Reference

Authentication for `POST /send-message` is checked in this order:

1. **IP Whitelist** — no API key needed if the sender IP is whitelisted (supports single IP, CIDR, wildcard). Managed in Settings → Allowed IPs.
2. **HTTP Header** — `Authorization: Bearer <key>`
3. **HTTP Header** — `x-api-key: <key>`
4. **Body Field** — `apikey=<key>` (for `application/x-www-form-urlencoded` or systems that cannot set custom headers)

> API keys are generated from Settings → API Keys in the admin dashboard.

> **Rate limiting:** 100 requests per minute per IP.

---

### `POST /send-message`

Accepts both `application/json` and `application/x-www-form-urlencoded`.

**Request (JSON):**
```json
{
  "message": "🚨 *Device Down Alert*\n\n*Device:* Core-Switch-01\n*IP:* 10.10.10.1\n*Status:* DOWN",
  "id": "alert-it",
  "from": "wa1"
}
```

**Request (Form URL-Encoded):**
```
id=alert-it&message=Hello%20World&apikey=YOUR_API_KEY
```

| Field | Required | Description |
|-------|----------|-------------|
| `message` | Yes | Text to send. Supports WhatsApp markdown: `*bold*`, `_italic_`, `~strikethrough~` |
| `id` | Yes | Recipient — see accepted formats below |
| `from` | No | Instance ID to send from (e.g. `wa1`). Defaults to the first connected instance. |
| `apikey` | No | API key as body field, alternative to headers. |

**Accepted `id` formats:**

| Format | Type | Example |
|--------|------|---------|
| Plain number | Personal | `628123456789` |
| `@c.us` suffix | Personal (legacy) | `628123456789@c.us` |
| `@s.whatsapp.net` suffix | Personal | `628123456789@s.whatsapp.net` |
| `@g.us` suffix | Group | `120363025600132873@g.us` |
| Group Alias | Group | `alert-it` (configured in Settings → Group Aliases) |

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
| 400 | Missing/invalid `message` or `id` |
| 401 | Missing or invalid API key |
| 404 | Instance specified in `from` not found |
| 422 | Personal number not registered on WhatsApp |
| 503 | No connected WhatsApp instance available |

---

### `GET /health`

Health check — no authentication required.

```json
{ "ok": true, "ts": 1712345678901 }
```

---

### `GET /status`

Returns status of all instances. No authentication required.

```json
{
  "status": "connected",
  "phone": "628111000111",
  "name": "Your Name",
  "instances": [
    { "id": "wa1", "name": "WhatsApp 1", "status": "connected", "phone": "628111000111", "waName": "Your Name" }
  ]
}
```

---

## Example cURL

```bash
# Send to a group via alias
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wag_your_api_key_here" \
  -d '{"message": "🚨 *Alert:* Router01 is DOWN", "id": "alert-it"}'

# Send to a personal number via a specific instance
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "x-api-key: wag_your_api_key_here" \
  -d '{"message": "Test message", "id": "628123456789", "from": "wa1"}'

# Send via form-urlencoded (no custom headers — for legacy systems)
curl -X POST http://localhost:3000/send-message \
  -d "apikey=wag_your_api_key_here&id=alert-it&message=Hello"
```

---

## Integration Setup

Any system that can make an HTTP POST request can send messages through this gateway.

**Endpoint:** `http://<server-ip>:3000/send-message`

**Required:**
- `Content-Type: application/json`
- API key via `Authorization: Bearer <key>`, `x-api-key: <key>`, or body field `apikey`

**Minimal request body:**
```json
{
  "message": "Your message here",
  "id": "120363025600132873@g.us"
}
```

**With instance and alias:**
```json
{
  "message": "🚨 *Alert:* Device down",
  "id": "alert-it",
  "from": "wa1"
}
```

> Copy Group IDs from the **Groups** page. Short aliases can be set via **Settings → Group Aliases** and used directly as the `id` value.

**Tips per system:**
- **SolarWinds / PRTG** — use the HTTP POST / HTTP Push action, set Auth Token header, use the system's variable placeholders inside `message`
- **Grafana** — use the Webhook notification channel, map alert fields into the JSON body
- **Scripts / cron jobs** — use `curl` or any HTTP client library; form-urlencoded is also accepted if JSON is inconvenient

---

## Admin Dashboard

| Page | Description |
|------|-------------|
| Dashboard | Overview of all instances — status, phone, WhatsApp name |
| Instances | Add/remove instances, scan QR (real-time), reset session |
| Groups | Browse group IDs per instance, set/edit Aliases |
| Logs | Message history — status, source IP, instance, recipient, message preview |
| Docs | API documentation and request examples |
| Settings | API Keys, Group Aliases, Allowed IPs (whitelist), Users |

---

## Multi-Instance

Multiple WhatsApp accounts run simultaneously. Each instance has its own Baileys session in `sessions/<id>/`.

- Add instances from the **Instances** page — provide an ID (e.g. `wa2`) and a display name
- Instance IDs are always lowercased automatically
- Use `"from": "<instance-id>"` in the API body to route through a specific account
- If `from` is omitted, the first connected instance is used

---

## Data Storage

All application data is stored in a **SQLite database** (`gateway.db`) via Docker named volume `db_data`.

| Table | Data |
|-------|------|
| `users` | Admin dashboard accounts (bcrypt-hashed passwords) |
| `api_keys` | Named API keys for external integrations |
| `instances` | Registered WhatsApp instance metadata |
| `group_aliases` | Short name → Group JID mappings |
| `allowed_ips` | IP whitelist (single IP, CIDR, wildcard) |
| `message_logs` | All send attempts with status (90-day retention) |

WhatsApp session credentials are stored separately in `sessions/<id>/` and persisted via bind mount.

**Database browser** is available at **http://localhost:3002** (login with `SQLITE_WEB_PASSWORD`).

---

## Queue Behaviour

| Mode | Condition | Behaviour |
|------|-----------|-----------|
| BullMQ + Redis | Redis reachable | Jobs queued, 3 attempts, exponential backoff (2s → 4s → 8s) |
| Direct (fallback) | Redis unavailable | Send immediately in-process, same 3-attempt retry |

---

## Security Notes

- Set strong values for `JWT_SECRET` and `SQLITE_WEB_PASSWORD` before deploying — use `openssl rand`
- Change the default `admin` / `admin123` credentials immediately after first login
- Passwords are bcrypt-hashed (cost 10), never stored in plaintext
- JWT sessions expire after 8 hours
- Rate limiting: 100 requests/minute/IP on all non-health endpoints
- `sessions/` is git-ignored — never commit session files
- In production: firewall ports `3001` (admin UI) and `3002` (database browser) to internal network only

---

## License

MIT

---

## Credits

Built by **Fahrezi Isnaen Fauzan** with the assistance of [Claude](https://claude.ai) by Anthropic.
