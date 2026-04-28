import { redirect } from 'next/navigation';

export default function CreatePage() {
  // Keep legacy route for compatibility, route users to prompt generator flow.
  redirect('/generator/default-template');
}
