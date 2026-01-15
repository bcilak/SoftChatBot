'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Giriş başarısız');
            }

            // Save token to localStorage
            if (data.token) {
                localStorage.setItem('admin_token', data.token);
            }

            // Redirect to admin panel
            router.push('/admin');
        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.logo}>🤖</div>
                <h1 style={styles.title}>SoftChatBot</h1>
                <p style={styles.subtitle}>Yönetim Paneli</p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.field}>
                        <label style={styles.label}>Admin Şifresi</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            style={styles.input}
                            required
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div style={styles.error}>
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} style={styles.button}>
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>

                <p style={styles.footer}>
                    Workflow yönetimi ve embed kodu oluşturma
                </p>
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    card: {
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#141414',
        borderRadius: '20px',
        padding: '48px 40px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        textAlign: 'center',
        border: '1px solid #222',
    },
    logo: {
        fontSize: '64px',
        marginBottom: '16px',
    },
    title: {
        color: '#fff',
        fontSize: '28px',
        fontWeight: 700,
        marginBottom: '8px',
        marginTop: 0,
    },
    subtitle: {
        color: '#666',
        fontSize: '16px',
        marginBottom: '32px',
        marginTop: 0,
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        textAlign: 'left',
    },
    label: {
        color: '#888',
        fontSize: '14px',
        fontWeight: 500,
    },
    input: {
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '14px 18px',
        color: '#fff',
        fontSize: '16px',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    error: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '10px',
        padding: '12px 16px',
        color: '#ef4444',
        fontSize: '14px',
    },
    button: {
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        padding: '16px 24px',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background-color 0.2s, transform 0.1s',
        marginTop: '8px',
    },
    footer: {
        color: '#444',
        fontSize: '13px',
        marginTop: '32px',
        marginBottom: 0,
    },
};
