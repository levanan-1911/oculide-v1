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
  initialCameraEnabled?: boolean;
}

export function useLiveKitRoom({
  roomId,
  mode,
  enabled = true,
  initialCameraEnabled = true,
}: UseLiveKitRoomOptions) {
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [localScreenTrack, setLocalScreenTrack] = useState<LocalVideoTrack | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteTracks, setRemoteTracks] = useState<Record<string, RemoteVideoTrack>>({});
  const [participantTracks, setParticipantTracks] = useState<Record<string, ParticipantTracks>>({});
  const roomRef = useRef<LiveKitRoom | null>(null);
  const nativeScreenStreamRef = useRef<MediaStream | null>(null);

  const enableScreenShare = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Trình duyệt không hỗ trợ chia sẻ màn hình hoặc trang không chạy trên HTTPS/localhost.');
    }

    if (roomRef.current && (roomRef.current.state === 'connected' || connectionState === 'connected')) {
      try {
        const { Track } = await import('livekit-client');
        await roomRef.current.localParticipant.setScreenShareEnabled(true, {
          audio: false,
          resolution: { width: 1920, height: 1080, frameRate: 15 },
        });
        const pub = roomRef.current.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        if (pub?.videoTrack) {
          const vTrack = pub.videoTrack as LocalVideoTrack;
          setLocalScreenTrack(vTrack);
          setIsScreenSharing(true);
          if (vTrack.mediaStreamTrack) {
            vTrack.mediaStreamTrack.onended = () => {
              setIsScreenSharing(false);
              setLocalScreenTrack(null);
            };
          }
          return true;
        }
        setIsScreenSharing(true);
        return true;
      } catch (err: any) {
        console.warn('Lỗi khi kích hoạt chia sẻ màn hình LiveKit:', err);
        return false;
      }
    }

    // Fallback khi LiveKit chưa kết nối xong hoặc không khả dụng: vẫn xin quyền chia sẻ màn hình trực tiếp từ trình duyệt
    try {
      if (nativeScreenStreamRef.current) {
        nativeScreenStreamRef.current.getTracks().forEach((t) => t.stop());
        nativeScreenStreamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      nativeScreenStreamRef.current = stream;
      setIsScreenSharing(true);
      videoTrack.onended = () => {
        setIsScreenSharing(false);
        nativeScreenStreamRef.current = null;
      };
      return true;
    } catch (err: any) {
      console.warn('Lỗi khi kích hoạt chia sẻ màn hình trình duyệt:', err);
      return false;
    }
  }, [connectionState]);

  const disableScreenShare = useCallback(async () => {
    if (nativeScreenStreamRef.current) {
      nativeScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      nativeScreenStreamRef.current = null;
    }
    if (!roomRef.current) {
      setLocalScreenTrack(null);
      setIsScreenSharing(false);
      return;
    }
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

        const handleLocalTrackUnpublished = (publication: any) => {
          if (publication.source === Track.Source.ScreenShare) {
            setIsScreenSharing(false);
            setLocalScreenTrack(null);
          }
        };

        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
        room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

        cleanupRoom = () => {
          room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
          room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
          room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
          room.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
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
          if (nativeScreenStreamRef.current) {
            const existingScreenTrack = nativeScreenStreamRef.current.getVideoTracks()[0];
            if (existingScreenTrack && existingScreenTrack.readyState === 'live') {
              try {
                await room.localParticipant.publishTrack(existingScreenTrack, {
                  source: Track.Source.ScreenShare,
                  name: 'screen',
                });
                const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
                if (pub?.videoTrack) {
                  setLocalScreenTrack(pub.videoTrack as LocalVideoTrack);
                  setIsScreenSharing(true);
                }
              } catch (pubErr) {
                console.warn('Không thể publish lại luồng chia sẻ màn hình có sẵn:', pubErr);
              }
            }
          }
          if (initialCameraEnabled !== false) {
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
                const isScreen =
                  pub.source === Track.Source.ScreenShare ||
                  String(pub.trackName || '').toLowerCase().includes('screen');
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
  }, [roomId, mode, enabled, initialCameraEnabled]);

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

