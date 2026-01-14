export function parseAllowedOrigins(envValue: string | undefined): string[] {
    if (!envValue) return [];
    return envValue
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
    if (allowedOrigins.length === 0) return false;
    return allowedOrigins.includes(origin);
}
