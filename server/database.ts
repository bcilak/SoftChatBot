import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'softchatbot.db');

// Ensure data directory exists
function ensureDataDir() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Singleton database instance
let db: Database.Database | null = null;

export function getDb(): Database.Database {
    if (!db) {
        ensureDataDir();
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        initializeSchema();
    }
    return db;
}

function initializeSchema() {
    const database = db!;

    // Sites table
    database.exec(`
        CREATE TABLE IF NOT EXISTS sites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origin TEXT NOT NULL UNIQUE,
            default_workflow_key TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Workflows table
    database.exec(`
        CREATE TABLE IF NOT EXISTS workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site_id INTEGER NOT NULL,
            key TEXT NOT NULL,
            workflow_id TEXT NOT NULL,
            label TEXT,
            api_key TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
            UNIQUE(site_id, key),
            UNIQUE(site_id, workflow_id)
        )
    `);

    // Create indexes
    database.exec(`
        CREATE INDEX IF NOT EXISTS idx_sites_origin ON sites(origin);
        CREATE INDEX IF NOT EXISTS idx_workflows_site_id ON workflows(site_id);
        CREATE INDEX IF NOT EXISTS idx_workflows_key ON workflows(key);
    `);
}

// Types
export type DbSite = {
    id: number;
    origin: string;
    default_workflow_key: string | null;
    created_at: string;
    updated_at: string;
};

export type DbWorkflow = {
    id: number;
    site_id: number;
    key: string;
    workflow_id: string;
    label: string | null;
    api_key: string;
    created_at: string;
    updated_at: string;
};

// Site operations
export function getAllSites(): DbSite[] {
    const database = getDb();
    return database.prepare('SELECT * FROM sites ORDER BY created_at DESC').all() as DbSite[];
}

export function getSiteByOrigin(origin: string): DbSite | null {
    const database = getDb();
    return database.prepare('SELECT * FROM sites WHERE origin = ?').get(origin) as DbSite | null;
}

export function createSite(origin: string, defaultWorkflowKey?: string): DbSite {
    const database = getDb();
    const stmt = database.prepare(`
        INSERT INTO sites (origin, default_workflow_key)
        VALUES (?, ?)
    `);
    const result = stmt.run(origin, defaultWorkflowKey || null);
    return getSiteById(result.lastInsertRowid as number)!;
}

export function getSiteById(id: number): DbSite | null {
    const database = getDb();
    return database.prepare('SELECT * FROM sites WHERE id = ?').get(id) as DbSite | null;
}

export function updateSiteDefaultWorkflow(siteId: number, workflowKey: string): void {
    const database = getDb();
    database.prepare(`
        UPDATE sites SET default_workflow_key = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(workflowKey, siteId);
}

export function deleteSite(siteId: number): void {
    const database = getDb();
    database.prepare('DELETE FROM sites WHERE id = ?').run(siteId);
}

// Workflow operations
export function getWorkflowsBySiteId(siteId: number): DbWorkflow[] {
    const database = getDb();
    return database.prepare('SELECT * FROM workflows WHERE site_id = ? ORDER BY created_at DESC').all(siteId) as DbWorkflow[];
}

export function getWorkflowByKey(siteId: number, key: string): DbWorkflow | null {
    const database = getDb();
    return database.prepare('SELECT * FROM workflows WHERE site_id = ? AND key = ?').get(siteId, key) as DbWorkflow | null;
}

export function getWorkflowByWorkflowId(siteId: number, workflowId: string): DbWorkflow | null {
    const database = getDb();
    return database.prepare('SELECT * FROM workflows WHERE site_id = ? AND workflow_id = ?').get(siteId, workflowId) as DbWorkflow | null;
}

export function createWorkflow(data: {
    siteId: number;
    key: string;
    workflowId: string;
    label: string;
    apiKey: string;
}): DbWorkflow {
    const database = getDb();
    const stmt = database.prepare(`
        INSERT INTO workflows (site_id, key, workflow_id, label, api_key)
        VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.siteId, data.key, data.workflowId, data.label, data.apiKey);
    return getWorkflowById(result.lastInsertRowid as number)!;
}

export function getWorkflowById(id: number): DbWorkflow | null {
    const database = getDb();
    return database.prepare('SELECT * FROM workflows WHERE id = ?').get(id) as DbWorkflow | null;
}

export function updateWorkflow(workflowId: number, data: {
    label?: string;
    apiKey?: string;
}): void {
    const database = getDb();
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];

    if (data.label !== undefined) {
        updates.push('label = ?');
        values.push(data.label);
    }
    if (data.apiKey !== undefined) {
        updates.push('api_key = ?');
        values.push(data.apiKey);
    }

    values.push(workflowId);
    database.prepare(`UPDATE workflows SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteWorkflow(workflowId: number): void {
    const database = getDb();
    database.prepare('DELETE FROM workflows WHERE id = ?').run(workflowId);
}

// Helper: Get all origins (for CORS)
export function getAllOrigins(): string[] {
    const database = getDb();
    const sites = database.prepare('SELECT origin FROM sites').all() as { origin: string }[];
    return sites.map(s => s.origin);
}

// Helper: Get site with workflows
export type SiteWithWorkflows = DbSite & {
    workflows: DbWorkflow[];
};

export function getSiteWithWorkflows(origin: string): SiteWithWorkflows | null {
    const site = getSiteByOrigin(origin);
    if (!site) return null;

    const workflows = getWorkflowsBySiteId(site.id);
    return { ...site, workflows };
}

// Close database (for cleanup)
export function closeDb(): void {
    if (db) {
        db.close();
        db = null;
    }
}
