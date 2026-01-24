'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type GeneratedEmbed = {
    embed_code: string;
    workflow_key: string;
    origin: string;
    message?: string;
};

type Workflow = {
    id: number;
    key: string;
    workflow_id: string;
    label: string | null;
    api_key: string;
    site_origin: string;
    created_at: string;
    script_code?: string | null;
    chatkit_config?: string | null;
};

type ChatKitConfig = {
    automatic_thread_titling?: { enabled: boolean };
    history?: { enabled: boolean; recent_threads?: number };
    file_upload?: { enabled: boolean; max_file_size?: number; max_files?: number };
    user_interface?: {
        theme?: 'light' | 'dark' | 'auto';
        primary_color?: string;
        show_branding?: boolean;
    };
    behavior?: {
        auto_focus?: boolean;
        placeholder_text?: string;
        welcome_message?: string;
        typing_indicator?: boolean;
        sound_enabled?: boolean;
    };
};

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
    const [formData, setFormData] = useState({
        workflow_id: '',
        openai_api_key: '',
        origin: '',
        title: 'Asistan',
        color: '#111111',
        position: 'right' as 'right' | 'left',
        label: '',
        greeting: '',
        theme: 'light' as 'light' | 'dark',
        accent: '#2D8CFF',
        radius: 'pill' as 'pill' | 'round' | 'none',
        density: 'normal' as 'compact' | 'normal' | 'relaxed',
        // ChatKit Configuration
        chatkit_auto_titling: false,
        chatkit_history_enabled: false,
        chatkit_history_recent_threads: 10,
        chatkit_file_upload: false,
        chatkit_file_max_size: 10485760,
        chatkit_file_max_count: 5,
        chatkit_ui_theme: 'light' as 'light' | 'dark' | 'auto',
        chatkit_ui_primary_color: '#2D8CFF',
        chatkit_ui_show_branding: true,
        chatkit_behavior_auto_focus: true,
        chatkit_behavior_placeholder: 'Type a message...',
        chatkit_behavior_typing_indicator: true,
        chatkit_behavior_sound: false,
    });

    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GeneratedEmbed | null>(null);
    const [copied, setCopied] = useState(false);
    const router = useRouter();

    // Workflow list state
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loadingWorkflows, setLoadingWorkflows] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ label: '', api_key: '' });
    const [listError, setListError] = useState<string | null>(null);
    const [listSuccess, setListSuccess] = useState<string | null>(null);

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('admin_token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const res = await fetch('/api/auth/check', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    localStorage.removeItem('admin_token');
                    router.push('/login');
                    return;
                }
                setCheckingAuth(false);
            } catch {
                localStorage.removeItem('admin_token');
                router.push('/login');
            }
        };
        checkAuth();
    }, [router]);

    // Load workflows when list tab is active
    useEffect(() => {
        if (activeTab === 'list' && !checkingAuth) {
            loadWorkflows();
        }
    }, [activeTab, checkingAuth]);

    const loadWorkflows = async () => {
        setLoadingWorkflows(true);
        setListError(null);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/workflows', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Yüklenemedi');
            setWorkflows(data.workflows || []);
        } catch (err: any) {
            setListError(err.message);
        } finally {
            setLoadingWorkflows(false);
        }
    };

    const handleLogout = async () => {
        localStorage.removeItem('admin_token');
        router.push('/login');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const token = localStorage.getItem('admin_token');

            // Build ChatKit configuration object
            const chatkitConfig: ChatKitConfig = {
                automatic_thread_titling: { enabled: formData.chatkit_auto_titling },
                history: {
                    enabled: formData.chatkit_history_enabled,
                    recent_threads: formData.chatkit_history_recent_threads
                },
                file_upload: {
                    enabled: formData.chatkit_file_upload,
                    max_file_size: formData.chatkit_file_max_size,
                    max_files: formData.chatkit_file_max_count
                },
                user_interface: {
                    theme: formData.chatkit_ui_theme,
                    primary_color: formData.chatkit_ui_primary_color,
                    show_branding: formData.chatkit_ui_show_branding
                },
                behavior: {
                    auto_focus: formData.chatkit_behavior_auto_focus,
                    placeholder_text: formData.chatkit_behavior_placeholder,
                    welcome_message: formData.greeting || undefined,
                    typing_indicator: formData.chatkit_behavior_typing_indicator,
                    sound_enabled: formData.chatkit_behavior_sound
                }
            };

            const res = await fetch('/api/admin/generate-embed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    ...formData,
                    chatkit_config: JSON.stringify(chatkitConfig)
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || data.error || 'Bir hata oluştu');

            setResult(data);
            setFormData({
                ...formData,
                workflow_id: '',
                openai_api_key: '',
                origin: '',
                label: '',
                greeting: '',
            });
        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (result?.embed_code) {
            navigator.clipboard.writeText(result.embed_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const startEdit = (wf: Workflow) => {
        setEditingId(wf.id);
        setEditForm({ label: wf.label || '', api_key: '' });
        setListError(null);
        setListSuccess(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ label: '', api_key: '' });
    };

    const saveEdit = async (id: number) => {
        setListError(null);
        setListSuccess(null);

        const updateData: any = {};
        if (editForm.label) updateData.label = editForm.label;
        if (editForm.api_key) updateData.api_key = editForm.api_key;

        if (Object.keys(updateData).length === 0) {
            setListError('En az bir alan doldurulmalı');
            return;
        }

        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`/api/admin/workflows/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(updateData),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Güncelleme başarısız');

            setListSuccess('Workflow güncellendi');
            setEditingId(null);
            loadWorkflows();
        } catch (err: any) {
            setListError(err.message);
        }
    };

    const deleteWorkflow = async (id: number, label: string) => {
        if (!confirm(`"${label}" workflow'unu silmek istediğinize emin misiniz?`)) return;

        setListError(null);
        setListSuccess(null);

        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`/api/admin/workflows/${id}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Silme başarısız');

            setListSuccess('Workflow silindi');
            loadWorkflows();
        } catch (err: any) {
            setListError(err.message);
        }
    };

    if (checkingAuth) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingCard}>
                    <div style={styles.spinner}></div>
                    <p style={styles.loadingText}>Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.headerTitle}>SoftChatBot</h1>
                <button onClick={handleLogout} style={styles.logoutButton}>
                    Cikis Yap
                </button>
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveTab('add')}
                    style={activeTab === 'add' ? styles.tabActive : styles.tab}
                >
                    Yeni Workflow
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    style={activeTab === 'list' ? styles.tabActive : styles.tab}
                >
                    Workflow Listesi
                </button>
            </div>

            {/* Add Workflow Tab */}
            {activeTab === 'add' && (
                <div style={styles.card}>
                    <h2 style={styles.title}>Workflow Ekle</h2>
                    <p style={styles.subtitle}>Yeni workflow ekleyin ve embed kodu alin</p>

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.field}>
                            <label style={styles.label}>Workflow ID *</label>
                            <input
                                type="text"
                                value={formData.workflow_id}
                                onChange={(e) => setFormData({ ...formData, workflow_id: e.target.value })}
                                placeholder="wf_xxxxxxxxxxxxxxxx"
                                style={styles.input}
                                required
                            />
                            <span style={styles.hint}>OpenAI'dan aldiginiz workflow ID (wf_ ile baslar)</span>
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>OpenAI API Key *</label>
                            <input
                                type="password"
                                value={formData.openai_api_key}
                                onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
                                placeholder="sk-proj-xxxxxxxxxxxxxxxx"
                                style={styles.input}
                                required
                            />
                            <span style={styles.hint}>Bu workflow icin kullanilacak OpenAI API Key</span>
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Site Origin *</label>
                            <input
                                type="url"
                                value={formData.origin}
                                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                                placeholder="https://example.com"
                                style={styles.input}
                                required
                            />
                            <span style={styles.hint}>Chat widget'in calisacagi site adresi</span>
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Baslik</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Asistan"
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Etiket (Opsiyonel)</label>
                            <input
                                type="text"
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                placeholder="Musteri Destek"
                                style={styles.input}
                            />
                            <span style={styles.hint}>Birden fazla workflow varsa secici menude gorunecek isim</span>
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Karsilama Mesaji (Opsiyonel)</label>
                            <input
                                type="text"
                                value={formData.greeting}
                                onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                                placeholder="Merhaba! Size nasil yardimci olabilirim?"
                                style={styles.input}
                            />
                            <span style={styles.hint}>Chat acildiginda gorunecek karsilama mesaji</span>
                        </div>

                        <div style={styles.row}>
                            <div style={{ ...styles.field, flex: 1 }}>
                                <label style={styles.label}>Renk</label>
                                <div style={styles.colorWrapper}>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        style={styles.colorInput}
                                    />
                                    <input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        style={{ ...styles.input, flex: 1 }}
                                    />
                                </div>
                            </div>

                            <div style={{ ...styles.field, flex: 1 }}>
                                <label style={styles.label}>Tema</label>
                                <select
                                    value={formData.theme}
                                    onChange={(e) => setFormData({ ...formData, theme: e.target.value as 'light' | 'dark' })}
                                    style={styles.select}
                                >
                                    <option value="light">Acik</option>
                                    <option value="dark">Koyu</option>
                                </select>
                            </div>
                        </div>

                        <div style={styles.row}>
                            <div style={{ ...styles.field, flex: 1 }}>
                                <label style={styles.label}>Pozisyon</label>
                                <select
                                    value={formData.position}
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value as 'right' | 'left' })}
                                    style={styles.select}
                                >
                                    <option value="right">Sag</option>
                                    <option value="left">Sol</option>
                                </select>
                            </div>
                            <div style={{ ...styles.field, flex: 1 }}>
                                <label style={styles.label}>Kose Yuvarlakligi</label>
                                <select
                                    value={formData.radius}
                                    onChange={(e) => setFormData({ ...formData, radius: e.target.value as 'pill' | 'round' | 'none' })}
                                    style={styles.select}
                                >
                                    <option value="pill">Pill (Tam Yuvarlak)</option>
                                    <option value="round">Round (Yuvarlak)</option>
                                    <option value="none">None (Keskin)</option>
                                </select>
                            </div>
                        </div>

                        <div style={styles.row}>
                            <div style={{ ...styles.field, flex: 1 }}>
                                <label style={styles.label}>Yogunluk</label>
                                <select
                                    value={formData.density}
                                    onChange={(e) => setFormData({ ...formData, density: e.target.value as 'compact' | 'normal' | 'relaxed' })}
                                    style={styles.select}
                                >
                                    <option value="compact">Compact (Sikisik)</option>
                                    <option value="normal">Normal</option>
                                    <option value="relaxed">Relaxed (Gevs)</option>
                                </select>
                            </div>
                            <div style={{ ...styles.field, flex: 1 }}>
                                <label style={styles.label}>Accent Rengi</label>
                                <div style={styles.colorWrapper}>
                                    <input
                                        type="color"
                                        value={formData.accent}
                                        onChange={(e) => setFormData({ ...formData, accent: e.target.value })}
                                        style={styles.colorInput}
                                    />
                                    <input
                                        type="text"
                                        value={formData.accent}
                                        onChange={(e) => setFormData({ ...formData, accent: e.target.value })}
                                        style={{ ...styles.input, flex: 1 }}
                                    />
                                </div>
                                <span style={styles.hint}>Buton ve link renkleri</span>
                            </div>
                        </div>

                        {/* ChatKit Configuration Section */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>ChatKit Yapılandırması</h3>
                            <p style={styles.sectionSubtitle}>OpenAI ChatKit özelliklerini yapılandırın</p>

                            <div style={styles.row}>
                                <div style={{ ...styles.field, flex: 1 }}>
                                    <label style={styles.label}>
                                        <input
                                            type="checkbox"
                                            checked={formData.chatkit_auto_titling}
                                            onChange={(e) => setFormData({ ...formData, chatkit_auto_titling: e.target.checked })}
                                            style={styles.checkbox}
                                        />
                                        Otomatik Başlık Oluşturma
                                    </label>
                                    <span style={styles.hint}>Sohbet geçmişinde otomatik başlıklar oluşturur</span>
                                </div>

                                <div style={{ ...styles.field, flex: 1 }}>
                                    <label style={styles.label}>
                                        <input
                                            type="checkbox"
                                            checked={formData.chatkit_history_enabled}
                                            onChange={(e) => setFormData({ ...formData, chatkit_history_enabled: e.target.checked })}
                                            style={styles.checkbox}
                                        />
                                        Geçmiş Etkin
                                    </label>
                                    <span style={styles.hint}>Sohbet geçmişini göster</span>
                                </div>
                            </div>

                            {formData.chatkit_history_enabled && (
                                <div style={styles.field}>
                                    <label style={styles.label}>Son Sohbet Sayısı</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={formData.chatkit_history_recent_threads}
                                        onChange={(e) => setFormData({ ...formData, chatkit_history_recent_threads: parseInt(e.target.value) || 10 })}
                                        style={styles.input}
                                    />
                                </div>
                            )}

                            <div style={styles.row}>
                                <div style={{ ...styles.field, flex: 1 }}>
                                    <label style={styles.label}>
                                        <input
                                            type="checkbox"
                                            checked={formData.chatkit_file_upload}
                                            onChange={(e) => setFormData({ ...formData, chatkit_file_upload: e.target.checked })}
                                            style={styles.checkbox}
                                        />
                                        Dosya Yükleme
                                    </label>
                                    <span style={styles.hint}>Kullanıcıların dosya yüklemesine izin ver</span>
                                </div>

                                <div style={{ ...styles.field, flex: 1 }}>
                                    <label style={styles.label}>UI Teması</label>
                                    <select
                                        value={formData.chatkit_ui_theme}
                                        onChange={(e) => setFormData({ ...formData, chatkit_ui_theme: e.target.value as 'light' | 'dark' | 'auto' })}
                                        style={styles.select}
                                    >
                                        <option value="light">Açık</option>
                                        <option value="dark">Koyu</option>
                                        <option value="auto">Otomatik</option>
                                    </select>
                                </div>
                            </div>

                            {formData.chatkit_file_upload && (
                                <div style={styles.row}>
                                    <div style={{ ...styles.field, flex: 1 }}>
                                        <label style={styles.label}>Maks Dosya Boyutu (bytes)</label>
                                        <input
                                            type="number"
                                            min="1048576"
                                            max="104857600"
                                            value={formData.chatkit_file_max_size}
                                            onChange={(e) => setFormData({ ...formData, chatkit_file_max_size: parseInt(e.target.value) || 10485760 })}
                                            style={styles.input}
                                        />
                                        <span style={styles.hint}>Varsayılan: 10MB (10485760 bytes)</span>
                                    </div>

                                    <div style={{ ...styles.field, flex: 1 }}>
                                        <label style={styles.label}>Maks Dosya Sayısı</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={formData.chatkit_file_max_count}
                                            onChange={(e) => setFormData({ ...formData, chatkit_file_max_count: parseInt(e.target.value) || 5 })}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={styles.row}>
                                <div style={{ ...styles.field, flex: 1 }}>
                                    <label style={styles.label}>UI Primary Rengi</label>
                                    <div style={styles.colorWrapper}>
                                        <input
                                            type="color"
                                            value={formData.chatkit_ui_primary_color}
                                            onChange={(e) => setFormData({ ...formData, chatkit_ui_primary_color: e.target.value })}
                                            style={styles.colorInput}
                                        />
                                        <input
                                            type="text"
                                            value={formData.chatkit_ui_primary_color}
                                            onChange={(e) => setFormData({ ...formData, chatkit_ui_primary_color: e.target.value })}
                                            style={{ ...styles.input, flex: 1 }}
                                        />
                                    </div>
                                </div>

                                <div style={{ ...styles.field, flex: 1 }}>
                                    <label style={styles.label}>
                                        <input
                                            type="checkbox"
                                            checked={formData.chatkit_ui_show_branding}
                                            onChange={(e) => setFormData({ ...formData, chatkit_ui_show_branding: e.target.checked })}
                                            style={styles.checkbox}
                                        />
                                        Branding Göster
                                    </label>
                                    <span style={styles.hint}>OpenAI branding'ini göster</span>
                                </div>
                            </div>

                            <div style={styles.row}>
                                <div style={{ ...styles.field, flex: 1 }}>
                                    <label style={styles.label}>
                                        <input
                                            type="checkbox"
                                            checked={formData.chatkit_behavior_auto_focus}
                                            onChange={(e) => setFormData({ ...formData, chatkit_behavior_auto_focus: e.target.checked })}
                                            style={styles.checkbox}
                                        />
                                        Otomatik Odaklanma
                                    </label>
                                    <span style={styles.hint}>Açılışta input alanına odaklan</span>
                                </div>

                                <div style={{ ...styles.field, flex: 1 }}>
                                    <label style={styles.label}>
                                        <input
                                            type="checkbox"
                                            checked={formData.chatkit_behavior_typing_indicator}
                                            onChange={(e) => setFormData({ ...formData, chatkit_behavior_typing_indicator: e.target.checked })}
                                            style={styles.checkbox}
                                        />
                                        Yazma Göstergesi
                                    </label>
                                    <span style={styles.hint}>Bot yazarken gösterge göster</span>
                                </div>
                            </div>

                            <div style={styles.row}>
                                <div style={{ ...styles.field, flex: 1 }}>
                                    <label style={styles.label}>Placeholder Metni</label>
                                    <input
                                        type="text"
                                        value={formData.chatkit_behavior_placeholder}
                                        onChange={(e) => setFormData({ ...formData, chatkit_behavior_placeholder: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>

                                <div style={{ ...styles.field, flex: 1 }}>
                                    <label style={styles.label}>
                                        <input
                                            type="checkbox"
                                            checked={formData.chatkit_behavior_sound}
                                            onChange={(e) => setFormData({ ...formData, chatkit_behavior_sound: e.target.checked })}
                                            style={styles.checkbox}
                                        />
                                        Ses Etkin
                                    </label>
                                    <span style={styles.hint}>Bildirim sesleri</span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} style={styles.button}>
                            {loading ? 'Olusturuluyor...' : 'Embed Kodu Olustur'}
                        </button>
                    </form>

                    {error && <div style={styles.error}>{error}</div>}

                    {result && (
                        <div style={styles.result}>
                            <h3 style={styles.resultTitle}>Embed Kodu Hazir!</h3>
                            {result.message && <p style={styles.resultMessage}>{result.message}</p>}
                            <p style={styles.resultInfo}>
                                <strong>Origin:</strong> {result.origin}<br />
                                <strong>Workflow Key:</strong> {result.workflow_key}
                            </p>
                            <div style={styles.codeWrapper}>
                                <pre style={styles.code}>{result.embed_code}</pre>
                                <button onClick={copyToClipboard} style={styles.copyButton}>
                                    {copied ? 'Kopyalandi!' : 'Kopyala'}
                                </button>
                            </div>
                            <p style={styles.instructions}>
                                Bu kodu sitenizin {'<body>'} etiketinin sonuna ekleyin.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Workflow List Tab */}
            {activeTab === 'list' && (
                <div style={styles.card}>
                    <div style={styles.listHeader}>
                        <div>
                            <h2 style={styles.title}>Workflow Listesi</h2>
                            <p style={styles.subtitle}>Kayitli workflow'lari yonetin</p>
                        </div>
                        <button onClick={loadWorkflows} style={styles.refreshButton}>
                            Yenile
                        </button>
                    </div>

                    {listError && <div style={styles.error}>{listError}</div>}
                    {listSuccess && <div style={styles.success}>{listSuccess}</div>}

                    {loadingWorkflows ? (
                        <div style={styles.loadingInline}>
                            <div style={styles.spinnerSmall}></div>
                            <span>Yukleniyor...</span>
                        </div>
                    ) : workflows.length === 0 ? (
                        <p style={styles.emptyText}>Henuz kayitli workflow yok.</p>
                    ) : (
                        <div style={styles.workflowList}>
                            {workflows.map((wf) => (
                                <div key={wf.id} style={styles.workflowItem}>
                                    {editingId === wf.id ? (
                                        // Edit mode
                                        <div style={styles.editForm}>
                                            <div style={styles.field}>
                                                <label style={styles.labelSmall}>Etiket</label>
                                                <input
                                                    type="text"
                                                    value={editForm.label}
                                                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                                                    placeholder={wf.label || 'Etiket'}
                                                    style={styles.inputSmall}
                                                />
                                            </div>
                                            <div style={styles.field}>
                                                <label style={styles.labelSmall}>Yeni API Key (opsiyonel)</label>
                                                <input
                                                    type="password"
                                                    value={editForm.api_key}
                                                    onChange={(e) => setEditForm({ ...editForm, api_key: e.target.value })}
                                                    placeholder="sk-proj-..."
                                                    style={styles.inputSmall}
                                                />
                                            </div>
                                            <div style={styles.editActions}>
                                                <button onClick={() => saveEdit(wf.id)} style={styles.saveButton}>
                                                    Kaydet
                                                </button>
                                                <button onClick={cancelEdit} style={styles.cancelButton}>
                                                    Iptal
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View mode
                                        <>
                                            <div style={styles.workflowInfo}>
                                                <div style={styles.workflowLabel}>{wf.label || 'Isimsiz'}</div>
                                                <div style={styles.workflowMeta}>
                                                    <span style={styles.metaItem}>
                                                        <strong>Origin:</strong> {wf.site_origin}
                                                    </span>
                                                    <span style={styles.metaItem}>
                                                        <strong>Key:</strong> {wf.key}
                                                    </span>
                                                    <span style={styles.metaItem}>
                                                        <strong>API Key:</strong> {wf.api_key}
                                                    </span>
                                                </div>
                                                {wf.script_code && (
                                                    <details style={styles.scriptDetails}>
                                                        <summary style={styles.scriptSummary}>Script Kodunu Görüntüle</summary>
                                                        <pre style={styles.scriptCode}>{wf.script_code}</pre>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(wf.script_code || '');
                                                            }}
                                                            style={styles.copyScriptButton}
                                                        >
                                                            Script Kodunu Kopyala
                                                        </button>
                                                    </details>
                                                )}
                                                {wf.chatkit_config && (
                                                    <details style={styles.scriptDetails}>
                                                        <summary style={styles.scriptSummary}>ChatKit Yapılandırmasını Görüntüle</summary>
                                                        <pre style={styles.scriptCode}>{JSON.stringify(JSON.parse(wf.chatkit_config), null, 2)}</pre>
                                                    </details>
                                                )}
                                            </div>
                                            <div style={styles.workflowActions}>
                                                <button onClick={() => startEdit(wf)} style={styles.editButton}>
                                                    Duzenle
                                                </button>
                                                <button onClick={() => deleteWorkflow(wf.id, wf.label || 'Isimsiz')} style={styles.deleteButton}>
                                                    Sil
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
        maxWidth: '700px',
        margin: '0 auto 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: '20px',
        fontWeight: 600,
        margin: 0,
    },
    logoutButton: {
        backgroundColor: 'transparent',
        color: '#888',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '14px',
        cursor: 'pointer',
    },
    tabs: {
        maxWidth: '700px',
        margin: '0 auto 20px',
        display: 'flex',
        gap: '8px',
    },
    tab: {
        backgroundColor: '#1a1a1a',
        color: '#888',
        border: '1px solid #2a2a2a',
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    tabActive: {
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '14px',
        cursor: 'pointer',
    },
    loadingCard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid #333',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    spinnerSmall: {
        width: '20px',
        height: '20px',
        border: '2px solid #333',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    loadingText: {
        color: '#666',
        marginTop: '16px',
    },
    loadingInline: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#666',
        padding: '20px 0',
    },
    card: {
        maxWidth: '700px',
        margin: '0 auto',
        backgroundColor: '#141414',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid #222',
    },
    listHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
    },
    title: {
        color: '#fff',
        fontSize: '24px',
        fontWeight: 600,
        marginBottom: '8px',
        marginTop: 0,
    },
    subtitle: {
        color: '#666',
        fontSize: '15px',
        marginBottom: '28px',
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
        gap: '6px',
    },
    label: {
        color: '#999',
        fontSize: '14px',
        fontWeight: 500,
    },
    labelSmall: {
        color: '#888',
        fontSize: '12px',
        fontWeight: 500,
    },
    input: {
        backgroundColor: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '10px',
        padding: '12px 16px',
        color: '#fff',
        fontSize: '15px',
        outline: 'none',
    },
    inputSmall: {
        backgroundColor: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#fff',
        fontSize: '14px',
        outline: 'none',
    },
    select: {
        backgroundColor: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '10px',
        padding: '12px 16px',
        color: '#fff',
        fontSize: '15px',
        outline: 'none',
        cursor: 'pointer',
    },
    hint: {
        color: '#555',
        fontSize: '12px',
    },
    row: {
        display: 'flex',
        gap: '16px',
    },
    colorWrapper: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    colorInput: {
        width: '48px',
        height: '42px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: 'transparent',
    },
    button: {
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        padding: '14px 24px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        marginTop: '8px',
    },
    refreshButton: {
        backgroundColor: '#1a1a1a',
        color: '#888',
        border: '1px solid #2a2a2a',
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '13px',
        cursor: 'pointer',
    },
    error: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '10px',
        padding: '14px 18px',
        color: '#ef4444',
        marginTop: '16px',
        marginBottom: '16px',
        fontSize: '14px',
    },
    success: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.2)',
        borderRadius: '10px',
        padding: '14px 18px',
        color: '#22c55e',
        marginTop: '16px',
        marginBottom: '16px',
        fontSize: '14px',
    },
    result: {
        backgroundColor: 'rgba(34, 197, 94, 0.08)',
        border: '1px solid rgba(34, 197, 94, 0.2)',
        borderRadius: '10px',
        padding: '20px',
        marginTop: '20px',
    },
    resultTitle: {
        color: '#22c55e',
        fontSize: '16px',
        fontWeight: 600,
        marginTop: 0,
        marginBottom: '8px',
    },
    resultMessage: {
        color: '#86efac',
        fontSize: '13px',
        marginBottom: '12px',
        fontStyle: 'italic',
    },
    resultInfo: {
        color: '#a3e635',
        fontSize: '13px',
        marginBottom: '16px',
        lineHeight: 1.6,
    },
    codeWrapper: {
        position: 'relative',
        backgroundColor: '#0a0a0a',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
    },
    code: {
        color: '#e2e8f0',
        fontSize: '12px',
        fontFamily: 'Monaco, Consolas, monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        margin: 0,
        paddingRight: '70px',
    },
    copyButton: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: '#333',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 12px',
        fontSize: '12px',
        cursor: 'pointer',
    },
    instructions: {
        color: '#86efac',
        fontSize: '13px',
        margin: 0,
    },
    emptyText: {
        color: '#666',
        fontSize: '14px',
        textAlign: 'center',
        padding: '40px 0',
    },
    workflowList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    workflowItem: {
        backgroundColor: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '12px',
        padding: '16px',
    },
    workflowInfo: {
        flex: 1,
    },
    workflowLabel: {
        color: '#fff',
        fontSize: '16px',
        fontWeight: 500,
        marginBottom: '8px',
    },
    workflowMeta: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    metaItem: {
        color: '#666',
        fontSize: '13px',
    },
    workflowActions: {
        display: 'flex',
        gap: '8px',
        marginTop: '12px',
    },
    editButton: {
        backgroundColor: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 14px',
        fontSize: '13px',
        cursor: 'pointer',
    },
    deleteButton: {
        backgroundColor: '#dc2626',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 14px',
        fontSize: '13px',
        cursor: 'pointer',
    },
    editForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    editActions: {
        display: 'flex',
        gap: '8px',
        marginTop: '8px',
    },
    saveButton: {
        backgroundColor: '#22c55e',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '8px 16px',
        fontSize: '13px',
        cursor: 'pointer',
    },
    cancelButton: {
        backgroundColor: '#333',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '8px 16px',
        fontSize: '13px',
        cursor: 'pointer',
    },
    section: {
        backgroundColor: '#0f0f0f',
        border: '1px solid #2a2a2a',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '24px',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: '18px',
        fontWeight: 600,
        marginTop: 0,
        marginBottom: '6px',
    },
    sectionSubtitle: {
        color: '#666',
        fontSize: '13px',
        marginTop: 0,
        marginBottom: '20px',
    },
    checkbox: {
        marginRight: '8px',
        width: '18px',
        height: '18px',
        cursor: 'pointer',
    },
    scriptDetails: {
        marginTop: '12px',
        backgroundColor: '#0f0f0f',
        borderRadius: '8px',
        padding: '8px',
        border: '1px solid #2a2a2a',
    },
    scriptSummary: {
        color: '#3b82f6',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        padding: '4px',
        userSelect: 'none',
    },
    scriptCode: {
        backgroundColor: '#0a0a0a',
        border: '1px solid #222',
        borderRadius: '6px',
        padding: '12px',
        color: '#e2e8f0',
        fontSize: '11px',
        fontFamily: 'Monaco, Consolas, monospace',
        overflow: 'auto',
        marginTop: '8px',
        marginBottom: '8px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
    },
    copyScriptButton: {
        backgroundColor: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 12px',
        fontSize: '12px',
        cursor: 'pointer',
        width: '100%',
    },
};
