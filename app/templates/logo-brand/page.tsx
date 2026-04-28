import { redirect } from 'next/navigation';

export default function LogoBrandPage() {
  redirect('/browse?category=logo');
}
