import bcrypt
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from params import from_email, from_password, app_password

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), 
                         bcrypt.gensalt()).decode('utf-8')

def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp(to_email, otp) -> str:
    # Sender configuration
    subject = "Your OTP Code for Cloud Security"
    body = f"Your OTP code is: {otp}"

    # Create the email
    msg = MIMEMultipart()
    msg['From'] = from_email  # Using the email from params.py
    msg['To'] = to_email
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body, 'plain'))

    try:
        # Connect and send email using Gmail SMTP
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            print("Starting TLS session...", end='')
            server.starttls()
            print('[OK]')
            print("Logging in to email server...", end='')
            server.login(from_email, app_password)  # Using app password from params.py
            print('[OK]')
            print(f"Sending OTP to {to_email}...", end='')
            server.send_message(msg)
            print('[OK]')
            print(f"\nOTP successfully sent to {to_email}")
            return f"OTP sent to {to_email}"
    except Exception as e:
        print(f"\nFailed to send email: {e}")
        # Fallback to console output if email fails
        print("\n" + "="*50)
        print(f"FALLBACK: OTP for {to_email} is: {otp}")
        print("="*50 + "\n")
        print("Tip: Check your email credentials or enable 'Less secure app access' if using Gmail")
        return f"Email failed, using fallback OTP display"

if __name__ == '__main__':
    credentials = {}
    file_path = 'ids'
    with open(file_path, 'r') as file:
        for line in file:
            username, password = line.strip().split(',')
            credentials[username] = password

    with open('credentials', 'w') as file:
        for username, password in credentials.items():
            file.write(f'{username},{hash_password(password)}\n')