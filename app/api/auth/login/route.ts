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
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders(),
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const password = String(body?.password || '').trim();

        const adminKey = process.env.ADMIN_API_KEY;

        if (!adminKey || adminKey.length < 10) {
            return json(
                { error: 'ADMIN_DISABLED', message: 'Admin girişi devre dışı.' },
                { status: 403, headers: corsHeaders() }
            );
        }

        if (password !== adminKey) {
            return json(
                { error: 'INVALID_PASSWORD', message: 'Şifre hatalı.' },
                { status: 401, headers: corsHeaders() }
            );
        }

        // Return the admin key as token (simple approach for same-domain admin panel)
        return json({ 
            success: true, 
            message: 'Giriş başarılı.',
            token: adminKey 
        }, { headers: corsHeaders() });

    } catch (err: any) {
        console.error('[login] Error:', err);
        return json(
            { error: 'LOGIN_FAILED', message: 'Giriş yapılamadı.' },
            { status: 500, headers: corsHeaders() }
        );
    }
}
