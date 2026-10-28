import React from 'react';
import InstructorWaitingRoomView from '@/components/instructor/room/InstructorWaitingRoomView';

interface Props {
  params: {
    id: string;
  };
}

export default function InstructorRoomLobbyPage({ params }: Props) {
  const roomId = params?.id || 'ROOM';
  return <InstructorWaitingRoomView roomId={roomId} />;
}
