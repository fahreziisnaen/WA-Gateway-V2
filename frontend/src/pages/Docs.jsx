import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Copy, ChevronDown, ChevronUp, Hash, Shield } from 'lucide-react';

export default function Docs({ instances = [] }) {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-gray-500" />
          Documentation
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Learn how to integrate and send messages via the API</p>
      </div>

      <div className="space-y-6">
        <ApiDocs instances={instances} />
        
        {/* Core Concepts */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Core Concepts</h2>
          </div>
          <div className="p-5 space-y-6">
            
            {/* Group Aliases Concept */}
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Hash className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">What is a Group Alias?</h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  Aliases allow clients to send messages to WhatsApp groups using a short name
                  (e.g. <code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">alert-it</code>) without
                  needing to know the long Group ID (<code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">120363...@g.us</code>).
                  Use the alias name as the <code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">id</code> field value when POSTing to{' '}
                  <code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">/send-message</code>.
                </p>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 text-xs text-emerald-700">
                  <p>
                    Instead of using long Group JIDs, you can create <strong>short aliases</strong> for each group.
                    The server will automatically resolve the alias to the corresponding Group JID.
                    Manage aliases in <Link to="/settings" className="underline font-medium">Settings → Group Aliases</Link> or
                    directly from the <Link to="/groups" className="underline font-medium">Groups</Link> page (Set Alias button).
                  </p>
                </div>
              </div>
            </div>

            {/* IP Whitelist Concept */}
            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">IP Whitelist — Access Without API Key</h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  Requests from whitelisted IPs are automatically allowed <strong>without an API key</strong>.
                  Ideal for systems like <strong>PRTG</strong> that cannot send custom headers.
                  Supported formats: single IP (<code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">192.168.1.100</code>),
                  CIDR (<code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">10.0.0.0/24</code>),
                  or wildcard (<code className="bg-gray-100 text-gray-800 px-1 rounded font-mono">172.16.*.*</code>).
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                  <p>
                    <strong>Caution:</strong> Whitelisted IPs can send messages without authentication.
                    Only add trusted internal server IPs (such as PRTG, SolarWinds, Zabbix).
                    Manage IPs in <Link to="/settings" className="underline font-medium">Settings → Allowed IPs</Link>.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function ApiDocs({ instances = [] }) {
  const [format, setFormat] = useState('json');
  const [expanded, setExpanded] = useState(true);
  const exampleInstance = instances.find((i) => i.status === 'connected')?.id ?? 'wa1';

  // ── Example: send to personal number ──
  const jsonExample = `{
  "id": "628123456789",
  "message": "Hello World!",
  "from": "${exampleInstance}"
}`;

  const formExample = `id=628123456789&message=Hello%20World!&from=${exampleInstance}`;

  // ── Example: send to group via alias ──
  const jsonAliasExample = `{
  "id": "alert-it",
  "message": "Server down!",
  "from": "${exampleInstance}"
}`;

  const formAliasExample = `id=alert-it&message=Server%20down!&from=${exampleInstance}`;

  const curlJson = `curl -X POST https://yourdomain.com/send-message \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '${jsonExample}'`;

  const curlForm = `curl -X POST https://yourdomain.com/send-message \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -H "x-api-key: YOUR_API_KEY" \\
  --data-urlencode "id=628123456789" \\
  --data-urlencode "message=Hello World!" \\
  --data-urlencode "from=${exampleInstance}"`;

  const jsJson = `fetch('/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY',
  },
  body: JSON.stringify({
    id: '628123456789',
    message: 'Hello World!',
    from: '${exampleInstance}',
  }),
});`;

  const jsForm = `fetch('/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'x-api-key': 'YOUR_API_KEY',
  },
  body: new URLSearchParams({
    id: '628123456789',
    message: 'Hello World!',
    from: '${exampleInstance}',
  }),
});`;

  const phpJson = `$ch = curl_init('https://yourdomain.com/send-message');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Content-Type: application/json',
  'x-api-key: YOUR_API_KEY',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
  'id'      => '628123456789',
  'message' => 'Hello World!',
  'from'    => '${exampleInstance}',
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);`;

  const phpForm = `$ch = curl_init('https://yourdomain.com/send-message');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'x-api-key: YOUR_API_KEY',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
  'id'      => '628123456789',
  'message' => 'Hello World!',
  'from'    => '${exampleInstance}',
]));
// Content-Type: application/x-www-form-urlencoded
// is automatically sent by cURL when POSTFIELDS is a string
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">API Reference</span>
          <span className="text-[10px] font-mono bg-wa-green/10 text-wa-teal px-2 py-0.5 rounded-full">
            POST /send-message
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {/* Auth info */}
          <div className="px-5 py-4 bg-amber-50 border-b border-amber-100">
            <p className="text-xs font-semibold text-amber-800 mb-2">Authentication</p>
            <p className="text-xs text-amber-700 mb-3">
              Use one of the following methods (checked in order):
            </p>
            <div className="space-y-2.5">
              {/* Method 1 - IP Whitelist */}
              <div className="bg-white/70 rounded-lg px-3 py-2 border border-amber-200/60">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">1</span>
                  <span className="text-xs font-semibold text-amber-900">IP Whitelist</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">no API key needed</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  If the sender IP is whitelisted, the request is allowed without an API key.
                  Ideal for <strong>PRTG</strong>, Zabbix, or systems that cannot set custom headers.
                </p>
              </div>
              {/* Methods 2-3 - Headers */}
              <div className="bg-white/70 rounded-lg px-3 py-2 border border-amber-200/60">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">2–3</span>
                  <span className="text-xs font-semibold text-amber-900">HTTP Header</span>
                </div>
                <div className="space-y-1">
                  <CodeLine label="Bearer" code="Authorization: Bearer YOUR_API_KEY" />
                  <CodeLine label="API Key" code="x-api-key: YOUR_API_KEY" />
                </div>
              </div>
              {/* Method 4 - Body field */}
              <div className="bg-white/70 rounded-lg px-3 py-2 border border-amber-200/60">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">4</span>
                  <span className="text-xs font-semibold text-amber-900">Body Field</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">form-urlencoded</span>
                </div>
                <p className="text-[11px] text-amber-700 mb-1">
                  Include the <code className="bg-amber-100 px-1 rounded font-mono">apikey</code> field in the request body:
                </p>
                <CodeLine label="Body" code="apikey=YOUR_API_KEY&id=628...&message=Hello" />
              </div>
              {/* Method 5 - Query param */}
              <div className="bg-white/70 rounded-lg px-3 py-2 border border-amber-200/60">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">5</span>
                  <span className="text-xs font-semibold text-amber-900">Query Parameter</span>
                </div>
                <CodeLine label="URL" code="POST /send-message?apikey=YOUR_API_KEY" />
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-3">
              Manage API keys in <Link to="/settings" className="underline font-medium">Settings → API Keys</Link>.
              Manage IP whitelist in <Link to="/settings" className="underline font-medium">Settings → Allowed IPs</Link>.
            </p>
          </div>

          {/* Fields */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-3">Body Fields</p>
            <div className="space-y-2">
              <FieldRow name="id" type="string" required desc='WhatsApp number (e.g. "628123456789"), Group JID (e.g. "120363...@g.us"), or Group Alias (e.g. "alert-it").' />
              <FieldRow name="message" type="string" required desc="The message content to send." />
              <FieldRow name="from" type="string" required={false} desc='Instance ID to send from. If omitted, the first connected instance is used.' />
              <FieldRow name="apikey" type="string" required={false} desc='API key (alternative if headers cannot be set). Can also be sent via query param ?apikey=xxx. Not required if the IP is whitelisted.' />
            </div>
          </div>

          {/* Format tabs */}
          <div className="px-5 pt-4 pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-700">Request Examples</p>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => setFormat('json')}
                  className={`px-3 py-1.5 transition-colors ${
                    format === 'json'
                      ? 'bg-wa-teal text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  JSON
                </button>
                <button
                  onClick={() => setFormat('form')}
                  className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${
                    format === 'form'
                      ? 'bg-wa-teal text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Form URL Encoded
                </button>
              </div>
            </div>

            {/* Format explanation */}
            {format === 'json' ? (
              <div className="mb-3 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                Set the <code className="bg-blue-100 px-1 rounded font-mono">Content-Type: application/json</code> header and send the body as a JSON object.
              </div>
            ) : (
              <div className="mb-3 text-xs text-gray-500 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                Set the <code className="bg-purple-100 px-1 rounded font-mono">Content-Type: application/x-www-form-urlencoded</code> header and send the body as URL-encoded key=value pairs (same as a standard HTML form).
              </div>
            )}

            {/* Raw body preview — personal number */}
            <p className="text-[11px] text-gray-400 font-medium mb-1">Raw Body — Send to Number</p>
            <CodeBlock code={format === 'json' ? jsonExample : formExample} />

            {/* Raw body preview — group alias */}
            <p className="text-[11px] text-emerald-500 font-medium mt-3 mb-1">Raw Body — Send to Group (via Alias)</p>
            <CodeBlock code={format === 'json' ? jsonAliasExample : formAliasExample} />

            {/* cURL */}
            <p className="text-[11px] text-gray-400 font-medium mt-3 mb-1">cURL</p>
            <CodeBlock code={format === 'json' ? curlJson : curlForm} />

            {/* JavaScript */}
            <p className="text-[11px] text-gray-400 font-medium mt-3 mb-1">JavaScript (fetch)</p>
            <CodeBlock code={format === 'json' ? jsJson : jsForm} />

            {/* PHP */}
            <p className="text-[11px] text-gray-400 font-medium mt-3 mb-1">PHP (cURL)</p>
            <CodeBlock code={format === 'json' ? phpJson : phpForm} />

            {/* PRTG example */}
            {format === 'form' && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
                <p className="text-[11px] font-semibold text-orange-800 mb-1">💡 Example for PRTG HTTP Push / Notification</p>
                <p className="text-[11px] text-orange-700 mb-2 leading-relaxed">
                  PRTG cannot set custom headers. Use one of the following methods:
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-orange-600 font-medium mb-0.5">Option A: IP Whitelist (no API key)</p>
                    <CodeBlock code={`id=alert-it&message=[%sitename] %device %sensor %status`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-orange-600 font-medium mb-0.5">Option B: API key in body</p>
                    <CodeBlock code={`apikey=YOUR_API_KEY&id=alert-it&message=[%sitename] %device %sensor %status`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-orange-600 font-medium mb-0.5">Option C: API key in URL query</p>
                    <CodeBlock code={`URL: https://yourdomain.com/send-message?apikey=YOUR_API_KEY\nBody: id=alert-it&message=[%sitename] %device %sensor %status`} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Response */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-700 mb-3">Response Examples</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-green-600 font-medium mb-1">202 Accepted</p>
                <CodeBlock code={`{\n  "success": true,\n  "jobId": "42",\n  "message": "Message queued",\n  "destination": "6281234@s.whatsapp.net",\n  "type": "personal",\n  "sentFrom": "${exampleInstance}"\n}`} />
              </div>
              <div>
                <p className="text-[11px] text-red-500 font-medium mb-1">4xx Error</p>
                <CodeBlock code={`{\n  "error": "\`id\` is required and must\\nbe a non-empty string"\n}`} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-lg px-3 py-2.5 text-[11px] overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
        title="Copy"
      >
        {copied
          ? <Check className="w-3 h-3 text-green-400" />
          : <Copy className="w-3 h-3 text-gray-300" />}
      </button>
    </div>
  );
}

function CodeLine({ label, code }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-amber-600 font-medium w-20 shrink-0">{label}</span>
      <code className="text-[11px] font-mono bg-white border border-amber-200 px-2 py-0.5 rounded text-amber-900">
        {code}
      </code>
    </div>
  );
}

function FieldRow({ name, type, required, desc }) {
  return (
    <div className="flex gap-3 text-xs">
      <div className="shrink-0 w-20">
        <code className="font-mono font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
          {name}
        </code>
      </div>
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-gray-400 shrink-0">{type}</span>
        {required
          ? <span className="text-red-500 text-[10px] font-semibold shrink-0">required</span>
          : <span className="text-gray-400 text-[10px] shrink-0">optional</span>}
        <span className="text-gray-500 leading-relaxed">{desc}</span>
      </div>
    </div>
  );
}
