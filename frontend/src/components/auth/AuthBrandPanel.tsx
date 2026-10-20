import { Eye, ShieldCheck, Sparkles } from 'lucide-react';

type AuthBrandPanelProps = {
  variant?: 'compact' | 'detailed';
};

export default function AuthBrandPanel({
  variant = 'compact',
}: AuthBrandPanelProps) {
  if (variant === 'detailed') {
    return (
      <section className="relative flex w-full shrink-0 flex-col justify-between overflow-hidden bg-[#1a253a] p-8 text-white sm:p-12 lg:w-[40%]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
            <Eye className="h-6 w-6 text-white" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-2xl font-black tracking-tight text-transparent">
                Oculide
              </span>
              <span className="rounded-full border border-blue-400/30 bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                v1.0
              </span>
            </div>
            <p className="text-xs font-medium text-slate-400">AI Proctoring &amp; Lab LMS</p>
          </div>
        </div>

        <div className="relative z-10 my-8 text-center lg:my-auto lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-800/80 px-3 py-1 text-xs text-blue-300 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
            <span>Chuẩn đặc tả IEEE 830-1998</span>
          </div>

          <h1 className="mb-4 text-2xl font-extrabold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl">
            Giám sát phòng thi &amp;<br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              {' '}Thực hành lập trình AI
            </span>
          </h1>

          <p className="mx-auto max-w-md text-sm font-normal leading-relaxed text-slate-300/90 sm:text-base lg:mx-0">
            Minh bạch, trực quan và bảo mật. Tự động hóa đánh giá năng lực lập trình và phát hiện bất thường bằng Trí tuệ Nhân tạo.
          </p>

          <div className="mx-auto mt-8 hidden max-w-sm space-y-3 text-left sm:block lg:mx-0">
            {[
              'Giám sát đa luồng qua LiveKit WebRTC SFU',
              'Chấm điểm code tự động trong Docker Sandbox cô lập',
              'Phát hiện gian lận bằng YOLOv8 & MediaPipe',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-xs text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400" aria-hidden="true">
                  ✓
                </span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 hidden border-t border-slate-800/80 pt-4 text-xs text-slate-400 lg:block">
          <p>© 2026 Oculide System. Nghiên cứu khoa học &amp; Ứng dụng.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-[#10203d] px-6 py-7 text-white sm:px-10 sm:py-10 lg:min-h-screen lg:px-16 lg:py-16">
      <div
        aria-hidden="true"
        className="absolute -left-28 top-1/4 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl"
      />

      <div className="relative z-10 flex items-center gap-3.5">
        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#2468f2] shadow-lg shadow-blue-950/20">
          <Eye className="h-6 w-6" strokeWidth={2.3} aria-hidden="true" />
        </div>
        <span className="text-[26px] font-extrabold tracking-tight">OCULIDE</span>
      </div>

      <div className="relative z-10 mt-16 max-w-[500px] sm:mt-20 lg:mt-[176px]">
        <h1 className="text-[29px] font-extrabold leading-[1.3] tracking-[-0.02em] sm:text-4xl">
          Hệ thống giám sát học tập và kiểm tra lập trình trực tuyến
        </h1>
        <div className="mt-8 space-y-3 text-sm leading-6 text-[#c8d5ea]">
          <p>Một tài khoản do nhà trường cấp.</p>
          <p>Truy cập chức năng theo vai trò được phân công.</p>
        </div>
      </div>

      <div className="relative z-10 mt-10 hidden items-center gap-2 text-xs text-slate-400 lg:absolute lg:bottom-16 lg:left-16 lg:flex">
        <ShieldCheck className="h-4 w-4 text-blue-400" aria-hidden="true" />
        <span>Kết nối được bảo mật bởi Oculide</span>
      </div>
    </section>
  );
}
