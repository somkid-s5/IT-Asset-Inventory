'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type InventoryDocumentLink = { id: string; title: string };

export function InventoryDocuments({ documents = [] }: { documents?: InventoryDocumentLink[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" />Canonical documents</CardTitle></CardHeader>
      <CardContent>
        {documents.length ? <ul className="space-y-2">{documents.map((document) => <li key={document.id}><Link className="text-sm font-medium text-primary hover:underline" href={`/docs/${document.id}`}>{document.title}</Link></li>)}</ul> : <p className="text-sm text-muted-foreground">No canonical documents linked.</p>}
      </CardContent>
    </Card>
  );
}
