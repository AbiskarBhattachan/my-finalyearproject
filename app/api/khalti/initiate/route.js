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

export async function POST(request) {
  try {
    const secretKey = getSecretKey();
    if (!secretKey) {
      return NextResponse.json(
        {
          error:
            'Missing Khalti secret key. Set KHALTI_SECRET_KEY (or KHALTI_TEST_SECRET_KEY / KHALTI_LIVE_SECRET_KEY).',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      amount,
      purchase_order_id,
      purchase_order_name,
      customer_info,
      website_url,
      return_url,
    } = body || {};

    if (!amount || !purchase_order_id || !purchase_order_name || !website_url || !return_url) {
      return NextResponse.json(
        { error: 'Missing required payment initiation fields.' },
        { status: 400 }
      );
    }

    const khaltiResponse = await fetch(`${getBaseUrl()}/api/v2/epayment/initiate/`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        purchase_order_id,
        purchase_order_name,
        customer_info,
        website_url,
        return_url,
      }),
      cache: 'no-store',
    });

    const result = await khaltiResponse.json();

    if (!khaltiResponse.ok) {
      return NextResponse.json(
        {
          error: result?.detail || 'Failed to initiate Khalti payment.',
          khalti: result,
        },
        { status: khaltiResponse.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Unexpected server error while initiating Khalti payment.' },
      { status: 500 }
    );
  }
}
