import { redirect } from 'next/navigation';

export default function AdminMonitoringRedirect() {
  redirect('/monitoring-manager');
}

