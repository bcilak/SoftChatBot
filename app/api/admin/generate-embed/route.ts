import { cookies } from 'next/headers';
import {
    validateWorkflowId,
    normalizeWorkflowKey,
} from '../../../../server/sitesConfig';
import {
    getSiteByOrigin,
    createSite,
    getWorkflowByWorkflowId,
    createWorkflow,
    updateWorkflow,
    updateSiteDefaultWorkflow,
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

type GenerateEmbedRequest = {
    workflow_id: string;
    openai_api_key: string;
    origin: string;
    title?: string;
    color?: string;
    position?: 'right' | 'left';
    label?: string;
};

export async function POST(request: Request) {
    try {
        await assertCookieAuth();

        const body: GenerateEmbedRequest = await request.json();

        // Validate workflow_id
        const workflowId = String(body?.workflow_id || '').trim();
        if (!validateWorkflowId(workflowId)) {
            return json(
                { error: 'INVALID_WORKFLOW_ID', message: 'Workflow ID geçersiz. wf_ ile başlamalı ve en az 10 karakter olmalı.' },
                { status: 400 }
            );
        }

        // Validate OpenAI API key
        const openaiApiKey = String(body?.openai_api_key || '').trim();
        if (!openaiApiKey.startsWith('sk-') || openaiApiKey.length < 20) {
            return json(
                { error: 'INVALID_API_KEY', message: 'OpenAI API Key geçersiz. sk- ile başlamalı.' },
                { status: 400 }
            );
        }

        // Validate origin
        const origin = String(body?.origin || '').trim().replace(/\/$/, ''); // Remove trailing slash
        if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
            return json(
                { error: 'INVALID_ORIGIN', message: 'Origin http:// veya https:// ile başlamalı.' },
                { status: 400 }
            );
        }

        // Parse options
        const title = String(body?.title || 'Asistan').trim();
        const color = String(body?.color || '#111111').trim();
        const position = body?.position === 'left' ? 'left' : 'right';
        const label = String(body?.label || title).trim();

        // Generate a unique workflow key from origin
        const originHost = new URL(origin).hostname.replace(/\./g, '_').replace(/[^a-z0-9_-]/gi, '');
        const workflowKey = normalizeWorkflowKey(`${originHost}_${Date.now().toString(36)}`);

        // Get or create site
        let site = getSiteByOrigin(origin);
        if (!site) {
            site = createSite(origin, workflowKey);
        }

        // Check if workflow already exists for this site
        const existingWorkflow = getWorkflowByWorkflowId(site.id, workflowId);

        if (existingWorkflow) {
            // Update existing workflow
            updateWorkflow(existingWorkflow.id, {
                label: label,
                apiKey: openaiApiKey,
            });

            const embedCode = generateEmbedCode({
                apiBase: getApiBase(request),
                workflowKey: existingWorkflow.key,
                title,
                color,
                position,
            });

            return json({
                embed_code: embedCode,
                workflow_key: existingWorkflow.key,
                origin: origin,
                message: 'Workflow güncellendi (API Key değiştirildi).',
            });
        }

        // Create new workflow
        const newWorkflow = createWorkflow({
            siteId: site.id,
            key: workflowKey,
            workflowId: workflowId,
            label: label,
            apiKey: openaiApiKey,
        });

        // Update site default workflow if this is the first workflow
        if (!site.default_workflow_key) {
            updateSiteDefaultWorkflow(site.id, workflowKey);
        }

        // Generate embed code
        const apiBase = getApiBase(request);
        const embedCode = generateEmbedCode({
            apiBase,
            workflowKey: newWorkflow.key,
            title,
            color,
            position,
        });

        return json({
            embed_code: embedCode,
            workflow_key: newWorkflow.key,
            origin: origin,
        });

    } catch (err: any) {
        if (err?.code === 'ADMIN_DISABLED') {
            return json(
                { error: 'ADMIN_DISABLED', message: 'Admin API devre dışı. ADMIN_API_KEY env değişkenini ayarlayın.' },
                { status: 404 }
            );
        }
        if (err?.code === 'UNAUTHORIZED') {
            return json(
                { error: 'UNAUTHORIZED', message: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
                { status: 401 }
            );
        }
        console.error('[generate-embed] Error:', err);
        return json(
            { error: 'GENERATE_FAILED', message: 'Embed kodu oluşturulamadı.' },
            { status: 500 }
        );
    }
}

function getApiBase(request: Request): string {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
}

function generateEmbedCode(opts: {
    apiBase: string;
    workflowKey: string;
    title: string;
    color: string;
    position: string;
}): string {
    const attrs = [
        `src="${opts.apiBase}/embed.js"`,
        `data-api-base="${opts.apiBase}"`,
        `data-workflow="${opts.workflowKey}"`,
        `data-title="${escapeHtml(opts.title)}"`,
        `data-position="${opts.position}"`,
        `data-primary="${opts.color}"`,
    ];

    return `<script ${attrs.join(' ')}></script>`;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
