import { cookies } from 'next/headers';
import {
    getAllSites,
    getWorkflowsBySiteId,
    DbSite,
    DbWorkflow,
} from '../../../../server/database';

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

async function assertBearerAuth(request: Request): Promise<void> {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) {
        const err = new Error('Admin disabled') as Error & { code: string };
        err.code = 'ADMIN_DISABLED';
        throw err;
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== adminKey) {
        const err = new Error('Unauthorized') as Error & { code: string };
        err.code = 'UNAUTHORIZED';
        throw err;
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders(),
    });
}
}

type WorkflowWithSite = DbWorkflow & {
    site_origin: string;
};

export async function GET(request: Request) {
    try {
        await assertBearerAuth(request);

        const sites = getAllSites();
        const allWorkflows: WorkflowWithSite[] = [];

        for (const site of sites) {
            const workflows = getWorkflowsBySiteId(site.id);
            for (const wf of workflows) {
                allWorkflows.push({
                    ...wf,
                    site_origin: site.origin,
                    // Mask API key for security
                    api_key: maskApiKey(wf.api_key),
                });
            }
        }

        return json({
            workflows: allWorkflows,
        }, { headers: corsHeaders() });

    } catch (err: any) {
        if (err?.code === 'ADMIN_DISABLED') {
            return json(
                { error: 'ADMIN_DISABLED', message: 'Admin API devre dışı.' },
                { status: 404, headers: corsHeaders() }
            );
        }
        if (err?.code === 'UNAUTHORIZED') {
            return json(
                { error: 'UNAUTHORIZED', message: 'Oturum geçersiz.' },
                { status: 401, headers: corsHeaders() }
            );
        }
        console.error('[admin/workflows] Error:', err);
        return json(
            { error: 'FETCH_FAILED', message: 'Workflow listesi alınamadı.' },
            { status: 500, headers: corsHeaders() }
        );
    }
}

function maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '****';
    return apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4);
}
