import {
    assertAdminAuth,
    getSitesConfigPath,
    isAdminEnabled,
    loadSitesConfig,
    saveSitesConfig,
    validateWorkflowId,
    normalizeWorkflowKey,
    type SitesConfigFile,
} from '../../../../server/sitesConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body: any, init?: ResponseInit) {
    return Response.json(body, init);
}

function safeError(code: string) {
    return json({ error: code }, { status: 400 });
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
        const cfg = loadSitesConfig() || ({ version: 1, sites: [] } satisfies SitesConfigFile);
        return json({ config: cfg, path: getSitesConfigPath() }, { status: 200, headers: corsHeaders() });
    } catch (err: any) {
        if (!isAdminEnabled()) return json({ error: 'ADMIN_DISABLED' }, { status: 404, headers: corsHeaders() });
        if (err?.code === 'UNAUTHORIZED') return json({ error: 'UNAUTHORIZED' }, { status: 401, headers: corsHeaders() });
        return json({ error: 'ADMIN_FAILED' }, { status: 500, headers: corsHeaders() });
    }
}

export async function POST(request: Request) {
    try {
        assertAdminAuth(request);
        const body = await request.json();

        const origin = typeof body?.origin === 'string' ? body.origin.trim() : '';
        if (!origin.startsWith('http://') && !origin.startsWith('https://')) return safeError('INVALID_ORIGIN');

        const workflowsIn = Array.isArray(body?.workflows) ? body.workflows : [];
        const workflows = workflowsIn
            .map((w: any) => ({
                key: normalizeWorkflowKey(String(w?.key || '')),
                id: String(w?.id || ''),
                label: typeof w?.label === 'string' ? w.label : undefined,
            }))
            .filter((w: any) => w.key.length > 0 && validateWorkflowId(w.id));

        if (workflows.length === 0) return safeError('NO_VALID_WORKFLOWS');

        const defaultKey =
            typeof body?.default_workflow_key === 'string'
                ? normalizeWorkflowKey(body.default_workflow_key)
                : workflows[0].key;

        const cfg = loadSitesConfig() || ({ version: 1, sites: [] } satisfies SitesConfigFile);

        const existingIndex = cfg.sites.findIndex((s) => s.origin === origin);
        const site = { origin, workflows, default_workflow_key: defaultKey };

        if (existingIndex >= 0) cfg.sites[existingIndex] = site;
        else cfg.sites.push(site);

        saveSitesConfig(cfg);
        return json({ ok: true }, { status: 200, headers: corsHeaders() });
    } catch (err: any) {
        if (!isAdminEnabled()) return json({ error: 'ADMIN_DISABLED' }, { status: 404, headers: corsHeaders() });
        if (err?.code === 'UNAUTHORIZED') return json({ error: 'UNAUTHORIZED' }, { status: 401, headers: corsHeaders() });
        return json({ error: 'ADMIN_FAILED' }, { status: 500, headers: corsHeaders() });
    }
}
