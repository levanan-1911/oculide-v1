import { redirect } from 'next/navigation';

export default function DashboardUsersRedirect() {
  redirect('/user-manager');
}
