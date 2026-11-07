import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any

from core.config import settings

logger = logging.getLogger("email_service")

class EmailService:
    """
    Dịch vụ quản trị và gửi Email cho hệ thống thi trực tuyến Oculide.
    Chuyên trách 2 nhiệm vụ cốt lõi:
    1. Gửi thông tin tài khoả n & mật khẩu khởi tạo / cấp lại cho Sinh viên và Giảng viên.
    2. Gửi liên kết và mã xác thực khôi phục mật khẩu (Forgot Password).
    """

    @classmethod
    def _is_smtp_configured(cls) -> bool:
        """Kiểm tra xem hệ thống đã được cấu hình SMTP chưa"""
        return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)

    @classmethod
    def _send_mime_message(cls, to_email: str, subject: str, html_body: str) -> bool:
        """Thực thi kết nối SMTP và gửi Email HTML"""
        sender_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@oculide.edu.vn"
        sender_name = settings.SMTP_FROM_NAME or "Hệ thống Khảo thí Oculide"

        # Nếu chưa cấu hình SMTP (môi trường Local Dev / Test), ghi log mô phỏng
        if not cls._is_smtp_configured():
            logger.info(
                f"\n==================== [EMAIL MOCK DEV MODE] ====================\n"
                f"Tới: {to_email}\n"
                f"Tiêu đề: {subject}\n"
                f"Ghi chú: Chưa cấu hình SMTP_HOST / SMTP_USER trong .env. Nội dung HTML đã được tạo thành công.\n"
                f"================================================================"
            )
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{sender_name} <{sender_email}>"
            msg["To"] = to_email

            # Đính kèm nội dung HTML
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            port = int(settings.SMTP_PORT or 587)
            if port == 465:
                # SSL trực tiếp
                with smtplib.SMTP_SSL(settings.SMTP_HOST, port, timeout=10) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(sender_email, [to_email], msg.as_string())
            else:
                # STARTTLS (Port 587 phổ biến)
                with smtplib.SMTP(settings.SMTP_HOST, port, timeout=10) as server:
                    if getattr(settings, "SMTP_TLS", True):
                        server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(sender_email, [to_email], msg.as_string())

            logger.info(f"Đã gửi email thành công tới: {to_email}")
            return True
        except Exception as e:
            logger.error(f"Lỗi khi gửi email tới {to_email}: {str(e)}")
            return False

    # ──────────────────────────────────────────────────────────────────────────
    # 1. GỬI TÀI KHOẢN VÀ MẬT KHẨU VỀ CHO TỪNG SINH VIÊN / GIẢNG VIÊN
    # ──────────────────────────────────────────────────────────────────────────
    @classmethod
    def send_account_credentials_email(
        cls,
        to_email: str,
        username: str,
        raw_password: str,
        full_name: str,
        role: str = "student",
        ma_dinh_danh: Optional[str] = None
    ) -> bool:
        """
        Gửi thông tin đăng nhập ban đầu hoặc mật khẩu cấp mới trực tiếp cho Sinh viên / Giảng viên.
        """
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        login_url = f"{frontend_url}/login"

        role_display = "Sinh viên" if role == "student" else ("Giảng viên" if role == "instructor" else "Quản trị viên")
        id_label = "Mã số sinh viên (MSSV)" if role == "student" else "Mã giảng viên (MSGV)"
        id_row = f"""
            <tr>
                <td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">{id_label}:</td>
                <td style="padding: 10px 14px; color: #1e293b; font-family: monospace; font-size: 14px; border-bottom: 1px solid #f1f5f9;">{ma_dinh_danh}</td>
            </tr>
        """ if ma_dinh_danh else ""

        subject = f"[Oculide] Thông tin tài khoản đăng nhập hệ thống khảo thí ({role_display})"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Hệ Thống Khảo Thí Oculide</h1>
                    <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Thông tin kích hoạt tài khoản {role_display}</p>
                </div>

                <!-- Body Content -->
                <div style="padding: 32px 28px;">
                    <p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">
                        Kính chào <strong>{full_name}</strong>,
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                        Tài khoản của bạn trên Hệ thống Khảo thí Trực tuyến Oculide đã được khởi tạo/cấp lại thành công. Dưới đây là thông tin đăng nhập của bạn:
                    </p>

                    <!-- Credentials Box -->
                    <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                        <tr>
                            <td style="padding: 10px 14px; font-weight: bold; color: #475569; width: 40%; border-bottom: 1px solid #f1f5f9;">Email đăng nhập:</td>
                            <td style="padding: 10px 14px; color: #1e293b; font-family: monospace; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">{to_email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #f1f5f9;">Tên đăng nhập (Username):</td>
                            <td style="padding: 10px 14px; color: #1e293b; font-family: monospace; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">{username}</td>
                        </tr>
                        {id_row}
                        <tr>
                            <td style="padding: 10px 14px; font-weight: bold; color: #e11d48; border-bottom: 1px solid #f1f5f9;">Mật khẩu khởi tạo:</td>
                            <td style="padding: 10px 14px; color: #e11d48; font-family: monospace; font-size: 15px; font-weight: 700; border-bottom: 1px solid #f1f5f9;">{raw_password}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 14px; font-weight: bold; color: #475569;">Vai trò:</td>
                            <td style="padding: 10px 14px; color: #1e293b;">{role_display}</td>
                        </tr>
                    </table>

                    <!-- Note on login method -->
                    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                            💡 <strong>Cách thức đăng nhập:</strong> Bạn có thể sử dụng <strong>Email trường</strong> (<code style="background: #dbeafe; padding: 2px 4px; border-radius: 4px;">{to_email}</code>) hoặc <strong>Tên đăng nhập</strong> (<code style="background: #dbeafe; padding: 2px 4px; border-radius: 4px;">{username}</code>) kết hợp cùng mật khẩu trên để đăng nhập. <em>(Hệ thống không sử dụng Mã SV/GV làm thông tin đăng nhập).</em>
                        </p>
                    </div>

                    <!-- Call To Action -->
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{login_url}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block;">
                            Đăng Nhập Vào Hệ Thống
                        </a>
                    </div>

                    <!-- Notice / Security Warning -->
                    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 4px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 13px; color: #b45309; line-height: 1.5;">
                            <strong>Lưu ý bảo mật:</strong> Để đảm bảo tính bảo mật và an toàn cho kỳ thi, bạn sẽ được yêu cầu đổi mật khẩu mới trong lần đăng nhập đầu tiên. Tuyệt đối không chia sẻ mật khẩu này cho người khác.
                        </p>
                    </div>

                    <p style="margin: 0; font-size: 13px; color: #64748b;">
                        Nếu gặp khó khăn khi đăng nhập, vui lòng liên hệ Ban Khảo thí hoặc Quản trị viên phòng máy để được hỗ trợ kịp thời.
                    </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    Email này được gửi tự động từ Hệ thống Khảo thí Oculide. Vui lòng không phản hồi thư này.
                </div>
            </div>
        </body>
        </html>
        """
        return cls._send_mime_message(to_email, subject, html_body)

    # ──────────────────────────────────────────────────────────────────────────
    # 2. GỬI LIÊN KẾT KHÔI PHỤC MẬT KHẨU (FORGOT PASSWORD)
    # ──────────────────────────────────────────────────────────────────────────
    @classmethod
    def send_password_reset_email(
        cls,
        to_email: str,
        reset_token: str,
        full_name: str = "Bạn"
    ) -> bool:
        """
        Gửi liên kết kèm mã Token xác thực 15 phút để người dùng tự đặt lại mật khẩu mới.
        """
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"

        subject = "[Oculide] Yêu cầu khôi phục mật khẩu tài khoản"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Hệ Thống Khảo Thí Oculide</h1>
                    <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Xác nhận yêu cầu đặt lại mật khẩu</p>
                </div>

                <!-- Body Content -->
                <div style="padding: 32px 28px;">
                    <p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">
                        Xin chào <strong>{full_name}</strong>,
                    </p>
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                        Hệ thống đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email <strong>{to_email}</strong>.
                    </p>
                    <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                        Nhấn vào nút bên dưới để tiến hành thiết lập mật khẩu mới:
                    </p>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{reset_link}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block;">
                            Đặt Lại Mật Khẩu Ngay
                        </a>
                    </div>

                    <!-- Expiration Notice -->
                    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 4px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 13px; color: #1d4ed8; line-height: 1.5;">
                            Liên kết này có hiệu lực trong vòng <strong>15 phút</strong> kể từ thời điểm gửi. Sau thời gian này, liên kết sẽ tự động bị vô hiệu hóa vì lý do bảo mật.
                        </p>
                    </div>

                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">
                        Nếu nút trên không thể nhấn vào, bạn có thể sao chép và dán liên kết sau vào thanh địa chỉ trình duyệt:
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 12px; color: #4f46e5; word-break: break-all;">
                        <a href="{reset_link}" style="color: #4f46e5;">{reset_link}</a>
                    </p>

                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">

                    <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                        Nếu bạn <strong>không</strong> yêu cầu đặt lại mật khẩu, xin hãy bỏ qua email này hoặc liên hệ hỗ trợ nếu nghi ngờ tài khoản bị xâm nhập. Mật khẩu hiện tại của bạn vẫn được giữ nguyên.
                    </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    Email này được gửi tự động từ Hệ thống Khảo thí Oculide. Vui lòng không phản hồi thư này.
                </div>
            </div>
        </body>
        </html>
        """
        return cls._send_mime_message(to_email, subject, html_body)
