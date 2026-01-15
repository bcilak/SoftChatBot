import { cookies } from 'next/headers';
import {
    getWorkflowById,
    updateWorkflow,
    deleteWorkflow,
} from '../../../../../server/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body: any, init?: ResponseInit) {
    return Response.json(body, init);
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

type UpdateWorkflowRequest = {
    label?: string;
    api_key?: string;
};

// UPDATE workflow
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await assertBearerAuth(request);

        const { id } = await params;
        const workflowId = parseInt(id, 10);

        if (isNaN(workflowId)) {
            return json(
                { error: 'INVALID_ID', message: 'Geçersiz workflow ID.' },
                { status: 400, headers: corsHeaders() }
            );
        }

        const workflow = getWorkflowById(workflowId);
        if (!workflow) {
            return json(
                { error: 'NOT_FOUND', message: 'Workflow bulunamadı.' },
                { status: 404, headers: corsHeaders() }
            );
        }

        const body: UpdateWorkflowRequest = await request.json();

        const updateData: { label?: string; apiKey?: string } = {};

        if (body.label !== undefined) {
            updateData.label = String(body.label).trim();
        }

        if (body.api_key !== undefined) {
            const apiKey = String(body.api_key).trim();
            if (apiKey && (!apiKey.startsWith('sk-') || apiKey.length < 20)) {
                return json(
                    { error: 'INVALID_API_KEY', message: 'OpenAI API Key geçersiz.' },
                    { status: 400, headers: corsHeaders() }
                );
            }
            if (apiKey) {
                updateData.apiKey = apiKey;
            }
        }

        if (Object.keys(updateData).length === 0) {
            return json(
                { error: 'NO_CHANGES', message: 'Güncellenecek alan belirtilmedi.' },
                { status: 400, headers: corsHeaders() }
            );
        }

        updateWorkflow(workflowId, updateData);

        return json({
            success: true,
            message: 'Workflow güncellendi.',
        }, { headers: corsHeaders() });

    } catch (err: any) {
        if (err?.code === 'UNAUTHORIZED') {
            return json(
                { error: 'UNAUTHORIZED', message: 'Oturum geçersiz.' },
                { status: 401, headers: corsHeaders() }
            );
        }
        console.error('[admin/workflows/[id]] PUT Error:', err);
        return json(
            { error: 'UPDATE_FAILED', message: 'Güncelleme başarısız.' },
            { status: 500, headers: corsHeaders() }
        );
    }
}

// DELETE workflow
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await assertBearerAuth(request);

        const { id } = await params;
        const workflowId = parseInt(id, 10);

        if (isNaN(workflowId)) {
            return json(
                { error: 'INVALID_ID', message: 'Geçersiz workflow ID.' },
                { status: 400, headers: corsHeaders() }
            );
        }

        const workflow = getWorkflowById(workflowId);
        if (!workflow) {
            return json(
                { error: 'NOT_FOUND', message: 'Workflow bulunamadı.' },
                { status: 404, headers: corsHeaders() }
            );
        }

        deleteWorkflow(workflowId);

        return json({
            success: true,
            message: 'Workflow silindi.',
        }, { headers: corsHeaders() });

    } catch (err: any) {
        if (err?.code === 'UNAUTHORIZED') {
            return json(
                { error: 'UNAUTHORIZED', message: 'Oturum geçersiz.' },
                { status: 401, headers: corsHeaders() }
            );
        }
        console.error('[admin/workflows/[id]] DELETE Error:', err);
        return json(
            { error: 'DELETE_FAILED', message: 'Silme işlemi başarısız.' },
            { status: 500, headers: corsHeaders() }
        );
    }
}
