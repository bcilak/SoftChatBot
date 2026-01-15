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
    };
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders(),
    });
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        const adminKey = process.env.ADMIN_API_KEY;
        
        if (!adminKey || !token || token !== adminKey) {
            return json({ authenticated: false }, { status: 401, headers: corsHeaders() });
        }

        return json({ authenticated: true }, { headers: corsHeaders() });

    } catch {
        return json({ authenticated: false }, { status: 401, headers: corsHeaders() });
    }
}
