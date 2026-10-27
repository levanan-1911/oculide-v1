'use client';

import React from 'react';
import StudentSidebar from '@/components/student/StudentSidebar';
import StudentTopbar from '@/components/student/StudentTopbar';
import ProfileView from '@/components/profile/ProfileView';

export default function StudentProfilePage() {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <StudentSidebar />
      <div className="min-w-0 flex-1">
        <StudentTopbar />
        <main className="mx-auto max-w-[1600px] p-5 sm:p-8">
          <ProfileView role="student" />
        </main>
      </div>
    </div>
  );
}
