import { NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { errorResponse, readJsonBody, withSession } from '@/lib/route-helpers';
import type { SearchList, SearchView } from '@/lib/types';

export async function POST(req: Request): Promise<NextResponse> {
  const body = await readJsonBody(req);
  const url = typeof body?.url === 'string' ? body.url.trim() : '';
  const refresh = body?.refresh === true;

  if (!url) return errorResponse('A LinkedIn profile URL or username is required', 400);

  return withSession<SearchView>((token) =>
    apiRequest<SearchView>({
      method: 'POST',
      path: `/searches${refresh ? '?refresh=true' : ''}`,
      token,
      body: { url },
    }),
  );
}

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const limit = clampInt(searchParams.get('limit'), 20, 1, 100);
  const offset = clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);

  return withSession<SearchList>((token) =>
    apiRequest<SearchList>({
      path: `/searches?limit=${limit}&offset=${offset}`,
      token,
    }),
  );
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}
