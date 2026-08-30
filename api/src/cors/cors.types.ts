export interface CorsOriginRow {
  id: string;
  origin: string;
  enabled: boolean;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export function normaliseOrigin(origin: string): string {
  return origin.trim().toLowerCase().replace(/\/+$/, '');
}
