const url = 'https://mcp-promps.onrender.com/health';
const intervalMin = parseFloat(process.env.KEEPALIVE_INTERVAL_MIN || '3');
const intervalMs = Math.max(60000, Math.floor(intervalMin * 60 * 1000));

async function ping() {
  try {
    const res = await fetch(url, { method: 'GET' });
    console.log(new Date().toISOString(), 'KEEPALIVE', url, 'status=', res.status);
  } catch (err) {
    console.error(new Date().toISOString(), 'KEEPALIVE ERROR', err && err.message ? err.message : err);
  }
}

ping();

setInterval(ping, intervalMs);

process.stdin.resume();
