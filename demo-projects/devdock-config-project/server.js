const http = require('http');

const PORT = 4002;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'config-demo' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Config Demo App — powered by .devdock.yml');
});

server.listen(PORT, () => {
  console.log(`🚀 Config Demo running at http://localhost:${PORT}`);
});

setInterval(() => {
  console.log(`[${new Date().toISOString()}] Config Demo heartbeat`);
}, 4000);
