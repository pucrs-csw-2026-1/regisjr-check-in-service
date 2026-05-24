const jwt = require('jsonwebtoken');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const eventId = process.env.EVENT_ID || 'evt_demo_01';
const userId = process.env.USER_ID || 'usr_demo_01';
const staffId = process.env.STAFF_ID || 'staff_demo_01';
const authSecret = process.env.AUTH_JWT_SECRET;
const qrSecret = process.env.QR_JWT_SECRET;

function mustHave(value, name) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function signAccessToken(sub, scopes) {
  return jwt.sign(
    {
      sub,
      scopes,
    },
    mustHave(authSecret, 'AUTH_JWT_SECRET'),
    {
      algorithm: 'HS256',
      expiresIn: '30m',
    },
  );
}

async function request(method, path, token, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    body: parsed,
  };
}

async function main() {
  mustHave(qrSecret, 'QR_JWT_SECRET');

  const participantToken = signAccessToken(userId, ['user']);
  const staffToken = signAccessToken(staffId, ['staff']);

  console.log(`Base URL: ${baseUrl}`);
  console.log(`Event ID: ${eventId}`);
  console.log(`User ID: ${userId}`);
  console.log(`Staff ID: ${staffId}`);

  const qrResponse = await request(
    'GET',
    `/events/${encodeURIComponent(eventId)}/guests/${encodeURIComponent(userId)}/qr-code`,
    participantToken,
  );

  if (!qrResponse.ok) {
    throw new Error(`QR code generation failed (${qrResponse.status}): ${JSON.stringify(qrResponse.body)}`);
  }

  const qrData = qrResponse.body;
  console.log('QR payload:', qrData.qrPayload);
  console.log('Expires at:', qrData.expiresAt);

  const scanResponse = await request('POST', '/check-ins/scan', staffToken, {
    token: qrData.token,
    eventId,
    scannedBy: staffId,
  });

  if (!scanResponse.ok) {
    throw new Error(`Scan failed (${scanResponse.status}): ${JSON.stringify(scanResponse.body)}`);
  }

  console.log('Scan response:', scanResponse.body);

  const lookupResponse = await request(
    'GET',
    `/events/${encodeURIComponent(eventId)}/check-ins/${encodeURIComponent(userId)}`,
    participantToken,
  );

  if (!lookupResponse.ok) {
    throw new Error(`Lookup failed (${lookupResponse.status}): ${JSON.stringify(lookupResponse.body)}`);
  }

  console.log('Stored check-in:', lookupResponse.body);
  console.log('Manual test completed successfully.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});