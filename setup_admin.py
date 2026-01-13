#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

def setup_admin_user():
    """Setup admin user and session for testing"""
    base_url = "https://swapspot-38.preview.emergentagent.com/api"
    
    # Admin email from the backend code
    admin_email = "creatorbennett@gmail.com"
    
    # Create admin session data
    admin_user_id = f"admin-{uuid.uuid4().hex[:12]}"
    admin_session_token = f"admin_session_{int(datetime.now().timestamp())}"
    
    print(f"Setting up admin user:")
    print(f"Email: {admin_email}")
    print(f"User ID: {admin_user_id}")
    print(f"Session Token: {admin_session_token}")
    
    # We need to create the admin user directly in the database
    # Since we can't access the database directly, let's try to use the auth endpoint
    
    # Try to create a session with admin email
    session_data = {
        "session_id": f"admin_session_setup_{int(datetime.now().timestamp())}"
    }
    
    try:
        response = requests.post(f"{base_url}/auth/session", json=session_data)
        print(f"Auth session response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Session created: {data}")
        else:
            print(f"Failed to create session: {response.text}")
    except Exception as e:
        print(f"Error creating session: {e}")
    
    return admin_user_id, admin_session_token

if __name__ == "__main__":
    setup_admin_user()