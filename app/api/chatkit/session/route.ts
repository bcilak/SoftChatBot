import {
    createChatKitSession,
    defaultChatKitConfigurationFromEnv,
} from '../../../../server/chatkit';
import { isOriginAllowed, parseAllowedOrigins } from '../../../../server/cors';
import { rateLimitOrThrow } from '../../../../server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body: any, init?: ResponseInit) {
    return Response.json(body, init);
}

function getRequestIp(req: Request): string {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    return req.headers.get('x-real-ip') || 'unknown';
}

function corsHeaders(origin: string | null) {
    const allowed = parseAllowedOrigins(process.env.ALLOW_ORIGINS);
    const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
    };

    if (origin && isOriginAllowed(origin, allowed)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }

    return headers;
}

export async function OPTIONS(request: Request) {
    const origin = request.headers.get('origin');
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
    const requestId = crypto.randomUUID();
    const origin = request.headers.get('origin');
    const allowed = parseAllowedOrigins(process.env.ALLOW_ORIGINS);

    if (origin && !isOriginAllowed(origin, allowed)) {
        return json(
            { error: 'CORS_NOT_ALLOWED' },
            { status: 403, headers: corsHeaders(origin) }
        );
    }

    const ip = getRequestIp(request);
    try {
        const rl = rateLimitOrThrow({ key: ip, limit: 60, windowMs: 60_000 });

        const apiKey = process.env.OPENAI_API_KEY;
        const workflowId = process.env.OPENAI_WORKFLOW_ID;

        if (!apiKey || !workflowId) {
            console.error(`[${requestId}] Missing env vars: OPENAI_API_KEY/OPENAI_WORKFLOW_ID`);
            return json(
                { error: 'SERVER_MISCONFIGURED' },
                { status: 500, headers: { ...corsHeaders(origin), 'X-Request-Id': requestId } }
            );
        }

        let body: any = null;
        try {
            body = await request.json();
        } catch {
            body = null;
        }

        const user =
            (typeof body?.user === 'string' && body.user.trim()) ||
            `anon_${crypto.randomUUID()}`;

        const session = await createChatKitSession({
            apiKey,
            workflowId,
            user,
            chatkitConfiguration: defaultChatKitConfigurationFromEnv(),
        });

        return json(
            { client_secret: session.client_secret },
            {
                status: 200,
                headers: {
                    ...corsHeaders(origin),
                    'X-Request-Id': requestId,
                    'X-RateLimit-Remaining': String(rl.remaining),
                    'X-RateLimit-Reset': String(Math.floor(rl.resetAtMs / 1000)),
                },
            }
        );
    } catch (err: any) {
        if (err?.code === 'RATE_LIMITED') {
            return json(
                { error: 'RATE_LIMITED' },
                {
                    status: 429,
                    headers: {
                        ...corsHeaders(origin),
                        'X-Request-Id': requestId,
                        'Retry-After': String(
                            Math.max(1, Math.ceil(((err.resetAtMs as number) - Date.now()) / 1000))
                        ),
                    },
                }
            );
        }

        console.error(`[${requestId}] SESSION_CREATE_FAILED`, {
            ip,
            origin,
            message: err?.message,
            status: err?.status,
            responseBody: err?.responseBody,
        });

        return json(
            { error: 'SESSION_CREATE_FAILED' },
            { status: 502, headers: { ...corsHeaders(origin), 'X-Request-Id': requestId } }
        );
    }
}
