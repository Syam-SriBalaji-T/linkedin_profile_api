import { NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';
import { errorResponse, withSession } from '@/lib/route-helpers';
import type { SearchView } from '@/lib/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return errorResponse('Invalid search id', 400);

  return withSession<SearchView>((token) =>
    apiRequest<SearchView>({ path: `/searches/${id}`, token }),
  );
}
