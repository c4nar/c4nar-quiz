/* ============================================================================
 * STAR QUIZ — Opsiyonel Node.js + Socket.IO sunucusu (LAN / özel sunucu)
 * ----------------------------------------------------------------------------
 * Oyunun tamamı tek bir index.html içinde, halka açık WebRTC aktarıcıları
 * (public signaling relays) üzerinden çalışır. Bu dosya yalnızca kendi
 * sunucunuzda (LAN partisi, VPS, Render/Railway/Fly.io) özel bir aktarıcı
 * çalıştırmak isteyenler için hazırlanmıştır.
 *
 * Aynı protokolü konuşur (protokol: "starquiz", sürüm: 1):
 *   { t:"hello", room, peer, name }      → istemci odaya bağlanmak ister
 *   { t:"peers" | "peer-join" | "peer-leave" | "sig" | "data" | "ping" }
 *
 * Kullanım:
 *   npm install && npm start
 *   STARQUIZ_PORT=8080 STARQUIZ_ORIGIN="*" npm start
 * ========================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

let Server = null;
try {
  // socket.io opsiyoneldir: kurulu değilse sunucu HTTP moduna düşer.
  Server = require('socket.io').Server;
} catch (err) {
  console.warn('[star-quiz] socket.io bulunamadı. "npm install" çalıştırın. HTTP moduna geçiliyor.');
}

const PORT = Number(process.env.STARQUIZ_PORT || process.env.PORT || 3000);
const ORIGIN = process.env.STARQUIZ_ORIGIN || '*';
const PROTOCOL = 'starquiz';
const PROTOCOL_VERSION = 1;
const ROOM_CODE_RE = /^[A-Za-z0-9]{5}$/;
const MAX_ROOM_SIZE = 24;
const MAX_PAYLOAD = 200 * 1024; // 200 KB

/** room code -> Map(peerId -> socket) */
const rooms = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

/* ------------------------------ yardımcılar ------------------------------ */
function cleanPeerId(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return /^[A-Za-z0-9_-]{6,40}$/.test(s) ? s : null;
}
function cleanRoom(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return ROOM_CODE_RE.test(s) ? s : null;
}
function roomCount(code) {
  const r = rooms.get(code);
  return r ? r.size : 0;
}
function peersOf(code, except) {
  const r = rooms.get(code);
  if (!r) return [];
  const out = [];
  r.forEach((_sock, id) => { if (id !== except) out.push(id); });
  return out;
}
function safeJson(obj) {
  try {
    const s = JSON.stringify(obj);
    return s.length > MAX_PAYLOAD ? null : s;
  } catch (_e) { return null; }
}

/* -------------------------------- HTTP ---------------------------------- */
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/health' || url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, protocol: PROTOCOL, version: PROTOCOL_VERSION }));
    return;
  }
  // Statik dosyalar (index.html dahil) — GitHub Pages alternatifi.
  const rel = url === '/' ? '/index.html' : url;
  const filePath = path.join(__dirname, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      // Bilinmeyen yol → index.html (tek sayfa uygulaması)
      fs.readFile(path.join(__dirname, 'index.html'), (e2, b2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(b2);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Access-Control-Allow-Origin': ORIGIN,
      'Cache-Control': 'no-cache'
    });
    res.end(buf);
  });
});

/* ------------------------------ Socket.IO -------------------------------- */
if (Server) {
  const io = new Server(server, {
    cors: { origin: ORIGIN, methods: ['GET', 'POST'] },
    maxHttpBufferSize: MAX_PAYLOAD,
    pingInterval: 20000,
    pingTimeout: 25000
  });

  io.on('connection', (socket) => {
    let room = null;
    let peer = null;

    socket.on('hello', (payload, ack) => {
      const msg = payload && typeof payload === 'object' ? payload : {};
      const code = cleanRoom(msg.room);
      const pid = cleanPeerId(msg.peer);
      const version = Number(msg.version || PROTOCOL_VERSION);
      if (!code || !pid) {
        if (typeof ack === 'function') ack({ ok: false, error: 'INVALID_HELLO' });
        return;
      }
      if (version !== PROTOCOL_VERSION) {
        if (typeof ack === 'function') ack({ ok: false, error: 'VERSION_MISMATCH' });
        return;
      }
      if (!rooms.has(code)) rooms.set(code, new Map());
      const roomMap = rooms.get(code);

      // Aynı peer kimliği ile yeniden bağlanma: eski soketi düşür.
      const existing = roomMap.get(pid);
      if (existing && existing.id !== socket.id) {
        try { existing.emit('kicked', { reason: 'REPLACED' }); existing.disconnect(true); } catch (_e) {}
      }
      if (!roomMap.has(pid) && roomMap.size >= MAX_ROOM_SIZE) {
        if (typeof ack === 'function') ack({ ok: false, error: 'ROOM_FULL' });
        return;
      }
      room = code;
      peer = pid;
      socket.join(code);
      roomMap.set(pid, socket);

      const others = peersOf(code, pid);
      if (typeof ack === 'function') ack({ ok: true, room: code, peer: pid, peers: others });
      others.forEach((id) => io.to(id).emit('peer-join', { peer: pid }));
    });

    socket.on('sig', (payload) => {
      if (!room || !peer) return;
      const msg = payload && typeof payload === 'object' ? payload : {};
      const to = cleanPeerId(msg.to);
      if (!to || !msg.data) return;
      const target = rooms.get(room) && rooms.get(room).get(to);
      if (!target) return;
      target.emit('sig', { from: peer, data: msg.data });
    });

    socket.on('data', (payload) => {
      if (!room || !peer) return;
      const msg = payload && typeof payload === 'object' ? payload : {};
      const to = cleanPeerId(msg.to);
      const body = safeJson(msg.body);
      if (!body) return;
      const broadcast = msg.to === '*';
      if (broadcast) {
        peersOf(room, peer).forEach((id) => io.to(id).emit('data', { from: peer, body: msg.body }));
        return;
      }
      if (!to) return;
      const target = rooms.get(room) && rooms.get(room).get(to);
      if (target) target.emit('data', { from: peer, body: msg.body });
    });

    socket.on('ping-relay', () => { socket.emit('pong-relay', { t: Date.now() }); });

    socket.on('disconnect', () => {
      if (!room || !peer) return;
      const roomMap = rooms.get(room);
      if (!roomMap) return;
      if (roomMap.get(peer) && roomMap.get(peer).id === socket.id) {
        roomMap.delete(peer);
        peersOf(room, peer).forEach((id) => io.to(id).emit('peer-leave', { peer }));
      }
      if (roomMap.size === 0) rooms.delete(room); // oda temizliği
    });
  });

  // Boş odaları periyodik temizle
  setInterval(() => {
    rooms.forEach((map, code) => { if (map.size === 0) rooms.delete(code); });
  }, 60000).unref?.();
}

server.listen(PORT, () => {
  console.log(`[star-quiz] Sunucu hazır → http://localhost:${PORT}`);
  console.log(`[star-quiz] Aktarıcı modu: ${Server ? 'socket.io' : 'yalnızca HTTP'}`);
  console.log('[star-quiz] Oyunu index.html içindeki "Sunucu" ayarına bu adresi yazarak kullanabilirsiniz.');
});
