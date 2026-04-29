'use client';

import { use } from 'react';
import JudicialRedaccion from '@/components/JudicialRedaccion';

export default function JudicialRedactarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <JudicialRedaccion expedienteId={id} />;
}
