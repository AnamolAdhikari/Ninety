interface RateLimit { limit(input: { key: string }): Promise<{ success: boolean }>; }
interface Fetcher { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>; }
type ImagesBinding = unknown;
