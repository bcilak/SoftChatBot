import fs from 'node:fs';
import path from 'node:path';

export type SiteWorkflow = {
    key: string;
    id: string; // wf_...
    label?: string;
    apiKey?: string; // Optional per-workflow OpenAI API key
};

export type SiteConfig = {
    origin: string; // exact Origin match
    workflows: SiteWorkflow[];
    default_workflow_key?: string;
};

export type SitesConfigFile = {
    version: 1;
    sites: SiteConfig[];
};

const DEFAULT_CONFIG_PATH = path.join(process.cwd(), 'data', 'sites.json');

function ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
}

export function getSitesConfigPath(): string {
    return process.env.SITES_CONFIG_PATH || DEFAULT_CONFIG_PATH;
}

export function loadSitesConfig(): SitesConfigFile | null {
    const filePath = getSitesConfigPath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sites)) {
        throw new Error('SITES_CONFIG_INVALID');
    }

    return parsed as SitesConfigFile;
}

export function saveSitesConfig(config: SitesConfigFile) {
    const filePath = getSitesConfigPath();
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
}

export function getSiteConfigByOrigin(config: SitesConfigFile, origin: string): SiteConfig | null {
    const exact = config.sites.find((s) => s.origin === origin);
    return exact ?? null;
}

export function validateWorkflowId(id: string): boolean {
    return typeof id === 'string' && id.startsWith('wf_') && id.length > 10;
}

export function normalizeWorkflowKey(key: string): string {
    return key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

export function isAdminEnabled(): boolean {
    return Boolean(process.env.ADMIN_API_KEY && process.env.ADMIN_API_KEY.length > 10);
}

export function assertAdminAuth(request: Request) {
    if (!isAdminEnabled()) {
        const err = new Error('ADMIN_DISABLED');
        (err as any).code = 'ADMIN_DISABLED';
        throw err;
    }

    const auth = request.headers.get('authorization') || '';
    const expected = process.env.ADMIN_API_KEY as string;

    if (!auth.startsWith('Bearer ')) {
        const err = new Error('UNAUTHORIZED');
        (err as any).code = 'UNAUTHORIZED';
        throw err;
    }

    const token = auth.slice('Bearer '.length);
    if (token !== expected) {
        const err = new Error('UNAUTHORIZED');
        (err as any).code = 'UNAUTHORIZED';
        throw err;
    }
}
