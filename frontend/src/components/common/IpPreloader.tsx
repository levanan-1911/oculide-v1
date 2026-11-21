'use client';

import { useEffect } from 'react';
import { getClientPublicIp } from '@/utils/ipResolver';

export default function IpPreloader() {
  useEffect(() => {
    getClientPublicIp().catch(() => {});
  }, []);
  return null;
}
