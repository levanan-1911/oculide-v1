import { redirect } from 'next/navigation';

export default function AdminSchedulesRedirect() {
  redirect('/schedule-manager');
}

