import { NextResponse } from 'next/server';

const getBaseUrl = () => (process.env.KHALTI_BASE_URL || 'https://dev.khalti.com').replace(/\/$/, '');
const getSecretKey = () => {
  const raw =
    process.env.KHALTI_SECRET_KEY ||
    process.env.KHALTI_TEST_SECRET_KEY ||
    process.env.KHALTI_LIVE_SECRET_KEY ||
    '';
  return raw.replace(/^Key\s+/i, '').trim();
};

export async function GET() {
  try {
    const secretKey = getSecretKey();
    if (!secretKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Missing Khalti secret key. Set KHALTI_SECRET_KEY (or KHALTI_TEST_SECRET_KEY / KHALTI_LIVE_SECRET_KEY).',
        },
        { status: 500 }
      );
    }

    // Use lookup with dummy pidx to validate token format/key validity.
    // Expected with valid token + dummy pidx: 400 "Not found."
    const response = await fetch(`${getBaseUrl()}/api/v2/epayment/lookup/`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx: 'health-check-pidx' }),
      cache: 'no-store',
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 401) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid token (Khalti key rejected).',
          khalti: result,
        },
        { status: 401 }
      );
    }

    if (response.status === 400) {
      return NextResponse.json(
        {
          ok: true,
          message: 'Khalti key is accepted (token valid). Dummy pidx was not found, as expected.',
          khalti: result,
        },
        { status: 200 }
      );
    }

    if (response.ok) {
      return NextResponse.json(
        {
          ok: true,
          message: 'Khalti API reachable and key accepted.',
          khalti: result,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Khalti API returned an unexpected response.',
        khalti: result,
      },
      { status: response.status || 500 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Unexpected server error while checking Khalti key.',
      },
      { status: 500 }
    );
  }
}
