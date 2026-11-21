'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  Room as LiveKitRoom,
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

export interface ParticipantTracks {
  camera?: RemoteVideoTrack;
  screen?: RemoteVideoTrack;
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
  const [localScreenTrack, setLocalScreenTrack] = useState<LocalVideoTrack | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteTracks, setRemoteTracks] = useState<Record<string, RemoteVideoTrack>>({});
  const [participantTracks, setParticipantTracks] = useState<Record<string, ParticipantTracks>>({});
  const roomRef = useRef<LiveKitRoom | null>(null);

  const enableScreenShare = useCallback(async (): Promise<boolean> => {
    if (!roomRef.current || connectionState !== 'connected') {
      return false;
    }
    try {
      const { Track } = await import('livekit-client');
      await roomRef.current.localParticipant.setScreenShareEnabled(true, {
        audio: false,
        resolution: { width: 1920, height: 1080, frameRate: 15 },
      });
      const pub = roomRef.current.localParticipant.getTrackPublication(Track.Source.ScreenShare);
      if (pub?.videoTrack) {
        setLocalScreenTrack(pub.videoTrack as LocalVideoTrack);
        setIsScreenSharing(true);
        return true;
      }
      setIsScreenSharing(true);
      return true;
    } catch (err: any) {
      console.warn('Lỗi khi kích hoạt chia sẻ màn hình LiveKit:', err);
      return false;
    }
  }, [connectionState]);

  const disableScreenShare = useCallback(async () => {
    if (!roomRef.current) return;
    try {
      await roomRef.current.localParticipant.setScreenShareEnabled(false);
      setLocalScreenTrack(null);
      setIsScreenSharing(false);
    } catch (err) {
      console.warn('Lỗi khi dừng chia sẻ màn hình:', err);
    }
  }, []);

  const toggleCamera = useCallback(async (enable?: boolean): Promise<boolean> => {
    if (!roomRef.current) return false;
    try {
      const target = enable !== undefined ? enable : !localVideoTrack;
      await roomRef.current.localParticipant.setCameraEnabled(target);
      if (target) {
        const { Track } = await import('livekit-client');
        const pub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
        if (pub?.videoTrack) {
          setLocalVideoTrack(pub.videoTrack as LocalVideoTrack);
        }
      } else {
        setLocalVideoTrack(null);
      }
      return target;
    } catch (err) {
      console.warn('Lỗi khi bật/tắt camera qua LiveKit:', err);
      return false;
    }
  }, [localVideoTrack]);

  useEffect(() => {
    if (!enabled || !roomId) {
      return;
    }

    let isCancelled = false;
    let cleanupRoom: (() => void) | null = null;

    const connectToLiveKit = async () => {
      setConnectionState('connecting');
      setErrorMsg(null);

      try {
        const { Room, RoomEvent, Track } = await import('livekit-client');
        if (isCancelled) return;

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        const handleTrackSubscribed = (
          track: RemoteTrack,
          publication: RemoteTrackPublication,
          participant: RemoteParticipant
        ) => {
          if (track.kind === Track.Kind.Video) {
            const isScreen = publication.source === Track.Source.ScreenShare || track.source === Track.Source.ScreenShare;
            const remoteVidTrack = track as RemoteVideoTrack;

            setRemoteTracks((prev) => ({
              ...prev,
              [participant.identity]: remoteVidTrack,
            }));

            setParticipantTracks((prev) => {
              const current = prev[participant.identity] || {};
              return {
                ...prev,
                [participant.identity]: {
                  ...current,
                  camera: !isScreen ? remoteVidTrack : current.camera,
                  screen: isScreen ? remoteVidTrack : current.screen,
                },
              };
            });
          }
        };

        const handleTrackUnsubscribed = (
          track: RemoteTrack,
          publication: RemoteTrackPublication,
          participant: RemoteParticipant
        ) => {
          if (track.kind === Track.Kind.Video) {
            const isScreen = publication.source === Track.Source.ScreenShare || track.source === Track.Source.ScreenShare;
            setParticipantTracks((prev) => {
              const current = prev[participant.identity] || {};
              const nextParticipant = {
                ...current,
                camera: !isScreen ? undefined : current.camera,
                screen: isScreen ? undefined : current.screen,
              };
              return {
                ...prev,
                [participant.identity]: nextParticipant,
              };
            });
          }
        };

        const handleParticipantDisconnected = (participant: RemoteParticipant) => {
          setRemoteTracks((prev) => {
            const next = { ...prev };
            delete next[participant.identity];
            return next;
          });
          setParticipantTracks((prev) => {
            const next = { ...prev };
            delete next[participant.identity];
            return next;
          });
        };

        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

        cleanupRoom = () => {
          room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
          room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
          room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
          room.disconnect();
        };

        const tokenData = await fetchWithAuth<LiveKitTokenResponse>('/api/v1/livekit/tokens', {
          method: 'POST',
          body: JSON.stringify({ room_id: roomId }),
        });

        if (isCancelled) {
          room.disconnect();
          return;
        }

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
            console.warn('Lỗi bật camera qua LiveKit:', camErr);
            setErrorMsg('Không thể truy cập Camera trình duyệt (Vui lòng tắt các ứng dụng đang chiếm webcam như Meet/Zoom và cấp quyền).');
          }
        } else {
          // Nạp các track video đã có sẵn từ sinh viên đang phát trước đó
          const initialMap: Record<string, RemoteVideoTrack> = {};
          const initialParticipants: Record<string, ParticipantTracks> = {};

          room.remoteParticipants.forEach((participant) => {
            const pTrackObj: ParticipantTracks = {};
            participant.videoTrackPublications.forEach((pub) => {
              if (pub.isSubscribed && pub.videoTrack && pub.videoTrack.kind === Track.Kind.Video) {
                const vidTrack = pub.videoTrack as RemoteVideoTrack;
                const isScreen = pub.source === Track.Source.ScreenShare;
                if (isScreen) {
                  pTrackObj.screen = vidTrack;
                } else {
                  pTrackObj.camera = vidTrack;
                }
                initialMap[participant.identity] = vidTrack;
              }
            });
            if (pTrackObj.camera || pTrackObj.screen) {
              initialParticipants[participant.identity] = pTrackObj;
            }
          });

          if (Object.keys(initialMap).length > 0) {
            setRemoteTracks(initialMap);
          }
          if (Object.keys(initialParticipants).length > 0) {
            setParticipantTracks(initialParticipants);
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
      if (cleanupRoom) {
        cleanupRoom();
      }
      roomRef.current = null;
      setLocalVideoTrack(null);
      setLocalScreenTrack(null);
      setIsScreenSharing(false);
      setRemoteTracks({});
      setParticipantTracks({});
      setConnectionState('idle');
    };
  }, [roomId, mode, enabled]);

  return {
    connectionState,
    errorMsg,
    localVideoTrack,
    localScreenTrack,
    isScreenSharing,
    enableScreenShare,
    disableScreenShare,
    toggleCamera,
    remoteTracks,
    participantTracks,
    room: roomRef.current,
  };
}

