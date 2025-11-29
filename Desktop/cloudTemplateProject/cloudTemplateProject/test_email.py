import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from params import from_email, from_password, app_password

def test_email_sending():
    """Test if email credentials work"""
    
    # Create a test email
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = from_email  # Send to yourself for testing
    msg['Subject'] = "Test Email - OTP System"
    
    body = "This is a test email to verify your SMTP settings work correctly."
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        print(f"Testing email with: {from_email}")
        print("Connecting to Gmail SMTP server...")
        
        # Try different SMTP settings for Gmail
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            print("TLS started successfully")
            
            print("Attempting login...")
            server.login(from_email, app_password)
            print("Login successful!")
            
            print("Sending test email...")
            server.send_message(msg)
            print("Email sent successfully!")
            
            return True
            
    except smtplib.SMTPAuthenticationError as e:
        print(f"Authentication failed: {e}")
        print("\nPossible solutions:")
        print("1. Check if your password is correct")
        print("2. For Office 365, you might need to use an App Password")
        print("3. Enable SMTP access in your Office 365 account settings")
        return False
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == '__main__':
    print("=== Email Configuration Test ===\n")
    success = test_email_sending()
    
    if success:
        print("\nEmail configuration is working!")
    else:
        print("\nEmail configuration needs fixing.")
        print("\nNext steps:")
        print("1. Update your credentials in params.py")
        print("2. Generate an App Password if using 2FA")
        print("3. Check your email provider's SMTP settings")
