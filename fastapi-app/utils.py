import smtplib
from email.message import EmailMessage
import os


def send_email(to: str, subject: str, html: str):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = os.getenv("SENDER_EMAIL")
    msg["To"] = to
    msg.set_content("This is an HTML message")
    msg.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(
            os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT"))
        ) as server:
            server.starttls()
            server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASS"))
            server.send_message(msg)
            print("📧 Email sent to", to)
    except Exception as e:
        print("❌ Email error:", str(e))
