export interface StreamOption { id: string; language?: string; quality?: string; hd?: boolean; streamNumber?: number; }
export interface StreamListData { streams: StreamOption[]; }
export interface StreamPlaybackData { embedUrl: string; expiresAt?: string; }
