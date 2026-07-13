# sends email through gmail smtp
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import config  # noqa: F401  (loads .env)

# needs a gmail app password in .env (SMTP_EMAIL / SMTP_PASSWORD)
SMTP_HOST = 'smtp.gmail.com'
SMTP_PORT = 587
SMTP_EMAIL = os.getenv('SMTP_EMAIL', '').strip().strip('"')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '').strip().strip('"')


def send_email(to_email, subject, html_body):
    # send an html email over starttls
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        raise RuntimeError('SMTP_EMAIL / SMTP_PASSWORD are not configured in .env')
    msg = MIMEMultipart('alternative')
    msg['From'] = f'Confessly <{SMTP_EMAIL}>'
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_body, 'html'))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())
