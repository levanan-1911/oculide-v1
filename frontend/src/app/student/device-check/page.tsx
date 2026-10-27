
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Circle,
  Expand,
  LoaderCircle,
  Monitor,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react";

import StudentSidebar from "@/components/student/StudentSidebar";
import StudentTopbar from "@/components/student/StudentTopbar";

type CheckStatus = "idle" | "checking" | "success" | "error";

export default function DeviceCheckPage() {
  const [cameraStatus, setCameraStatus] = useState<CheckStatus>("idle");
  const [networkStatus, setNetworkStatus] = useState<CheckStatus>("idle");
  const [screenStatus, setScreenStatus] = useState<CheckStatus>("idle");
  const [cameraMessage, setCameraMessage] = useState(
    "Chưa kiểm tra quyền truy cập webcam.",
  );
  const [screenMessage, setScreenMessage] = useState(
    "Chưa kiểm tra chia sẻ màn hình.",
  );
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  async function checkCamera() {
    setCameraStatus("checking");
    setCameraMessage("Đang yêu cầu quyền truy cập webcam...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Trình duyệt không hỗ trợ webcam hoặc trang không chạy trên HTTPS/localhost.",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      cameraStream?.getTracks().forEach((track) => track.stop());
      setCameraStream(stream);
      setCameraStatus("success");
      setCameraMessage("Webcam đã hoạt động và được cấp quyền.");
    } catch (error) {
      setCameraStatus("error");
      setCameraMessage(
        error instanceof Error
          ? error.message
          : "Không thể truy cập webcam. Hãy kiểm tra quyền thiết bị.",
      );
    }
  }

  function checkNetwork() {
    if (!navigator.onLine) {
      setNetworkStatus("error");
      return;
    }

    setNetworkStatus("success");
  }

  async function checkScreenSharing() {
    setScreenStatus("checking");
    setScreenMessage("Vui lòng chọn màn hình để chia sẻ.");

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error(
          "Trình duyệt không hỗ trợ chia sẻ màn hình. Hãy sử dụng Chrome hoặc Edge.",
        );
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStream?.getTracks().forEach((track) => track.stop());
      setScreenStream(stream);
      setScreenStatus("success");
      setScreenMessage("Đã cấp quyền chia sẻ màn hình.");

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setScreenStatus("error");
        setScreenMessage("Chia sẻ màn hình đã dừng. Hãy kiểm tra lại.");
        setScreenStream(null);
      });
    } catch (error) {
      setScreenStatus("error");
      setScreenMessage(
        error instanceof Error
          ? error.message
          : "Chưa thể chia sẻ màn hình.",
      );
    }
  }

  function enterFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {
      setScreenMessage("Không thể bật toàn màn hình. Hãy thử lại.");
    });
  }

  const allReady =
    cameraStatus === "success" &&
    networkStatus === "success" &&
    screenStatus === "success";

  function statusIcon(status: CheckStatus) {
    if (status === "success") {
      return <CheckCircle2 size={20} className="text-emerald-600" />;
    }

    if (status === "error") {
      return <XCircle size={20} className="text-red-600" />;
    }

    if (status === "checking") {
      return (
        <LoaderCircle
          size={20}
          className="animate-spin text-blue-600"
        />
      );
    }

    return <Circle size={20} className="text-slate-300" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <StudentSidebar />

      <div className="min-w-0 flex-1">
        <StudentTopbar />

      <main className="w-full space-y-6 px-5 py-6 sm:px-7 lg:px-8">
          <div>
            <Link
              href="/student/exams"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700"
            >
              <ArrowLeft size={16} />
              Quay lại phòng thi
            </Link>

            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              Kiểm tra thiết bị
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Kiểm tra webcam, kết nối mạng và chia sẻ màn hình trước khi
              chuyển sang phòng chờ.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={23}
                className="mt-0.5 shrink-0 text-blue-700"
              />
              <div>
                <h3 className="font-semibold text-blue-900">
                  Yêu cầu trước khi vào thi
                </h3>
                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Hãy hoàn thành các bước kiểm tra. Nếu webcam hoặc chia sẻ
                  màn hình chưa được cấp quyền, hãy kiểm tra cài đặt quyền
                  riêng tư của trình duyệt.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Camera size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Webcam</h3>
                  <p className="text-sm text-slate-500">
                    Kiểm tra quyền truy cập camera
                  </p>
                </div>
                <div className="ml-auto">
                  {statusIcon(cameraStatus)}
                </div>
              </div>

              <div className="mt-5 flex min-h-40 items-center justify-center overflow-hidden rounded-xl bg-slate-900">
                {cameraStream ? (
                  <video
                    autoPlay
                    muted
                    playsInline
                    ref={(video) => {
                      if (video && video.srcObject !== cameraStream) {
                        video.srcObject = cameraStream;
                      }
                    }}
                    className="max-h-64 w-full object-contain"
                  />
                ) : (
                  <div className="px-5 py-8 text-center text-slate-300">
                    <Camera size={34} className="mx-auto mb-3 opacity-70" />
                    <p className="text-sm">Chưa có hình ảnh webcam</p>
                  </div>
                )}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {cameraMessage}
              </p>

              <button
                type="button"
                onClick={checkCamera}
                className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {cameraStatus === "success"
                  ? "Kiểm tra lại webcam"
                  : "Kiểm tra webcam"}
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Wifi size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    Kết nối mạng
                  </h3>
                  <p className="text-sm text-slate-500">
                    Kiểm tra trạng thái kết nối hiện tại
                  </p>
                </div>
                <div className="ml-auto">
                  {statusIcon(networkStatus)}
                </div>
              </div>

              <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-xl bg-slate-50 p-5 text-center">
                <Wifi
                  size={40}
                  className={
                    networkStatus === "success"
                      ? "text-emerald-600"
                      : "text-slate-300"
                  }
                />
                <p className="mt-3 font-semibold text-slate-800">
                  {networkStatus === "success"
                    ? "Trình duyệt đang có kết nối mạng"
                    : "Chưa kiểm tra kết nối"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Kiểm tra online/offline của trình duyệt
                </p>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Kiểm tra này chỉ xác nhận trình duyệt đang online, chưa đo
                tốc độ mạng hoặc độ ổn định tới máy chủ thi.
              </p>

              <button
                type="button"
                onClick={checkNetwork}
                className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Kiểm tra kết nối
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <Monitor size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    Chia sẻ màn hình
                  </h3>
                  <p className="text-sm text-slate-500">
                    Cấp quyền chia sẻ màn hình
                  </p>
                </div>
                <div className="ml-auto">
                  {statusIcon(screenStatus)}
                </div>
              </div>

              <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-xl bg-slate-50 p-5 text-center">
                <Monitor
                  size={40}
                  className={
                    screenStatus === "success"
                      ? "text-emerald-600"
                      : "text-slate-300"
                  }
                />
                <p className="mt-3 font-semibold text-slate-800">
                  {screenStatus === "success"
                    ? "Đã cấp quyền chia sẻ"
                    : "Chưa chia sẻ màn hình"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Chọn màn hình hoặc cửa sổ theo yêu cầu của trình duyệt
                </p>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Khi trình duyệt hiện hộp thoại, hãy chọn nguồn màn hình phù
                hợp và xác nhận chia sẻ.
              </p>

              <button
                type="button"
                onClick={checkScreenSharing}
                className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Kiểm tra chia sẻ màn hình
              </button>

              {screenStream && (
                <button
                  type="button"
                  onClick={() => {
                    screenStream.getTracks().forEach((track) => track.stop());
                    setScreenStream(null);
                    setScreenStatus("idle");
                    setScreenMessage("Chia sẻ màn hình đã dừng.");
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Dừng chia sẻ
                </button>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <Expand size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    Chế độ toàn màn hình
                  </h3>
                  <p className="text-sm text-slate-500">
                    Chuẩn bị không gian làm bài
                  </p>
                </div>
              </div>

              <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-xl bg-slate-50 p-5 text-center">
                <Expand size={40} className="text-slate-300" />
                <p className="mt-3 font-semibold text-slate-800">
                  Bật toàn màn hình
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Trình duyệt có thể yêu cầu thao tác trực tiếp từ bạn
                </p>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Đây là thao tác hỗ trợ. Hệ thống chưa theo dõi trạng thái
                fullscreen liên tục ở bước này.
              </p>

              <button
                type="button"
                onClick={enterFullscreen}
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Bật toàn màn hình
              </button>
            </section>
          </div>

          <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
            <div>
              <div className="flex items-center gap-2">
                {allReady ? (
                  <CheckCircle2
                    size={22}
                    className="text-emerald-600"
                  />
                ) : (
                  <Circle size={22} className="text-slate-300" />
                )}
                <h3 className="font-bold text-slate-900">
                  {allReady
                    ? "Đã hoàn thành các bước kiểm tra"
                    : "Chưa hoàn thành kiểm tra thiết bị"}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {allReady
                  ? "Bạn có thể chuyển sang giao diện phòng chờ mô phỏng."
                  : "Hãy kiểm tra webcam, mạng và chia sẻ màn hình trước khi tiếp tục."}
              </p>
            </div>

            <Link
              href={allReady ? "/student/waiting-room" : "#device-check"}
              onClick={(event) => {
                if (!allReady) {
                  event.preventDefault();
                  document
                    .querySelector("main")
                    ?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              aria-disabled={!allReady}
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
                allReady
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              Vào phòng chờ
              <ArrowRight size={17} />
            </Link>
          </section>

          <p className="text-xs leading-5 text-slate-400">
            Lưu ý: Đây là bước kiểm tra phía trình duyệt. Xác thực điều kiện
            dự thi, ghi nhận sự kiện giám sát và cho phép vào phòng thi thật
            cần được Backend xử lý. Camera và màn hình chia sẻ nên được dừng
            khi rời trang.
          </p>
        </main>
      </div>
    </div>
  );
}
