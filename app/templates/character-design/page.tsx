import { redirect } from 'next/navigation';

export default function CharacterDesignPage() {
  redirect('/browse?category=character-design');
}
