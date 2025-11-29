import grpc
import cloudsecurity_pb2
import cloudsecurity_pb2_grpc

def print_menu():
    print("\n=== Cloud Security Test Client ===")
    print("1. Sign Up")
    print("2. Login")
    print("3. Enroll")
    print("4. Exit")
    return input("Choose an option (1-4): ")

def test_signup(stub):
    print("\n--- User Sign Up ---")
    username = input("Enter username: ")
    email = input("Enter email: ")
    password = input("Enter password: ")
    full_name = input("Enter full name: ")
    
    try:
        response = stub.signup(cloudsecurity_pb2.SignupRequest(
            username=username,
            email=email,
            password=password,
            full_name=full_name
        ))
        print(f"\n[RESPONSE] {response.message}")
        
        if response.success:
            return test_verify_otp(stub, username, "signup")
    except Exception as e:
        print(f"Error during signup: {e}")
    return False

def test_login(stub):
    print("\n--- User Login ---")
    username = input("Username: ")
    password = input("Password: ")
    
    try:
        response = stub.login(cloudsecurity_pb2.LoginRequest(
            username=username,
            password=password
        ))
        print(f"\n[RESPONSE] {response.message}")
        
        if response.success:
            return test_verify_otp(stub, username, "login")
    except Exception as e:
        print(f"Error during login: {e}")
    return False

def test_enroll(stub):
    print("\n--- Update Enrollment ---")
    username = input("Username: ")
    email = input("New email (press Enter to keep current): ")
    phone = input("Phone number (press Enter to skip): ")
    
    try:
        response = stub.enroll(cloudsecurity_pb2.EnrollRequest(
            username=username,
            email=email if email else None,
            phone=phone if phone else None
        ))
        print(f"\n[RESPONSE] {response.message}")
        
        if response.success and (email or phone):
            return test_verify_otp(stub, username, "enrollment")
        return True
    except Exception as e:
        print(f"Error during enrollment: {e}")
    return False

def test_verify_otp(stub, username, operation):
    print(f"\n--- OTP Verification ({operation}) ---")
    print("For testing purposes, check the server logs for the OTP code.")
    print("In a real application, this would be sent to your email/phone.")
    
    otp = input("Enter the OTP: ")
    try:
        response = stub.verifyOtp(cloudsecurity_pb2.OtpVerification(
            username=username,
            otp=otp
        ))
        print(f"\n[RESPONSE] {response.message}")
        if response.success and response.token:
            print(f"[AUTH TOKEN] {response.token[:20]}...")
        return response.success
    except Exception as e:
        print(f"Error during OTP verification: {e}")
    return False

def main():
    # Create a gRPC channel and stub
    channel = grpc.insecure_channel('localhost:51234')
    stub = cloudsecurity_pb2_grpc.UserServiceStub(channel)
    
    print("\n=== Cloud Security Test Client ===")
    print("Make sure the server is running on port 51234")
    
    while True:
        try:
            choice = print_menu()
            
            if choice == '1':
                test_signup(stub)
            elif choice == '2':
                test_login(stub)
            elif choice == '3':
                test_enroll(stub)
            elif choice == '4':
                print("Goodbye!")
                break
            else:
                print("Invalid choice. Please try again.")
                
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"An error occurred: {e}")
            break

if __name__ == '__main__':
    main()
