'use client';

import Link from 'next/link';

export default function HomePage() {
    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.logo}>🤖</div>
                <h1 style={styles.title}>SoftChatBot</h1>
                <p style={styles.subtitle}>
                    Web sitenize kolayca entegre edilebilen AI destekli chatbot servisi
                </p>

                <div style={styles.features}>
                    <div style={styles.feature}>
                        <span style={styles.featureIcon}>⚡</span>
                        <span>Hızlı Kurulum</span>
                    </div>
                    <div style={styles.feature}>
                        <span style={styles.featureIcon}>🔒</span>
                        <span>Güvenli</span>
                    </div>
                    <div style={styles.feature}>
                        <span style={styles.featureIcon}>🎨</span>
                        <span>Özelleştirilebilir</span>
                    </div>
                </div>

                <Link href="/login" style={styles.button}>
                    Yönetim Paneli
                </Link>

                <p style={styles.footer}>
                    Powered by Altıkod Digital Solutions
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
    content: {
        textAlign: 'center',
        maxWidth: '500px',
    },
    logo: {
        fontSize: '80px',
        marginBottom: '16px',
    },
    title: {
        color: '#fff',
        fontSize: '42px',
        fontWeight: 700,
        margin: '0 0 12px 0',
        letterSpacing: '-1px',
    },
    subtitle: {
        color: '#888',
        fontSize: '18px',
        lineHeight: 1.6,
        margin: '0 0 40px 0',
    },
    features: {
        display: 'flex',
        justifyContent: 'center',
        gap: '32px',
        marginBottom: '40px',
        flexWrap: 'wrap',
    },
    feature: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#aaa',
        fontSize: '15px',
    },
    featureIcon: {
        fontSize: '20px',
    },
    button: {
        display: 'inline-block',
        backgroundColor: '#3b82f6',
        color: '#fff',
        textDecoration: 'none',
        borderRadius: '12px',
        padding: '16px 40px',
        fontSize: '16px',
        fontWeight: 600,
        transition: 'background-color 0.2s',
    },
    footer: {
        color: '#444',
        fontSize: '13px',
        marginTop: '48px',
    },
};
