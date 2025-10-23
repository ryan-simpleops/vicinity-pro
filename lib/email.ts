export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

function createMimeMessage(options: EmailOptions, from: string): string {
  const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const boundary = '----=_Part_' + Math.random().toString(36).substring(7);

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${options.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    '',
    options.html,
    '',
    `--${boundary}--`
  ].join('\r\n');

  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getServiceAccountToken(): Promise<string> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const impersonateEmail = process.env.GMAIL_IMPERSONATE_EMAIL;

  if (!serviceAccountKey || !impersonateEmail) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY and GMAIL_IMPERSONATE_EMAIL must be set');
  }

  const credentials = JSON.parse(serviceAccountKey);
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claim = {
    iss: credentials.client_email,
    sub: impersonateEmail,
    scope: 'https://www.googleapis.com/auth/gmail.send',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Create JWT manually
  const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const claimBase64 = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const signatureInput = `${headerBase64}.${claimBase64}`;

  // Sign with private key
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(credentials.private_key, 'base64url');

  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json();
    throw new Error(`Failed to get access token: ${JSON.stringify(error)}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

export async function sendEmail(options: EmailOptions) {
  const from = options.from || process.env.SMTP_SENDER || '';

  const accessToken = await getServiceAccountToken();
  const raw = createMimeMessage(options, from);

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to send email');
    }

    const result = await response.json();
    console.log('Email sent: %s', result.id);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
