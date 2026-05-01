// templates/[id]/edit — reuses the editor at /editor/[id]
import { redirect } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

export default function EditTemplatePage({ params }: PageProps) {
  // The main editor lives at /editor/[id]; reuse it via redirect
  redirect(`/editor/${params.id}`);
}
