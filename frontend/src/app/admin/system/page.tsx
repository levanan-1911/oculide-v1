import { redirect } from 'next/navigation';

export default function AdminSystemRedirect() {
  redirect('/system-manager');
}

