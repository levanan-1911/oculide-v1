import { redirect } from 'next/navigation';

export default function AdminQuestionsRedirect() {
  redirect('/question-manager');
}

