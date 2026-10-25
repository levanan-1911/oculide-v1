import { redirect } from 'next/navigation';

export default function DashboardClassesRedirect() {
  redirect('/class-manager');
}
