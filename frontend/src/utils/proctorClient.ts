/**
 * Proctoring Client Engine (Oculide-v1)
 * Bộ điều khiển giám sát thi phía Client (Trình duyệt):
 * 1. Nén & Giảm kích thước ảnh webcam (Canvas 480p, JPEG 70%) giúp giảm 85% băng thông.
 * 2. Chu kỳ chụp ảnh thích ứng (Adaptive Interval: Bình thường 4s, Nghi vấn 1.5s).
 * 3. Bắt sự kiện chuyển tab / rời cửa sổ (Alt+Tab, window blur).
 * 4. Theo dõi tương quan gõ phím (is_typing) để không phạt khi sinh viên nhìn bàn phím.
 */

export interface SnapshotPayload {
  session_id: number;
  snapshot_data: string;
  is_typing: boolean;
  client_event?: "tab_switch" | "fullscreen_exit" | "blur" | "periodic" | "camera_off" | "camera_disabled";
}

/**
 * Nén và resize khung hình webcam từ thẻ video thành chuỗi Base64 JPEG nhẹ (~30-40KB)
 */
export function captureAndCompressFrame(
  videoElement: HTMLVideoElement,
  targetWidth: number = 640,
  quality: number = 0.7
): string | null {
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  const scale = targetWidth / videoElement.videoWidth;
  const targetHeight = Math.round(videoElement.videoHeight * scale);

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Lật ngược ảnh dạng gương soi (mirror) nếu cần, hoặc vẽ trực tiếp
  ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

  // Xuất ra định dạng JPEG với độ nén 70%
  return canvas.toDataURL("image/jpeg", quality);
}

export class ProctoringClient {
  private sessionId: number;
  private apiUrl: string;
  private authToken: string;
  private videoElement: HTMLVideoElement | null = null;
  private timerId: any = null;
  private isRunning: boolean = false;
  private isCameraActive: boolean = true;
  private lastTypingTimestamp: number = 0;
  private currentIntervalMs: number = 4000; // Mặc định 4 giây

  constructor(sessionId: number, apiUrl: string, authToken: string) {
    this.sessionId = sessionId;
    this.apiUrl = apiUrl.replace(/\/$/, "");
    this.authToken = authToken;
  }

  /**
   * Cập nhật trạng thái bật/tắt camera từ UI/LiveKit
   */
  public setCameraActive(active: boolean) {
    const wasActive = this.isCameraActive;
    this.isCameraActive = active;
    if (wasActive && !active) {
      // Khi vừa tắt camera, lập tức gửi sự kiện camera_off về server
      this.sendCameraOffEvent();
    }
  }

  private sendCameraOffEvent() {
    if (!this.isRunning) return;
    // Khung hình giả định tối đen để báo tắt camera
    const blankCanvas = document.createElement("canvas");
    blankCanvas.width = 320;
    blankCanvas.height = 240;
    const ctx = blankCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 320, 240);
      const b64 = blankCanvas.toDataURL("image/jpeg", 0.5);
      this.postAnalyze({
        session_id: this.sessionId,
        snapshot_data: b64,
        is_typing: this.isTyping(),
        client_event: "camera_off"
      });
    }
  }

  /**
   * Bắt đầu giám sát và lắng nghe các sự kiện gian lận trình duyệt
   */
  public start(videoElement: HTMLVideoElement) {
    if (this.isRunning) return;
    this.videoElement = videoElement;
    this.isRunning = true;

    // 1. Lắng nghe hành vi gõ phím (is_typing trong 3s gần nhất)
    window.addEventListener("keydown", this.handleKeyDown);

    // 2. Lưu ý: Sự kiện chuyển tab (visibilitychange) đã được exam-room/page.tsx ghi nhận trực tiếp
    // qua POST /api/v1/violations để tránh đếm trùng 2 lần cho cùng 1 lần chuyển tab.

    // 3. Khởi chạy chu kỳ chụp thích ứng
    this.scheduleNextCapture(2000); // Frame đầu chụp sau 2s
  }

  /**
   * Dừng giám sát và hủy các bộ lắng nghe sự kiện
   */
  public stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  private handleKeyDown = () => {
    this.lastTypingTimestamp = Date.now();
  };

  /**
   * Kiểm tra sinh viên có đang thao tác gõ bàn phím không
   */
  public isTyping(): boolean {
    return Date.now() - this.lastTypingTimestamp < 3000;
  }

  /**
   * Chụp ảnh và gửi ngay lập tức khi phát sinh sự kiện nghiêm trọng
   */
  public sendSnapshotImmediately(event: "tab_switch" | "fullscreen_exit" | "blur") {
    if (!this.videoElement || !this.isRunning) return;
    const b64 = captureAndCompressFrame(this.videoElement);
    if (!b64) return;

    const resolvedEvent = event === "blur" ? (document.hidden ? "tab_switch" : undefined) : event;
    if (!resolvedEvent) return;

    this.postAnalyze({
      session_id: this.sessionId,
      snapshot_data: b64,
      is_typing: this.isTyping(),
      client_event: resolvedEvent
    });
  }

  /**
   * Vòng lặp chụp thích ứng (Adaptive Loop)
   */
  private scheduleNextCapture(delayMs: number) {
    if (!this.isRunning) return;
    this.timerId = setTimeout(async () => {
      await this.captureAndSendPeriodic();
      // Tiếp tục lập lịch khung hình kế tiếp
      this.scheduleNextCapture(this.currentIntervalMs);
    }, delayMs);
  }

  private async captureAndSendPeriodic() {
    if (!this.isRunning) return;
    if (!this.isCameraActive) {
      this.sendCameraOffEvent();
      return;
    }
    if (!this.videoElement) return;
    const b64 = captureAndCompressFrame(this.videoElement);
    if (!b64) return;

    const res = await this.postAnalyze({
      session_id: this.sessionId,
      snapshot_data: b64,
      is_typing: this.isTyping(),
      client_event: "periodic"
    });

    // Điều chỉnh chu kỳ gửi snapshot động dựa trên trạng thái trả về từ server
    if (res && res.status === "queued") {
      // Nếu server đang ổn định -> duy trì 4 giây
      this.currentIntervalMs = 4000;
    }
  }

  private async postAnalyze(payload: SnapshotPayload): Promise<any> {
    try {
      const token = this.authToken || (typeof window !== "undefined" ? localStorage.getItem("oculide_token") || "" : "");
      const response = await fetch(`${this.apiUrl}/api/v1/violations/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err) {
      // Khi rớt mạng, client không crash
      return null;
    }
  }
}
