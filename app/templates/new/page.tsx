'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// templates/new — redirects to editor with a new template ID
export default function NewTemplatePage() {
  // The actual creation will happen via the API; redirect to dashboard to create
  // This page serves as the route entry point for "new template"
  useEffect(() => {
    // For now, redirect to dashboard prompts; in a real flow the user would
    // be taken to the editor after template creation API is called
    window.location.href = '/dashboard/prompts';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-muted-foreground">Redirecting…</div>
    </div>
  );
}
