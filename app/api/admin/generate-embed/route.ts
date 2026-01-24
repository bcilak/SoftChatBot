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

type GenerateEmbedRequest = {
    workflow_id: string;
    openai_api_key: string;
    origin: string;
    title?: string;
    color?: string;
    position?: 'right' | 'left';
    label?: string;
    greeting?: string;
    theme?: 'light' | 'dark';
    accent?: string;
    radius?: 'pill' | 'round' | 'none';
    density?: 'compact' | 'normal' | 'relaxed';
    chatkit_config?: string;
};

export async function POST(request: Request) {
    try {
        await assertBearerAuth(request);

        const body: GenerateEmbedRequest = await request.json();

        // Validate workflow_id
        const workflowId = String(body?.workflow_id || '').trim();
        if (!validateWorkflowId(workflowId)) {
            return json(
                { error: 'INVALID_WORKFLOW_ID', message: 'Workflow ID geçersiz. wf_ ile başlamalı ve en az 10 karakter olmalı.' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // Validate OpenAI API key
        const openaiApiKey = String(body?.openai_api_key || '').trim();
        if (!openaiApiKey.startsWith('sk-') || openaiApiKey.length < 20) {
            return json(
                { error: 'INVALID_API_KEY', message: 'OpenAI API Key geçersiz. sk- ile başlamalı.' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // Validate origin
        const origin = String(body?.origin || '').trim().replace(/\/$/, ''); // Remove trailing slash
        if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
            return json(
                { error: 'INVALID_ORIGIN', message: 'Origin http:// veya https:// ile başlamalı.' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // Parse options
        const title = String(body?.title || 'Asistan').trim();
        const color = String(body?.color || '#111111').trim();
        const position = body?.position === 'left' ? 'left' : 'right';
        const label = String(body?.label || title).trim();
        const greeting = String(body?.greeting || '').trim();
        const theme = body?.theme === 'dark' ? 'dark' : 'light';
        const accent = String(body?.accent || '#2D8CFF').trim();
        const radius = ['pill', 'round', 'none'].includes(body?.radius || '') ? body.radius! : 'pill';
        const density = ['compact', 'normal', 'relaxed'].includes(body?.density || '') ? body.density! : 'normal';

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
            // Generate updated embed code
            const embedCode = generateEmbedCode({
                apiBase: getApiBase(request),
                workflowKey: existingWorkflow.key,
                title,
                color,
                position,
                greeting,
                theme,
                accent,
                radius,
                density,
            });

            // Update existing workflow
            updateWorkflow(existingWorkflow.id, {
                label: label,
                apiKey: openaiApiKey,
                scriptCode: embedCode,
                chatkitConfig: body.chatkit_config || undefined,
            });

            return json({
                embed_code: embedCode,
                workflow_key: existingWorkflow.key,
                origin: origin,
                message: 'Workflow güncellendi (API Key değiştirildi).',
            }, { headers: corsHeaders() });
        }

        // Create new workflow
        const newWorkflow = createWorkflow({
            siteId: site.id,
            key: workflowKey,
            workflowId: workflowId,
            label: label,
            apiKey: openaiApiKey,
            chatkitConfig: body.chatkit_config || undefined,
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
            greeting,
            theme,
            accent,
            radius,
            density,
        });

        // Save the script code to workflow
        updateWorkflow(newWorkflow.id, {
            scriptCode: embedCode,
        });

        return json({
            embed_code: embedCode,
            workflow_key: newWorkflow.key,
            origin: origin,
        }, { headers: corsHeaders() });

    } catch (err: any) {
        if (err?.code === 'ADMIN_DISABLED') {
            return json(
                { error: 'ADMIN_DISABLED', message: 'Admin API devre dışı. ADMIN_API_KEY env değişkenini ayarlayın.' },
                { status: 404, headers: corsHeaders() }
            );
        }
        if (err?.code === 'UNAUTHORIZED') {
            return json(
                { error: 'UNAUTHORIZED', message: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
                { status: 401, headers: corsHeaders() }
            );
        }
        console.error('[generate-embed] Error:', err);
        return json(
            { error: 'GENERATE_FAILED', message: 'Embed kodu oluşturulamadı.' },
            { status: 500, headers: corsHeaders() }
        );
    }
}

function getApiBase(request: Request): string {
    // Check for PUBLIC_URL environment variable first (for production)
    const publicUrl = process.env.PUBLIC_URL || process.env.NEXT_PUBLIC_URL;
    if (publicUrl) {
        return publicUrl.replace(/\/$/, ''); // Remove trailing slash
    }

    // Fallback to request URL (for development)
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
}

function generateEmbedCode(opts: {
    apiBase: string;
    workflowKey: string;
    title: string;
    color: string;
    position: string;
    greeting: string;
    theme: string;
    accent: string;
    radius: string;
    density: string;
}): string {
    const attrs = [
        `src="${opts.apiBase}/embed.js"`,
        `data-api-base="${opts.apiBase}"`,
        `data-workflow="${opts.workflowKey}"`,
        `data-title="${escapeHtml(opts.title)}"`,
        `data-position="${opts.position}"`,
        `data-primary="${opts.color}"`,
        `data-theme="${opts.theme}"`,
        `data-accent="${opts.accent}"`,
        `data-radius="${opts.radius}"`,
        `data-density="${opts.density}"`,
    ];

    if (opts.greeting) {
        attrs.push(`data-greeting="${escapeHtml(opts.greeting)}"`);
    }

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
