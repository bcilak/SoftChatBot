import { isOriginAllowed, getAllAllowedOrigins } from '../../../../server/cors';
import { validateWorkflowId } from '../../../../server/sitesConfig';
import {
    getSiteByOrigin,
    getWorkflowsBySiteId,
} from '../../../../server/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body: any, init?: ResponseInit) {
    return Response.json(body, init);
}

function corsHeaders(origin: string | null) {
    const allowed = getAllAllowedOrigins(process.env.ALLOW_ORIGINS);
    const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

export async function GET(request: Request) {
    const origin = request.headers.get('origin');
    const allowed = getAllAllowedOrigins(process.env.ALLOW_ORIGINS);

    if (origin && !isOriginAllowed(origin, allowed)) {
        return json({ error: 'CORS_NOT_ALLOWED' }, { status: 403, headers: corsHeaders(origin) });
    }

    // If no origin, check for env fallback
    if (!origin) {
        const envId = process.env.OPENAI_WORKFLOW_ID;
        if (!envId || !validateWorkflowId(envId)) {
            return json({ workflows: [], default_workflow_key: null }, { status: 200, headers: corsHeaders(origin) });
        }
        return json(
            {
                workflows: [{ key: 'default', label: 'Default', id: envId }],
                default_workflow_key: 'default',
            },
            { status: 200, headers: corsHeaders(origin) }
        );
    }

    // Get site from database
    const site = getSiteByOrigin(origin);

    if (!site) {
        // Fallback to env workflow if no site config
        const envId = process.env.OPENAI_WORKFLOW_ID;
        if (!envId || !validateWorkflowId(envId)) {
            return json({ workflows: [], default_workflow_key: null }, { status: 200, headers: corsHeaders(origin) });
        }
        return json(
            {
                workflows: [{ key: 'default', label: 'Default', id: envId }],
                default_workflow_key: 'default',
            },
            { status: 200, headers: corsHeaders(origin) }
        );
    }

    // Get workflows from database
    const dbWorkflows = getWorkflowsBySiteId(site.id);

    const workflows = dbWorkflows
        .filter((w) => w && typeof w.key === 'string' && validateWorkflowId(w.workflow_id))
        .map((w) => ({ key: w.key, label: w.label || w.key, id: w.workflow_id }));

    return json(
        {
            workflows,
            default_workflow_key: site.default_workflow_key || (workflows[0]?.key ?? null),
        },
        { status: 200, headers: corsHeaders(origin) }
    );
}
