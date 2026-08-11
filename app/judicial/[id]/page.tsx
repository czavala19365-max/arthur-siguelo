import { headers } from 'next/headers';
import JudicialCaseDetailClient from './JudicialCaseDetailClient';

export default async function JudicialCaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headerList = await headers();
  const host = headerList.get('host');
  const proto = headerList.get('x-forwarded-proto') || 'http';
  const cookie = headerList.get('cookie') || '';

  let initialCaso: unknown = null;
  if (host) {
    try {
      const res = await fetch(`${proto}://${host}/api/casos/${id}`, {
        headers: { cookie },
        cache: 'no-store',
      });
      if (res.ok) {
        initialCaso = await res.json();
      }
    } catch {
      initialCaso = null;
    }
  }

  return <JudicialCaseDetailClient id={id} initialCaso={initialCaso} />;
}
