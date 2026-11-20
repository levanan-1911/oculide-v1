import React from 'react';
import InstructorWaitingRoomView from '@/components/instructor/room/InstructorWaitingRoomView';

interface Props {
  params: {
    id: string;
  };
  searchParams?: {
    returnTo?: string | string[];
  };
}

export default function InstructorRoomLobbyPage({ params, searchParams }: Props) {
  const roomId = params?.id || 'ROOM';
  const returnToSchedules = searchParams?.returnTo === 'schedules';
  return (
    <InstructorWaitingRoomView
      roomId={roomId}
      returnToSchedules={returnToSchedules}
    />
  );
}
