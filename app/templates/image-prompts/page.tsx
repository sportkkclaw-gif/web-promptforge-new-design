import { redirect } from 'next/navigation';

export default function ImagePromptsPage() {
  redirect('/browse?category=marketing');
}
