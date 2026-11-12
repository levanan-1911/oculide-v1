'use client';

import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, LoaderCircle, MessageSquare, RefreshCw, Send, Wifi, WifiOff } from 'lucide-react';

type ConnectionState = 'loading' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

interface RoomLookupResponse {
  room_id: number;
  room_code: string;
}

interface ChatApiMessage {
  message_id: number;
  room_id: number;
  sender_id: number;
  sender_name?: string | null;
  message_content: string;
  message_type?: string;
  is_private?: boolean;
  recipient_id?: number | null;
  sent_at: string;
}

interface ChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  content: string;
  sentAt: string;
  messageType: string;
}

interface StoredUser {
  user_id?: number | string;
  id?: number | string;
  full_name?: string;
  name?: string;
  role?: string;
}

interface InstructorRoomChatProps {
  roomCode: string;
}

const getApiBase = () => (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

const getWebSocketBase = () => {
  const configuredWs = process.env.NEXT_PUBLIC_WS_URL;
  if (configuredWs) return configuredWs.replace(/\/$/, '');

  const configuredApi = process.env.NEXT_PUBLIC_API_URL;
  if (configuredApi) {
    return configuredApi.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:').replace(/\/$/, '');
  }

  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:8000`;
};

const decodeTokenPayload = (token: string): Record<string, unknown> => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(normalized)) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const toChatMessage = (message: ChatApiMessage): ChatMessage => ({
  id: String(message.message_id),
  senderId: Number(message.sender_id),
  senderName: message.sender_name || 'Thành viên phòng',
  content: message.message_content,
  sentAt: message.sent_at,
  messageType: message.message_type || 'text',
});

const formatMessageTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default function InstructorRoomChat({ roomCode }: InstructorRoomChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [connectionMessage, setConnectionMessage] = useState('Đang tải lịch sử trò chuyện...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<HTMLInputElement | null>(null);
  const senderIdRef = useRef<number | null>(null);
  const senderNameRef = useRef('Giảng viên');

  useEffect(() => {
    if (!roomCode.trim()) {
      setConnectionState('error');
      setErrorMessage('Không xác định được mã phòng giám sát.');
      return;
    }

    let isDisposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let heartbeatTimer: number | null = null;
    let roomId: number | null = null;
    let accessToken = '';
    let reconnectAttempts = 0;

    const stopTimers = () => {
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
      reconnectTimer = null;
      heartbeatTimer = null;
    };

    const appendRealtimeMessage = (data: Record<string, unknown>) => {
      const rawContent = typeof data.message === 'string' ? data.message : '';
      if (!rawContent.trim()) return;

      const rawId = data.message_id;
      const id = rawId === null || rawId === undefined
        ? `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        : String(rawId);
      const parsedSenderId = Number(data.sender_id);
      const nextMessage: ChatMessage = {
        id,
        senderId: Number.isFinite(parsedSenderId) ? parsedSenderId : -1,
        senderName: typeof data.sender_name === 'string' && data.sender_name.trim()
          ? data.sender_name
          : 'Thành viên phòng',
        content: rawContent,
        sentAt: new Date().toISOString(),
        messageType: 'text',
      };

      setMessages((current) => {
        if (current.some((item) => item.id === id)) return current;
        return [...current, nextMessage].slice(-100);
      });
    };

    const connectSocket = () => {
      if (isDisposed || roomId === null || !accessToken || senderIdRef.current === null) return;

      setConnectionState(reconnectAttempts === 0 ? 'connecting' : 'reconnecting');
      setConnectionMessage(reconnectAttempts === 0 ? 'Đang kết nối chat phòng...' : 'Đang kết nối lại...');

      const wsBase = getWebSocketBase();
      if (!wsBase) {
        setConnectionState('error');
        setErrorMessage('Chưa cấu hình địa chỉ WebSocket cho hệ thống chat.');
        return;
      }

      const wsUrl = `${wsBase}/ws/${roomId}/proctor_${senderIdRef.current}?token=${encodeURIComponent(accessToken)}`;
      socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (isDisposed) return;
        reconnectAttempts = 0;
        setConnectionState('connected');
        setConnectionMessage('Đã kết nối với phòng');
        setErrorMessage(null);
        heartbeatTimer = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 25000);
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        if (isDisposed) return;
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          if (data.type === 'chat_message') {
            appendRealtimeMessage(data);
          } else if (data.type === 'error' && typeof data.message === 'string') {
            setErrorMessage(data.message);
          }
        } catch {
          // Bỏ qua gói tin không phải JSON hoặc không thuộc luồng chat.
        }
      };

      socket.onerror = () => {
        if (!isDisposed) {
          setConnectionState('reconnecting');
          setConnectionMessage('Kết nối không ổn định, đang thử lại...');
        }
      };

      socket.onclose = (event: CloseEvent) => {
        stopTimers();
        if (socketRef.current === socket) socketRef.current = null;
        if (isDisposed) return;

        if (event.code === 1008) {
          setConnectionState('error');
          setConnectionMessage('Không thể kết nối chat phòng');
          setErrorMessage(event.reason || 'Phiên đăng nhập hoặc quyền truy cập phòng không hợp lệ.');
          return;
        }

        setConnectionState('disconnected');
        setConnectionMessage('Mất kết nối. Đang thử kết nối lại...');
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(connectSocket, Math.min(10000, 2000 + reconnectAttempts * 1000));
      };
    };

    const initialize = async () => {
      setConnectionState('loading');
      setErrorMessage(null);
      setConnectionMessage('Đang xác thực và tải lịch sử trò chuyện...');

      try {
        accessToken = window.localStorage.getItem('oculide_token') || '';
        if (!accessToken) {
          throw new Error('Bạn cần đăng nhập lại để sử dụng chat phòng.');
        }

        let storedUser: StoredUser = {};
        try {
          storedUser = JSON.parse(window.localStorage.getItem('oculide_user') || '{}') as StoredUser;
        } catch {
          storedUser = {};
        }

        const tokenPayload = decodeTokenPayload(accessToken);
        const rawUserId = storedUser.user_id ?? storedUser.id ?? tokenPayload.user_id ?? tokenPayload.sub;
        const senderId = Number(rawUserId);
        if (!Number.isInteger(senderId) || senderId <= 0) {
          throw new Error('Không xác định được tài khoản giảng viên. Vui lòng đăng nhập lại.');
        }
        senderIdRef.current = senderId;
        senderNameRef.current = storedUser.full_name || storedUser.name || String(tokenPayload.full_name || 'Giảng viên');

        const apiBase = getApiBase();
        const roomResponse = await fetch(
          `${apiBase}/api/v1/rooms/public/${encodeURIComponent(roomCode)}`,
          { method: 'GET', cache: 'no-store' }
        );
        const roomData = await roomResponse.json().catch(() => ({})) as Partial<RoomLookupResponse> & { detail?: string };
        if (!roomResponse.ok || !Number.isInteger(Number(roomData.room_id))) {
          throw new Error(roomData.detail || `Không tìm thấy phòng ${roomCode} trên máy chủ.`);
        }

        roomId = Number(roomData.room_id);
        if (isDisposed) return;

        const historyResponse = await fetch(`${apiBase}/api/v1/chat/room/${roomId}?limit=50`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        if (!historyResponse.ok) {
          const historyError = await historyResponse.json().catch(() => ({})) as { detail?: string };
          throw new Error(historyError.detail || 'Không tải được lịch sử chat của phòng.');
        }

        const history = await historyResponse.json() as ChatApiMessage[];
        if (isDisposed) return;
        setMessages(Array.isArray(history) ? history.map(toChatMessage) : []);
        connectSocket();
      } catch (error) {
        if (isDisposed) return;
        setConnectionState('error');
        setConnectionMessage('Chat phòng chưa sẵn sàng');
        setErrorMessage(error instanceof Error ? error.message : 'Không thể kết nối chat phòng.');
      }
    };

    void initialize();

    return () => {
      isDisposed = true;
      stopTimers();
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [roomCode, retryKey]);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const handleSendMessage = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isSending) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setErrorMessage('Chat đang mất kết nối. Vui lòng đợi kết nối lại trước khi gửi.');
      setConnectionState('disconnected');
      return;
    }

    setIsSending(true);
    try {
      socket.send(JSON.stringify({
        type: 'chat_message',
        message,
        recipient_id: null,
        sender_name: senderNameRef.current,
      }));
      setDraft('');
      setErrorMessage(null);
      window.setTimeout(() => setIsSending(false), 250);
      draftRef.current?.focus();
    } catch {
      setErrorMessage('Không gửi được tin nhắn. Vui lòng thử lại.');
      setIsSending(false);
    }
  }, [draft, isSending]);

  const isConnected = connectionState === 'connected';

  return (
    <section className="flex min-h-[440px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#121824]">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-white/10">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
            <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Chat phòng
          </h3>
          <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">{roomCode}</p>
        </div>
        <div className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${
          isConnected
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
            : connectionState === 'error'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
        }`}>
          {isConnected ? <Wifi className="h-3 w-3" /> : connectionState === 'error' ? <WifiOff className="h-3 w-3" /> : <LoaderCircle className="h-3 w-3 animate-spin" />}
          {isConnected ? 'Trực tuyến' : connectionState === 'error' ? 'Lỗi kết nối' : 'Đang kết nối'}
        </div>
      </header>

      <div ref={messageListRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50/70 p-3 dark:bg-white/[0.03]">
        {connectionState === 'loading' && messages.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-center text-xs text-slate-500 dark:text-slate-400">
            <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
            {connectionMessage}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Chưa có tin nhắn</p>
            <p className="max-w-[220px] text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              Gửi tin nhắn đầu tiên để trao đổi với sinh viên trong phòng.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === senderIdRef.current;
            return (
              <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-xl px-2.5 py-2 ${
                  isMine
                    ? 'rounded-br-sm bg-blue-600 text-white'
                    : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-[#1b2636] dark:text-slate-100'
                }`}>
                  {!isMine && (
                    <p className="mb-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">{message.senderName}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{message.content}</p>
                  <p className={`mt-1 text-right font-mono text-[9px] ${isMine ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    {formatMessageTime(message.sentAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {errorMessage && (
        <div className="flex items-start gap-1.5 border-t border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="min-w-0 flex-1">{errorMessage}</span>
          {connectionState === 'error' && (
            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="inline-flex shrink-0 items-center gap-1 font-bold text-amber-900 hover:underline dark:text-amber-100"
            >
              <RefreshCw className="h-3 w-3" /> Thử lại
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-[#121824]">
        <input
          ref={draftRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={1000}
          placeholder={isConnected ? 'Nhập tin nhắn cho cả phòng...' : 'Đang chờ kết nối...'}
          disabled={!isConnected || isSending}
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          aria-label="Nội dung tin nhắn"
        />
        <button
          type="submit"
          disabled={!isConnected || !draft.trim() || isSending}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          aria-label="Gửi tin nhắn"
          title="Gửi tin nhắn"
        >
          {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </section>
  );
}
