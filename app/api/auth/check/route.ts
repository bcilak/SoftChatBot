import { assertAdminAuth, isAdminEnabled } from '../../../../server/sitesConfig';

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
        assertAdminAuth(request);
        return json({ authenticated: true }, { status: 200, headers: corsHeaders() });
    } catch (err: any) {
        if (!isAdminEnabled()) {
            return json({ authenticated: false, error: 'ADMIN_DISABLED' }, { status: 404, headers: corsHeaders() });
        }
        if (err?.code === 'UNAUTHORIZED') {
            return json({ authenticated: false, error: 'UNAUTHORIZED' }, { status: 401, headers: corsHeaders() });
        }
        return json({ authenticated: false, error: 'AUTH_FAILED' }, { status: 500, headers: corsHeaders() });
    }
}
