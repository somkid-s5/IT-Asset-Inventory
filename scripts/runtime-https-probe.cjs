const https = require('https');
const fs = require('fs');
const net = require('net');

const [mode, targetUrl, username, password] = process.argv.slice(2);
const caPath = process.env.RUNTIME_HTTPS_CA;
const allowInsecureTls = process.env.RUNTIME_HTTPS_INSECURE === 'true';

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function isIpAddress(hostname) {
  return net.isIP(hostname.replace(/^\[|\]$/g, '')) !== 0;
}

function requestOptions(url, method, headers) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const tlsOptions = caPath
    ? { ca: fs.readFileSync(caPath), rejectUnauthorized: true }
    : { rejectUnauthorized: !allowInsecureTls };

  return {
    method,
    hostname,
    port: Number(url.port || 443),
    path: url.pathname + url.search,
    // Caddy's default_sni supplies the configured APP_HOST when an IP URL
    // omits SNI. Node rejects an IP address in the TLS servername option.
    ...(isIpAddress(hostname) ? {} : { servername: hostname }),
    ...tlsOptions,
    ...(headers ? { headers } : {}),
  };
}

(async () => {
  if (!mode || !targetUrl) {
    throw new Error('Usage: node runtime-https-probe.cjs <health|login> <url> [username] [password]');
  }

  if (mode === 'health') {
    const url = new URL(targetUrl);
    const result = await request({
      ...requestOptions(url, 'GET'),
    });
    console.log(String(result.statusCode));
    process.exit(result.statusCode === 200 ? 0 : 1);
  }

  if (mode === 'login') {
    if (!username || !password) throw new Error('username and password are required for login mode');
    const url = new URL(targetUrl);
    const payload = JSON.stringify({ username, password });
    const result = await request({
      ...requestOptions(url, 'POST', {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      }),
    }, payload);
    const cookies = result.headers['set-cookie'] || [];
    const authCookie = cookies.find((value) => value.startsWith('access_token='));
    const secure = Boolean(authCookie && /;\s*Secure(?:;|$)/i.test(authCookie));
    const httpOnly = Boolean(authCookie && /;\s*HttpOnly(?:;|$)/i.test(authCookie));
    const sameSiteLax = Boolean(authCookie && /;\s*SameSite=Lax(?:;|$)/i.test(authCookie));
    console.log(JSON.stringify({ statusCode: result.statusCode, hasAuthCookie: Boolean(authCookie), secure, httpOnly, sameSiteLax }));
    process.exit(result.statusCode === 200 && authCookie && secure && httpOnly && sameSiteLax ? 0 : 1);
  }

  throw new Error(`Unknown mode: ${mode}`);
})().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
});
