'use client';

import React, { useEffect, useRef } from 'react';
import { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';

interface LiveKitVideoFeedProps {
  track: LocalVideoTrack | RemoteVideoTrack | null | undefined;
  muted?: boolean;
  className?: string;
}

export default function LiveKitVideoFeed({
  track,
  muted = true,
  className = 'h-full w-full object-cover',
}: LiveKitVideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!track || !el) return;

    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  if (!track) return null;

  return <video ref={videoRef} autoPlay playsInline muted={muted} className={className} />;
}
