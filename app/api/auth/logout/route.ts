import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body: any, init?: ResponseInit) {
    return Response.json(body, init);
}

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Clear session cookies
        cookieStore.delete('admin_session');
        cookieStore.delete('admin_token_hash');

        return json({ success: true, message: 'Çıkış yapıldı.' });

    } catch {
        return json({ success: true });
    }
}
