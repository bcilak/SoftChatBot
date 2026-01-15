import { getAllOrigins } from './database';

export function parseAllowedOrigins(envValue: string | undefined): string[] {
    if (!envValue) return [];
    return envValue
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export function getAllAllowedOrigins(envValue: string | undefined): string[] {
    // Get origins from env
    const envOrigins = parseAllowedOrigins(envValue);

    // Get origins from database
    let dbOrigins: string[] = [];
    try {
        dbOrigins = getAllOrigins();
    } catch {
        // Database not ready yet, ignore
    }

    // Merge and dedupe
    return [...new Set([...envOrigins, ...dbOrigins])];
}

export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
    if (allowedOrigins.length === 0) return false;
    return allowedOrigins.includes(origin);
}
