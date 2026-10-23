import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config, logConfigStatus } from './config.js';
import { ClientSession } from './session.js';

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'hidani-interview-assistant-server',
        timestamp: new Date().toISOString(),
        env: config.nodeEnv,
        features: {
          deepgramStt: Boolean(config.deepgramApiKey),
          openaiLlm: Boolean(config.openaiApiKey),
        },
      })
    );
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocketServer({ server });
const activeSessions = new Map<string, ClientSession>();

wss.on('connection', (ws: WebSocket, req) => {
  const ip = req.socket.remoteAddress;
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[WebSocket] Client connected: ${sessionId} (IP: ${ip})`);

  const session = new ClientSession(ws, sessionId);
  activeSessions.set(sessionId, session);

  ws.on('message', (data: Buffer | string, isBinary: boolean) => {
    session.handleClientMessage(data, isBinary);
  });

  ws.on('close', (code, reason) => {
    console.log(`[WebSocket] Client disconnected: ${sessionId} (code: ${code}, reason: ${reason.toString()})`);
    session.destroy();
    activeSessions.delete(sessionId);
  });

  ws.on('error', (err) => {
    console.error(`[WebSocket] Error on connection ${sessionId}:`, err);
  });
});

server.listen(config.port, () => {
  console.log(`
==================================================
  HIDANI TECH POC - REAL-TIME INTERVIEW ASSISTANT
==================================================`);
  logConfigStatus();
  console.log(`[Server] WebSocket Server listening at ws://localhost:${config.port}`);
  console.log(`[Server] Health Check available at http://localhost:${config.port}/health\n`);
});

// Graceful shutdown handling
const shutdown = () => {
  console.log('\n[Server] Shutting down gracefully...');
  wss.close(() => {
    console.log('[Server] WebSocket connections closed.');
    server.close(() => {
      console.log('[Server] HTTP server stopped.');
      process.exit(0);
    });
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
