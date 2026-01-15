import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body: any, init?: ResponseInit) {
    return Response.json(body, init);
}

// Simple token generation (in production, use a proper JWT library)
function generateToken(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const password = String(body?.password || '').trim();

        const adminKey = process.env.ADMIN_API_KEY;

        if (!adminKey || adminKey.length < 10) {
            return json(
                { error: 'ADMIN_DISABLED', message: 'Admin girişi devre dışı.' },
                { status: 403 }
            );
        }

        if (password !== adminKey) {
            return json(
                { error: 'INVALID_PASSWORD', message: 'Şifre hatalı.' },
                { status: 401 }
            );
        }

        // Generate session token
        const token = generateToken();

        // Set HTTP-only cookie (expires in 24 hours)
        const cookieStore = await cookies();
        cookieStore.set('admin_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
        });

        // Also store the token hash for validation (simple approach)
        // In production, store this in database with expiry
        cookieStore.set('admin_token_hash', hashToken(token, adminKey), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        return json({ success: true, message: 'Giriş başarılı.' });

    } catch (err: any) {
        console.error('[login] Error:', err);
        return json(
            { error: 'LOGIN_FAILED', message: 'Giriş yapılamadı.' },
            { status: 500 }
        );
    }
}

// Simple hash function for token validation
function hashToken(token: string, secret: string): string {
    // Simple hash using XOR and base64 (not cryptographically secure, but sufficient for this use case)
    const combined = token + secret;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}
