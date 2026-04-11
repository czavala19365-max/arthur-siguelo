export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return Response.json({ ok: true });
}
