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
        await assertCookieAuth();

        const { id } = await params;
        const workflowId = parseInt(id, 10);

        if (isNaN(workflowId)) {
            return json(
                { error: 'INVALID_ID', message: 'Geçersiz workflow ID.' },
                { status: 400 }
            );
        }

        const workflow = getWorkflowById(workflowId);
        if (!workflow) {
            return json(
                { error: 'NOT_FOUND', message: 'Workflow bulunamadı.' },
                { status: 404 }
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
                    { status: 400 }
                );
            }
            if (apiKey) {
                updateData.apiKey = apiKey;
            }
        }

        if (Object.keys(updateData).length === 0) {
            return json(
                { error: 'NO_CHANGES', message: 'Güncellenecek alan belirtilmedi.' },
                { status: 400 }
            );
        }

        updateWorkflow(workflowId, updateData);

        return json({
            success: true,
            message: 'Workflow güncellendi.',
        });

    } catch (err: any) {
        if (err?.code === 'UNAUTHORIZED') {
            return json(
                { error: 'UNAUTHORIZED', message: 'Oturum geçersiz.' },
                { status: 401 }
            );
        }
        console.error('[admin/workflows/[id]] PUT Error:', err);
        return json(
            { error: 'UPDATE_FAILED', message: 'Güncelleme başarısız.' },
            { status: 500 }
        );
    }
}

// DELETE workflow
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await assertCookieAuth();

        const { id } = await params;
        const workflowId = parseInt(id, 10);

        if (isNaN(workflowId)) {
            return json(
                { error: 'INVALID_ID', message: 'Geçersiz workflow ID.' },
                { status: 400 }
            );
        }

        const workflow = getWorkflowById(workflowId);
        if (!workflow) {
            return json(
                { error: 'NOT_FOUND', message: 'Workflow bulunamadı.' },
                { status: 404 }
            );
        }

        deleteWorkflow(workflowId);

        return json({
            success: true,
            message: 'Workflow silindi.',
        });

    } catch (err: any) {
        if (err?.code === 'UNAUTHORIZED') {
            return json(
                { error: 'UNAUTHORIZED', message: 'Oturum geçersiz.' },
                { status: 401 }
            );
        }
        console.error('[admin/workflows/[id]] DELETE Error:', err);
        return json(
            { error: 'DELETE_FAILED', message: 'Silme işlemi başarısız.' },
            { status: 500 }
        );
    }
}
