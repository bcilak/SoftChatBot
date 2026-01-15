import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body: any, init?: ResponseInit) {
    return Response.json(body, init);
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
    };
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders(),
    });
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('admin_session');
        const tokenHash = cookieStore.get('admin_token_hash');

        if (!session?.value || !tokenHash?.value) {
            return json({ authenticated: false }, { status: 401, headers: corsHeaders() });
        }

        const adminKey = process.env.ADMIN_API_KEY;
        if (!adminKey) {
            return json({ authenticated: false }, { status: 401, headers: corsHeaders() });
        }

        // Verify token hash
        const expectedHash = hashToken(session.value, adminKey);
        if (expectedHash !== tokenHash.value) {
            return json({ authenticated: false }, { status: 401, headers: corsHeaders() });
        }

        return json({ authenticated: true }, { headers: corsHeaders() });

    } catch {
        return json({ authenticated: false }, { status: 401, headers: corsHeaders() });
    }
}

function hashToken(token: string, secret: string): string {
    const combined = token + secret;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}
