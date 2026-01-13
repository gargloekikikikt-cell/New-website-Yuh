#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class AdminAPITester:
    def __init__(self, base_url="https://tradehub-310.preview.emergentagent.com/api"):
        self.base_url = base_url
        # Admin token - using the admin email from the requirements
        self.admin_token = "admin_session_1768286105"  # Admin user
        self.admin_user_id = "user_bfc8c1303522"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_category_id = None
        self.created_announcement_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        print("\n=== TESTING ADMIN STATS ===")
        
        success, response = self.run_test(
            "Get admin stats",
            "GET",
            "admin/stats",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Users: {response.get('users', {}).get('total', 0)} total, {response.get('users', {}).get('suspended', 0)} suspended")
            print(f"   Items: {response.get('items', {}).get('total', 0)} total, {response.get('items', {}).get('available', 0)} available")
            print(f"   Trades: {response.get('trades', {}).get('completed', 0)} completed")
            print(f"   Categories: {response.get('categories', {}).get('total', 0)} total")

    def test_admin_users(self):
        """Test admin user management endpoints"""
        print("\n=== TESTING ADMIN USER MANAGEMENT ===")
        
        # List all users
        success, response = self.run_test(
            "List all users",
            "GET",
            "admin/users",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} users")
        
        # Search users
        success, response = self.run_test(
            "Search users",
            "GET",
            "admin/users?search=test",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} users matching 'test'")

    def test_admin_items(self):
        """Test admin item management endpoints"""
        print("\n=== TESTING ADMIN ITEM MANAGEMENT ===")
        
        # List all items
        success, response = self.run_test(
            "List all items",
            "GET",
            "admin/items",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} items")
        
        # Search items
        success, response = self.run_test(
            "Search items",
            "GET",
            "admin/items?search=test",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} items matching 'test'")

    def test_admin_categories(self):
        """Test admin category management endpoints"""
        print("\n=== TESTING ADMIN CATEGORY MANAGEMENT ===")
        
        # List all categories
        success, response = self.run_test(
            "List all categories (admin view)",
            "GET",
            "admin/categories",
            200,
            token=self.admin_token
        )
        if success:
            main_count = len(response.get('main', []))
            sub_count = len(response.get('sub', []))
            bottom_count = len(response.get('bottom', []))
            print(f"   Main: {main_count}, Sub: {sub_count}, Bottom: {bottom_count}")
        
        # Create new category
        category_name = f"testcat{int(datetime.now().timestamp())}"
        success, response = self.run_test(
            "Create new category",
            "POST",
            "admin/categories",
            200,
            data={"name": category_name},
            token=self.admin_token
        )
        if success:
            self.created_category_id = category_name
            print(f"   Created category: {category_name}")
        
        # Delete the created category
        if self.created_category_id:
            success, response = self.run_test(
                "Delete category",
                "DELETE",
                f"admin/categories/{self.created_category_id}",
                200,
                token=self.admin_token
            )
            if success:
                print(f"   Deleted category: {self.created_category_id}")

    def test_category_requests(self):
        """Test category request management"""
        print("\n=== TESTING CATEGORY REQUESTS ===")
        
        # Get category requests
        success, response = self.run_test(
            "Get category requests",
            "GET",
            "admin/category-requests",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} category requests")

    def test_announcements(self):
        """Test announcement management"""
        print("\n=== TESTING ANNOUNCEMENTS ===")
        
        # Get announcements
        success, response = self.run_test(
            "Get announcements",
            "GET",
            "announcements",
            200
        )
        if success:
            print(f"   Found {len(response)} active announcements")
        
        # Create announcement
        announcement_text = f"Test announcement {int(datetime.now().timestamp())}"
        success, response = self.run_test(
            "Create announcement",
            "POST",
            "admin/announcements",
            200,
            data={"message": announcement_text},
            token=self.admin_token
        )
        if success:
            self.created_announcement_id = response.get('announcement_id')
            print(f"   Created announcement: {self.created_announcement_id}")
        
        # Delete announcement
        if self.created_announcement_id:
            success, response = self.run_test(
                "Delete announcement",
                "DELETE",
                f"admin/announcements/{self.created_announcement_id}",
                200,
                token=self.admin_token
            )
            if success:
                print(f"   Deleted announcement: {self.created_announcement_id}")

    def test_reports(self):
        """Test report management"""
        print("\n=== TESTING REPORTS ===")
        
        # Get reports
        success, response = self.run_test(
            "Get reports",
            "GET",
            "admin/reports",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} reports")

    def test_global_search(self):
        """Test global search endpoint"""
        print("\n=== TESTING GLOBAL SEARCH ===")
        
        # Test search with authenticated user
        success, response = self.run_test(
            "Global search",
            "GET",
            "search?q=test",
            200,
            token=self.admin_token
        )
        if success:
            users = len(response.get('users', []))
            items = len(response.get('items', []))
            categories = len(response.get('categories', []))
            print(f"   Search results - Users: {users}, Items: {items}, Categories: {categories}")

    def test_settings(self):
        """Test settings endpoints"""
        print("\n=== TESTING SETTINGS ===")
        
        # Get settings
        success, response = self.run_test(
            "Get settings",
            "GET",
            "settings",
            200
        )
        if success:
            print(f"   Max portfolio items: {response.get('max_portfolio_items', 7)}")
        
        # Update settings
        success, response = self.run_test(
            "Update settings",
            "PUT",
            "admin/settings?max_portfolio_items=8",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Updated max portfolio items to 8")
        
        # Reset settings back
        success, response = self.run_test(
            "Reset settings",
            "PUT",
            "admin/settings?max_portfolio_items=7",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Reset max portfolio items to 7")

def main():
    print("🚀 Starting Admin API Tests")
    print("=" * 50)
    
    tester = AdminAPITester()
    
    # Run all test suites
    tester.test_admin_stats()
    tester.test_admin_users()
    tester.test_admin_items()
    tester.test_admin_categories()
    tester.test_category_requests()
    tester.test_announcements()
    tester.test_reports()
    tester.test_global_search()
    tester.test_settings()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 ADMIN API RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Admin API tests mostly successful!")
        return 0
    else:
        print("⚠️  Admin API has significant issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())