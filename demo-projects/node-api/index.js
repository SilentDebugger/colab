const http = require('http');

const PORT = process.env.PORT || 4001;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  if (req.url === '/api/hello') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hello from Demo API!' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Demo Node API</h1><p>Try <a href="/health">/health</a> or <a href="/api/hello">/api/hello</a></p>');
});

server.listen(PORT, () => {
  console.log(`🚀 Demo API running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});

// Periodic log output
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Heartbeat — ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB RSS`);
}, 5000);
