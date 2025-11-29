import bcrypt
import grpc
import os
import json
from concurrent import futures
from datetime import datetime, timedelta
import jwt
from typing import Dict, Tuple, Optional

import cloudsecurity_pb2
import cloudsecurity_pb2_grpc
from utils import send_otp, hash_password, generate_otp

# Constants
CREDENTIALS_FILE = 'credentials'
USERS_FILE = 'users.json'
JWT_SECRET = 'your_jwt_secret_key_here'  # In production, use environment variables
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_MINUTES = 30

# In-memory storage for OTPs and sessions
active_otps: Dict[str, Dict[str, str]] = {}  # {username: {'otp': '123456', 'expires_at': 'timestamp'}}
sessions: Dict[str, Dict] = {}  # {session_id: {user_data}}

def load_users() -> dict:
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, 'r') as f:
        return json.load(f)

def save_users(users: dict) -> None:
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def create_jwt_token(username: str) -> str:
    expiration = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    payload = {
        'sub': username,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

class UserServiceSkeleton(cloudsecurity_pb2_grpc.UserServiceServicer):
    def login(self, request, context) -> cloudsecurity_pb2.Response:
        print(f'[LOGIN] New login attempt for user: {request.username}')
        users = load_users()
        
        if request.username not in users:
            return cloudsecurity_pb2.Response(
                success=False,
                message="Invalid username or password"
            )
        
        user = users[request.username]
        if not bcrypt.checkpw(request.password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return cloudsecurity_pb2.Response(
                success=False,
                message="Invalid username or password"
            )
        
        # Generate and send OTP
        otp = generate_otp()
        active_otps[request.username] = {
            'otp': otp,
            'expires_at': (datetime.utcnow() + timedelta(minutes=5)).isoformat()
        }
        
        send_otp(user['email'], otp)
        
        return cloudsecurity_pb2.Response(
            success=True,
            message="OTP sent to your registered email"
        )

    def signup(self, request, context) -> cloudsecurity_pb2.Response:
        print(f'[SIGNUP] New signup attempt for user: {request.username}')
        users = load_users()
        
        if request.username in users:
            return cloudsecurity_pb2.Response(
                success=False,
                message="Username already exists"
            )
        
        # Hash the password
        password_hash = hash_password(request.password)
        
        # Create new user
        users[request.username] = {
            'username': request.username,
            'email': request.email,
            'full_name': request.full_name,
            'password_hash': password_hash,
            'is_active': False,
            'created_at': datetime.utcnow().isoformat()
        }
        
        save_users(users)
        
        # Send enrollment email with OTP
        otp = generate_otp()
        active_otps[request.username] = {
            'otp': otp,
            'expires_at': (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
            'purpose': 'enrollment'
        }
        
        send_otp(request.email, otp)
        
        return cloudsecurity_pb2.Response(
            success=True,
            message="Account created. Please verify your email with the OTP sent to your inbox."
        )
    
    def enroll(self, request, context) -> cloudsecurity_pb2.Response:
        print(f'[ENROLL] Enrollment request for user: {request.username}')
        users = load_users()
        
        if request.username not in users:
            return cloudsecurity_pb2.Response(
                success=False,
                message="User not found"
            )
        
        # Update user enrollment info
        users[request.username].update({
            'email': request.email,
            'phone': request.phone,
            'updated_at': datetime.utcnow().isoformat()
        })
        
        save_users(users)
        
        # Send OTP for verification
        otp = generate_otp()
        active_otps[request.username] = {
            'otp': otp,
            'expires_at': (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
            'purpose': 'enrollment_verification'
        }
        
        send_otp(request.email, otp)
        
        return cloudsecurity_pb2.Response(
            success=True,
            message="Enrollment information updated. Please verify with the OTP sent to your email."
        )
    
    def verifyOtp(self, request, context) -> cloudsecurity_pb2.Response:
        print(f'\n[OTP] Verification attempt for user: {request.username}')
        print(f'[DEBUG] Active OTPs: {active_otps}')
        print(f'[DEBUG] User provided OTP: {request.otp}')
        
        if request.username not in active_otps:
            print(f'[DEBUG] No active OTP found for user: {request.username}')
            return cloudsecurity_pb2.Response(
                success=False,
                message="No active OTP found for this user"
            )
        
        otp_data = active_otps[request.username]
        print(f'[DEBUG] Stored OTP data: {otp_data}')
        
        # Check if OTP is expired
        expiry_time = datetime.fromisoformat(otp_data['expires_at'])
        current_time = datetime.utcnow()
        print(f'[DEBUG] Current time: {current_time}')
        print(f'[DEBUG] OTP expires at: {expiry_time}')
        
        if expiry_time < current_time:
            print('[DEBUG] OTP has expired')
            del active_otps[request.username]
            return cloudsecurity_pb2.Response(
                success=False,
                message="OTP has expired. Please request a new one."
            )
        
        # Verify OTP
        print(f'[DEBUG] Comparing OTPs - Expected: {otp_data["otp"]}, Got: {request.otp}')
        if str(otp_data['otp']) != str(request.otp):
            print(f'[DEBUG] OTP mismatch')
            return cloudsecurity_pb2.Response(
                success=False,
                message=f"Invalid OTP. Please try again."
            )
            
        print('[DEBUG] OTP verification successful')
        
        # OTP is valid
        users = load_users()
        user = users.get(request.username)
        
        if not user:
            return cloudsecurity_pb2.Response(
                success=False,
                message="User not found"
            )
        
        # Handle different OTP purposes
        if otp_data.get('purpose') == 'enrollment':
            users[request.username]['is_active'] = True
            save_users(users)
            message = "Account activated successfully!"
        elif otp_data.get('purpose') == 'enrollment_verification':
            message = "Enrollment verified successfully!"
        else:  # Default case (login)
            message = "Login successful!"
        
        # Create JWT token for authenticated session
        token = create_jwt_token(request.username)
        
        # Clean up used OTP
        del active_otps[request.username]
        
        return cloudsecurity_pb2.Response(
            success=True,
            message=message,
            token=token
        )

def run():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    cloudsecurity_pb2_grpc.add_UserServiceServicer_to_server(UserServiceSkeleton(), server)
    server.add_insecure_port('[::]:51234')
    print('Starting Server on port 51234 ............', end='')
    server.start()
    print('[OK]')
    server.wait_for_termination()

if __name__ == '__main__':
    run()