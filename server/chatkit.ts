export type CreateChatKitSessionResult = {
    client_secret: string;
    expires_at?: number;
};

export type ChatKitConfiguration = {
    automatic_thread_titling?: {
        enabled: boolean;
    };
    history?: {
        enabled: boolean;
        recent_threads?: number;
    };
    file_upload?: {
        enabled: boolean;
        max_file_size?: number;
        max_files?: number;
        allowed_mime_types?: string[];
    };
    user_interface?: {
        theme?: 'light' | 'dark' | 'auto';
        primary_color?: string;
        show_branding?: boolean;
        custom_css?: string;
    };
    behavior?: {
        auto_focus?: boolean;
        placeholder_text?: string;
        welcome_message?: string;
        typing_indicator?: boolean;
        sound_enabled?: boolean;
    };
    advanced?: {
        rate_limit?: {
            enabled: boolean;
            max_requests?: number;
            time_window?: number;
        };
        moderation?: {
            enabled: boolean;
            filter_profanity?: boolean;
        };
    };
};

function envBool(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    const v = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
    return defaultValue;
}

export function defaultChatKitConfigurationFromEnv(): ChatKitConfiguration {
    // Defaults aim for a minimal UI.
    return {
        automatic_thread_titling: {
            enabled: envBool(process.env.CHATKIT_AUTOMATIC_THREAD_TITLING_ENABLED, false),
        },
        history: {
            enabled: envBool(process.env.CHATKIT_HISTORY_ENABLED, false),
            recent_threads: process.env.CHATKIT_HISTORY_RECENT_THREADS
                ? parseInt(process.env.CHATKIT_HISTORY_RECENT_THREADS, 10)
                : 10,
        },
        file_upload: {
            enabled: envBool(process.env.CHATKIT_FILE_UPLOAD_ENABLED, false),
            max_file_size: process.env.CHATKIT_FILE_UPLOAD_MAX_SIZE
                ? parseInt(process.env.CHATKIT_FILE_UPLOAD_MAX_SIZE, 10)
                : 10485760, // 10MB default
            max_files: process.env.CHATKIT_FILE_UPLOAD_MAX_FILES
                ? parseInt(process.env.CHATKIT_FILE_UPLOAD_MAX_FILES, 10)
                : 5,
        },
        user_interface: {
            theme: (process.env.CHATKIT_UI_THEME as 'light' | 'dark' | 'auto') || 'light',
            primary_color: process.env.CHATKIT_UI_PRIMARY_COLOR || '#2D8CFF',
            show_branding: envBool(process.env.CHATKIT_UI_SHOW_BRANDING, true),
        },
        behavior: {
            auto_focus: envBool(process.env.CHATKIT_BEHAVIOR_AUTO_FOCUS, true),
            placeholder_text: process.env.CHATKIT_BEHAVIOR_PLACEHOLDER || 'Type a message...',
            typing_indicator: envBool(process.env.CHATKIT_BEHAVIOR_TYPING_INDICATOR, true),
            sound_enabled: envBool(process.env.CHATKIT_BEHAVIOR_SOUND, false),
        },
        advanced: {
            rate_limit: {
                enabled: envBool(process.env.CHATKIT_RATE_LIMIT_ENABLED, false),
                max_requests: process.env.CHATKIT_RATE_LIMIT_MAX
                    ? parseInt(process.env.CHATKIT_RATE_LIMIT_MAX, 10)
                    : 100,
                time_window: process.env.CHATKIT_RATE_LIMIT_WINDOW
                    ? parseInt(process.env.CHATKIT_RATE_LIMIT_WINDOW, 10)
                    : 3600000, // 1 hour in ms
            },
            moderation: {
                enabled: envBool(process.env.CHATKIT_MODERATION_ENABLED, false),
                filter_profanity: envBool(process.env.CHATKIT_MODERATION_PROFANITY, false),
            },
        },
    };
}

export async function createChatKitSession(opts: {
    apiKey: string;
    workflowId: string;
    user: string;
    chatkitConfiguration?: ChatKitConfiguration;
}): Promise<CreateChatKitSessionResult> {
    const resp = await fetch('https://api.openai.com/v1/chatkit/sessions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'chatkit_beta=v1',
        },
        body: JSON.stringify({
            workflow: { id: opts.workflowId },
            user: opts.user,
            ...(opts.chatkitConfiguration ? { chatkit_configuration: opts.chatkitConfiguration } : {}),
        }),
    });

    const text = await resp.text();
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = null;
    }

    if (!resp.ok) {
        const msg = json?.error?.message || json?.message || text || resp.statusText;
        const err = new Error(`OPENAI_CHATKIT_SESSION_FAILED: ${resp.status} ${msg}`);
        (err as any).status = resp.status;
        (err as any).responseBody = json ?? text;
        throw err;
    }

    const clientSecret = json?.client_secret;
    if (typeof clientSecret !== 'string' || clientSecret.length === 0) {
        const err = new Error('OPENAI_CHATKIT_SESSION_MALFORMED_RESPONSE');
        (err as any).responseBody = json;
        throw err;
    }

    return { client_secret: clientSecret, expires_at: json?.expires_at };
}
