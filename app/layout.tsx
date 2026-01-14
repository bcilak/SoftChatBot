import type { ReactNode } from 'react';

export const metadata = {
    title: 'SoftChatBot ChatKit Embed Demo',
    description: 'Demo for embedding OpenAI ChatKit as a chat bubble',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body style={{ margin: 0, fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>
                {children}
            </body>
        </html>
    );
}
