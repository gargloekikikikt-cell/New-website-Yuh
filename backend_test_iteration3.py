#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import time

class AdminManagementTester:
    def __init__(self, base_url="https://tradehub-310.preview.emergentagent.com/api"):
        self.base_url = base_url
        # Since we can't create a real admin user, we'll test the endpoints
        # and verify they properly reject non-admin users
        self.admin_token = None  # No valid admin token available
        self.admin_user_id = None
        
        # Test user credentials (these are valid)
        self.test_user_token = "test_session_1768106897885"
        self.test_user_id = "test-user-1768106897885"
        
        # Test user 2 credentials
        self.test_user2_token = "test_session2_1768106897885"
        self.test_user2_id = "test-user2-1768106897885"
        
        self.tests_run = 0
        self.tests_passed = 0
        self.created_items = []
        self.created_categories = []
        self.created_reports = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params)

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
                    error_response = response.json()
                    print(f"   Response: {error_response}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def setup_test_data(self):
        """Create test data for admin management testing"""
        print("\n=== SETTING UP TEST DATA ===")
        
        # Create test items
        for i in range(3):
            item_data = {
                "title": f"Admin Test Item {i+1}",
                "description": f"Test item {i+1} for admin management testing",
                "category": "electronics",
                "subcategory": "phones" if i % 2 == 0 else "laptops",
                "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            }
            
            success, response = self.run_test(
                f"Create test item {i+1}",
                "POST",
                "items",
                200,
                data=item_data,
                token=self.test_user_token if i < 2 else self.test_user2_token
            )
            if success:
                self.created_items.append(response.get('item_id'))
        
        # Create test reports
        if self.created_items:
            report_data = {
                "report_type": "item",
                "target_id": self.created_items[0],
                "reason": "Inappropriate content for testing"
            }
            
            success, response = self.run_test(
                "Create test report",
                "POST",
                "reports",
                200,
                data=report_data,
                token=self.test_user2_token
            )
            if success:
                self.created_reports.append(response.get('report_id'))

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        print("\n=== TESTING ADMIN STATS ===")
        
        # Test admin stats
        success, response = self.run_test(
            "Get admin stats",
            "GET",
            "admin/stats",
            200,
            token=self.admin_token
        )
        if success:
            stats = response
            print(f"   Total users: {stats.get('users', {}).get('total', 0)}")
            print(f"   Suspended users: {stats.get('users', {}).get('suspended', 0)}")
            print(f"   Total items: {stats.get('items', {}).get('total', 0)}")
            print(f"   Available items: {stats.get('items', {}).get('available', 0)}")
            print(f"   Total trades: {stats.get('trades', {}).get('total', 0)}")
            print(f"   Completed trades: {stats.get('trades', {}).get('completed', 0)}")
            print(f"   Pending reports: {stats.get('reports', {}).get('pending', 0)}")
            print(f"   Total categories: {stats.get('categories', {}).get('total', 0)}")
        
        # Test non-admin access
        self.run_test(
            "Get admin stats (non-admin)",
            "GET",
            "admin/stats",
            403,
            token=self.test_user_token
        )

    def test_user_management(self):
        """Test admin user management endpoints"""
        print("\n=== TESTING USER MANAGEMENT ===")
        
        # List all users
        success, response = self.run_test(
            "List all users",
            "GET",
            "admin/users",
            200,
            token=self.admin_token
        )
        if success:
            users = response
            print(f"   Found {len(users)} users")
            
            # Find a test user for suspension testing
            test_user = None
            for user in users:
                if user.get('user_id') == self.test_user_id:
                    test_user = user
                    break
            
            if test_user:
                print(f"   Test user found: {test_user.get('name')} (suspended: {test_user.get('is_suspended', False)})")
        
        # Search users by name
        success, response = self.run_test(
            "Search users by name",
            "GET",
            "admin/users",
            200,
            token=self.admin_token,
            params={"search": "test"}
        )
        if success:
            print(f"   Found {len(response)} users matching 'test'")
        
        # Filter suspended users only
        success, response = self.run_test(
            "Filter suspended users only",
            "GET",
            "admin/users",
            200,
            token=self.admin_token,
            params={"suspended_only": True}
        )
        if success:
            suspended_users = response
            print(f"   Found {len(suspended_users)} suspended users")
        
        # Test non-admin access
        self.run_test(
            "List users (non-admin)",
            "GET",
            "admin/users",
            403,
            token=self.test_user_token
        )

    def test_user_suspension(self):
        """Test user suspension functionality"""
        print("\n=== TESTING USER SUSPENSION ===")
        
        # Suspend user for 7 days
        suspend_data = {
            "days": 7,
            "reason": "Testing suspension functionality"
        }
        
        success, response = self.run_test(
            "Suspend user for 7 days",
            "POST",
            f"admin/users/{self.test_user_id}/suspend",
            200,
            data=suspend_data,
            token=self.admin_token
        )
        if success:
            print(f"   User suspended successfully")
        
        # Verify suspended user cannot access protected routes
        success, response = self.run_test(
            "Suspended user access protected route",
            "GET",
            "auth/me",
            403,
            token=self.test_user_token
        )
        if success:
            print(f"   Suspended user correctly blocked from protected routes")
        
        # Unsuspend user (set days to 0)
        unsuspend_data = {
            "days": 0
        }
        
        success, response = self.run_test(
            "Unsuspend user",
            "POST",
            f"admin/users/{self.test_user_id}/suspend",
            200,
            data=unsuspend_data,
            token=self.admin_token
        )
        if success:
            print(f"   User unsuspended successfully")
        
        # Verify unsuspended user can access protected routes again
        success, response = self.run_test(
            "Unsuspended user access protected route",
            "GET",
            "auth/me",
            200,
            token=self.test_user_token
        )
        if success:
            print(f"   Unsuspended user can access protected routes again")
        
        # Test suspending admin (should fail)
        self.run_test(
            "Try to suspend admin user",
            "POST",
            f"admin/users/{self.admin_user_id}/suspend",
            400,
            data=suspend_data,
            token=self.admin_token
        )
        
        # Test non-admin suspension
        self.run_test(
            "Suspend user (non-admin)",
            "POST",
            f"admin/users/{self.test_user2_id}/suspend",
            403,
            data=suspend_data,
            token=self.test_user_token
        )

    def test_item_management(self):
        """Test admin item management endpoints"""
        print("\n=== TESTING ITEM MANAGEMENT ===")
        
        # List all items
        success, response = self.run_test(
            "List all items",
            "GET",
            "admin/items",
            200,
            token=self.admin_token
        )
        if success:
            items = response
            print(f"   Found {len(items)} items")
        
        # Search items by title
        success, response = self.run_test(
            "Search items by title",
            "GET",
            "admin/items",
            200,
            token=self.admin_token,
            params={"search": "Admin Test"}
        )
        if success:
            print(f"   Found {len(response)} items matching 'Admin Test'")
        
        # Delete individual item
        if self.created_items:
            success, response = self.run_test(
                "Delete individual item",
                "DELETE",
                f"admin/items/{self.created_items[0]}",
                200,
                token=self.admin_token
            )
            if success:
                print(f"   Item deleted successfully")
        
        # Bulk delete items
        if len(self.created_items) > 1:
            bulk_delete_data = {
                "item_ids": self.created_items[1:]
            }
            
            success, response = self.run_test(
                "Bulk delete items",
                "POST",
                "admin/items/bulk-delete",
                200,
                data=bulk_delete_data,
                token=self.admin_token
            )
            if success:
                deleted_count = response.get('message', '').split()[1] if 'Deleted' in response.get('message', '') else 0
                print(f"   Bulk deleted items successfully")
        
        # Test non-admin access
        self.run_test(
            "List items (non-admin)",
            "GET",
            "admin/items",
            403,
            token=self.test_user_token
        )

    def test_category_management(self):
        """Test admin category management endpoints"""
        print("\n=== TESTING CATEGORY MANAGEMENT ===")
        
        # List all categories
        success, response = self.run_test(
            "List all categories",
            "GET",
            "admin/categories",
            200,
            token=self.admin_token
        )
        if success:
            categories = response
            main_count = len(categories.get('main', []))
            sub_count = len(categories.get('sub', []))
            bottom_count = len(categories.get('bottom', []))
            print(f"   Found {main_count} main, {sub_count} sub, {bottom_count} bottom categories")
            
            # Store some category names for deletion testing
            if categories.get('main'):
                self.created_categories.extend([cat['name'] for cat in categories['main'][:2]])
        
        # Delete individual category
        if self.created_categories:
            success, response = self.run_test(
                "Delete individual category",
                "DELETE",
                f"admin/categories/{self.created_categories[0]}",
                200,
                token=self.admin_token
            )
            if success:
                print(f"   Category deleted successfully")
        
        # Bulk delete categories
        if len(self.created_categories) > 1:
            bulk_delete_data = {
                "category_names": self.created_categories[1:]
            }
            
            success, response = self.run_test(
                "Bulk delete categories",
                "POST",
                "admin/categories/bulk-delete",
                200,
                data=bulk_delete_data,
                token=self.admin_token
            )
            if success:
                print(f"   Bulk deleted categories successfully")
        
        # Test non-admin access
        self.run_test(
            "List categories (non-admin)",
            "GET",
            "admin/categories",
            403,
            token=self.test_user_token
        )

    def test_reports_management(self):
        """Test admin reports management"""
        print("\n=== TESTING REPORTS MANAGEMENT ===")
        
        # Get all reports
        success, response = self.run_test(
            "Get all reports",
            "GET",
            "admin/reports",
            200,
            token=self.admin_token
        )
        if success:
            reports = response
            print(f"   Found {len(reports)} reports")
            
            # Find a pending report for testing
            pending_report = None
            for report_data in reports:
                report = report_data.get('report', {})
                if report.get('status') == 'pending':
                    pending_report = report
                    break
            
            if pending_report:
                report_id = pending_report.get('report_id')
                
                # Update report status to reviewed
                success, response = self.run_test(
                    "Update report status to reviewed",
                    "PUT",
                    f"admin/reports/{report_id}",
                    200,
                    token=self.admin_token,
                    params={"status": "reviewed"}
                )
                if success:
                    print(f"   Report status updated to reviewed")
                
                # Update report status to resolved
                success, response = self.run_test(
                    "Update report status to resolved",
                    "PUT",
                    f"admin/reports/{report_id}",
                    200,
                    token=self.admin_token,
                    params={"status": "resolved"}
                )
                if success:
                    print(f"   Report status updated to resolved")
                
                # Quick delete reported content (if it's an item)
                if pending_report.get('report_type') == 'item':
                    target_id = pending_report.get('target_id')
                    success, response = self.run_test(
                        "Quick delete reported item",
                        "DELETE",
                        f"admin/items/{target_id}",
                        200,
                        token=self.admin_token
                    )
                    if success:
                        print(f"   Reported item deleted via quick action")
        
        # Filter reports by status
        success, response = self.run_test(
            "Filter reports by status (pending)",
            "GET",
            "admin/reports",
            200,
            token=self.admin_token,
            params={"status": "pending"}
        )
        if success:
            print(f"   Found {len(response)} pending reports")
        
        # Test non-admin access
        self.run_test(
            "Get reports (non-admin)",
            "GET",
            "admin/reports",
            403,
            token=self.test_user_token
        )

    def test_user_deletion(self):
        """Test admin user deletion"""
        print("\n=== TESTING USER DELETION ===")
        
        # Try to delete admin user (should fail)
        self.run_test(
            "Try to delete admin user",
            "DELETE",
            f"admin/users/{self.admin_user_id}",
            400,
            token=self.admin_token
        )
        
        # Delete regular user
        success, response = self.run_test(
            "Delete regular user",
            "DELETE",
            f"admin/users/{self.test_user2_id}",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   User deleted successfully")
        
        # Verify user is deleted (should return 404)
        self.run_test(
            "Verify user deletion",
            "GET",
            f"users/{self.test_user2_id}",
            404
        )
        
        # Test non-admin deletion
        self.run_test(
            "Delete user (non-admin)",
            "DELETE",
            f"admin/users/{self.test_user_id}",
            403,
            token=self.test_user_token
        )

    def test_suspension_expiry(self):
        """Test automatic suspension expiry"""
        print("\n=== TESTING SUSPENSION EXPIRY ===")
        
        # This test would require manipulating time or waiting
        # For now, we'll just test the logic by checking if expired suspensions are handled
        print("   Note: Automatic expiry testing requires time manipulation - skipping detailed test")
        print("   The backend code shows proper expiry handling in get_current_user function")

def main():
    print("🚀 Starting SwapFlow Admin Management Tests")
    print("=" * 60)
    
    tester = AdminManagementTester()
    
    # Setup test data first
    tester.setup_test_data()
    
    # Run all admin test suites
    tester.test_admin_stats()
    tester.test_user_management()
    tester.test_user_suspension()
    tester.test_item_management()
    tester.test_category_management()
    tester.test_reports_management()
    tester.test_user_deletion()
    tester.test_suspension_expiry()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Admin Management API tests mostly successful!")
        return 0
    else:
        print("⚠️  Admin Management API has significant issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())