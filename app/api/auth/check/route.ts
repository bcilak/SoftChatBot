import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body: any, init?: ResponseInit) {
    return Response.json(body, init);
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('admin_session');
        const tokenHash = cookieStore.get('admin_token_hash');

        if (!session?.value || !tokenHash?.value) {
            return json({ authenticated: false }, { status: 401 });
        }

        const adminKey = process.env.ADMIN_API_KEY;
        if (!adminKey) {
            return json({ authenticated: false }, { status: 401 });
        }

        // Verify token hash
        const expectedHash = hashToken(session.value, adminKey);
        if (expectedHash !== tokenHash.value) {
            return json({ authenticated: false }, { status: 401 });
        }

        return json({ authenticated: true });

    } catch {
        return json({ authenticated: false }, { status: 401 });
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
