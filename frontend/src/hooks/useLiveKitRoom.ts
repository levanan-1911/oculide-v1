'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  LocalVideoTrack,
  RemoteVideoTrack,
} from 'livekit-client';
import { fetchWithAuth } from '@/services/apiClient';

interface LiveKitTokenResponse {
  token: string;
  server_url: string;
  participant_identity: string;
  room_name: string;
}

interface UseLiveKitRoomOptions {
  roomId?: number | null;
  mode: 'publish' | 'subscribe';
  enabled?: boolean;
}

export function useLiveKitRoom({ roomId, mode, enabled = true }: UseLiveKitRoomOptions) {
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [remoteTracks, setRemoteTracks] = useState<Record<string, RemoteVideoTrack>>({});
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) {
      return;
    }

    let isCancelled = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    const handleTrackSubscribed = (
      track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteTracks((prev) => ({
          ...prev,
          [participant.identity]: track as RemoteVideoTrack,
        }));
      }
    };

    const handleTrackUnsubscribed = (
      track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteTracks((prev) => {
          const next = { ...prev };
          delete next[participant.identity];
          return next;
        });
      }
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      setRemoteTracks((prev) => {
        const next = { ...prev };
        delete next[participant.identity];
        return next;
      });
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    const connectToLiveKit = async () => {
      setConnectionState('connecting');
      setErrorMsg(null);

      try {
        const tokenData = await fetchWithAuth<LiveKitTokenResponse>('/api/v1/livekit/tokens', {
          method: 'POST',
          body: JSON.stringify({ room_id: roomId }),
        });

        if (isCancelled) return;

        await room.connect(tokenData.server_url, tokenData.token);
        if (isCancelled) {
          room.disconnect();
          return;
        }

        setConnectionState('connected');

        if (mode === 'publish') {
          try {
            await room.localParticipant.setCameraEnabled(true);
            const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
            if (camPub?.videoTrack) {
              setLocalVideoTrack(camPub.videoTrack as LocalVideoTrack);
            }
          } catch (camErr: any) {
            setErrorMsg('Không thể truy cập Camera trình duyệt (Vui lòng cấp quyền Webcam).');
          }
        } else {
          // Nạp các track video đã có sẵn từ sinh viên đang phát trước đó
          const initialMap: Record<string, RemoteVideoTrack> = {};
          room.remoteParticipants.forEach((participant) => {
            participant.videoTrackPublications.forEach((pub) => {
              if (pub.isSubscribed && pub.videoTrack && pub.videoTrack.kind === Track.Kind.Video) {
                initialMap[participant.identity] = pub.videoTrack as RemoteVideoTrack;
              }
            });
          });
          if (Object.keys(initialMap).length > 0) {
            setRemoteTracks(initialMap);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setConnectionState('error');
          setErrorMsg(err?.message || 'Lỗi kết nối máy chủ LiveKit Cloud');
        }
      }
    };

    connectToLiveKit();

    return () => {
      isCancelled = true;
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.disconnect();
      roomRef.current = null;
      setLocalVideoTrack(null);
      setRemoteTracks({});
      setConnectionState('idle');
    };
  }, [roomId, mode, enabled]);

  return {
    connectionState,
    errorMsg,
    localVideoTrack,
    remoteTracks,
    room: roomRef.current,
  };
}
