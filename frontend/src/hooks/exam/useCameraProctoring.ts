import { useCallback, useEffect, useState, RefObject } from 'react';

interface UseCameraProctoringOptions {
  localVideoTrack: any;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  isCameraOffAllowed: boolean;
  isUserCameraOff: boolean;
  setIsUserCameraOff: (v: boolean) => void;
  toggleCamera: (enable?: boolean) => Promise<boolean | void>;
  reattachKey?: unknown;
}

/**
 * Custom hook quản lý vòng đời webcam dự phòng và đồng bộ LiveKit video track.
 */
export function useCameraProctoring({
  localVideoTrack,
  localVideoRef,
  isCameraOffAllowed,
  isUserCameraOff,
  setIsUserCameraOff,
  toggleCamera,
  reattachKey,
}: UseCameraProctoringOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const isCameraOn = Boolean((localVideoTrack || localStream) && !isUserCameraOff);

  const handleToggleCamera = useCallback(
    async (forceEnable?: boolean) => {
      const target = forceEnable !== undefined ? forceEnable : !isCameraOn;
      if (!target) {
        setIsUserCameraOff(true);
        if (localStream) {
          localStream.getTracks().forEach((t) => t.stop());
          setLocalStream(null);
        }
        await toggleCamera(false);
      } else {
        setIsUserCameraOff(false);
        await toggleCamera(true);
      }
    },
    [isCameraOn, localStream, setIsUserCameraOff, toggleCamera]
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    async function initCamera() {
      if (localVideoTrack) return;
      if (isCameraOffAllowed && isUserCameraOff) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!isCancelled) {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(() => {});
          }
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch (err) {
        console.warn('Không thể mở webcam dự phòng:', err);
      }
    }

    if (!localVideoTrack && !(isCameraOffAllowed && isUserCameraOff)) {
      initCamera();
    }

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [localVideoTrack, isCameraOffAllowed, isUserCameraOff, localVideoRef]);

  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (!videoEl) return;
    if (localVideoTrack) {
      localVideoTrack.attach(videoEl);
      return () => {
        localVideoTrack.detach(videoEl);
      };
    } else if (localStream) {
      videoEl.srcObject = localStream;
      videoEl.play().catch(() => {});
    }
  }, [localVideoTrack, localStream, localVideoRef, reattachKey]);

  return {
    localStream,
    setLocalStream,
    isCameraOn,
    handleToggleCamera,
  };
}
