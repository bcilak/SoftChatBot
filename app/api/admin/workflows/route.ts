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

async function assertCookieAuth(): Promise<void> {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) {
        const err = new Error('Admin disabled') as Error & { code: string };
        err.code = 'ADMIN_DISABLED';
        throw err;
    }

    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');
    const tokenHash = cookieStore.get('admin_token_hash');

    if (!session?.value || !tokenHash?.value) {
        const err = new Error('Unauthorized') as Error & { code: string };
        err.code = 'UNAUTHORIZED';
        throw err;
    }

    const expectedHash = hashToken(session.value, adminKey);
    if (expectedHash !== tokenHash.value) {
        const err = new Error('Unauthorized') as Error & { code: string };
        err.code = 'UNAUTHORIZED';
        throw err;
    }
}

type WorkflowWithSite = DbWorkflow & {
    site_origin: string;
};

export async function GET() {
    try {
        await assertCookieAuth();

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
        });

    } catch (err: any) {
        if (err?.code === 'ADMIN_DISABLED') {
            return json(
                { error: 'ADMIN_DISABLED', message: 'Admin API devre dışı.' },
                { status: 404 }
            );
        }
        if (err?.code === 'UNAUTHORIZED') {
            return json(
                { error: 'UNAUTHORIZED', message: 'Oturum geçersiz.' },
                { status: 401 }
            );
        }
        console.error('[admin/workflows] Error:', err);
        return json(
            { error: 'FETCH_FAILED', message: 'Workflow listesi alınamadı.' },
            { status: 500 }
        );
    }
}

function maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '****';
    return apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4);
}
