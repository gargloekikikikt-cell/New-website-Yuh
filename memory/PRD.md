# SwapFlow - Pinterest-Style Trading Platform

## Original Problem Statement
Build a website that allows people to post images on items they want to trade with, in a Pinterest format. Features include Google sign-up, profile with username/photo, item clicking, messaging between users, "trade finished" button (both parties must confirm), trade points display on profile, and 1-5 star ratings after trades.

## Extended Features (Iteration 2)
- Admin system for creatorbennett@gmail.com
- Reporting system (users, items, categories)
- Announcement system (admin-controlled)
- Portfolio system (max items configurable by admin)
- Pinning/boosting system with time-decay algorithm
- 3-level category hierarchy

## User Personas
1. **Trader**: Wants to exchange items without money
2. **Browser**: Discovers items and connects with owners
3. **Active Trader**: Builds reputation through successful trades
4. **Admin**: Manages platform, handles reports, posts announcements

## Core Requirements (Static)
- Pinterest-style masonry grid layout
- Emergent-managed Google OAuth authentication
- Direct file upload for item images
- Single-word categories with 3-level hierarchy
- In-app messaging between users
- Trade confirmation (both parties must click "Trade Finished")
- Trade points awarded on completion
- Post-trade rating system (1-5 stars)
- Profile with username, photo, trade points, rating, portfolio

## Boosting Algorithm
```
score = sum(10 / (1 + days_old * 0.1)) for each pin
```
- Each pin = 10 base points
- Pins decay: today=10pts, 10 days=5pts, 30 days=2.5pts
- Higher boost = higher position in category

## What's Been Implemented (December 2025)

### Phase 1 - Core Features ✓
- [x] Landing page with Google OAuth login
- [x] Dashboard with Pinterest masonry grid
- [x] Category filter with popularity sorting
- [x] Item posting with image upload
- [x] Item detail page with owner info
- [x] User profile page (trade points, rating display)
- [x] Profile editing (username)
- [x] In-app messaging system
- [x] Trade initiation and confirmation flow
- [x] Trade points increment on completion
- [x] Post-trade rating modal (1-5 stars)

### Phase 2 - Admin & Advanced Features ✓
- [x] Admin dashboard (creatorbennett@gmail.com)
- [x] Reporting system (users, items, categories)
- [x] Admin can delete users/items/categories
- [x] Announcement system with banner
- [x] User account deletion
- [x] Portfolio system (max 7 items, admin-configurable)
- [x] Items sorted by boost in portfolio
- [x] Pinning system to boost items
- [x] 3-level category hierarchy (category > subcategory > bottom-category)
- [x] Admin settings panel

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: Emergent-managed Google OAuth
- **Admin Email**: creatorbennett@gmail.com

## API Endpoints
### Auth
- POST /api/auth/session - Exchange session_id for token
- GET /api/auth/me - Get current user
- POST /api/auth/logout - Logout

### Users
- GET /api/users/{user_id} - Get user profile
- PUT /api/users/profile - Update profile
- DELETE /api/users/account - Delete account
- PUT /api/users/portfolio - Update portfolio
- GET /api/users/{user_id}/portfolio - Get portfolio items

### Items
- GET /api/items - List items (sorted by boost)
- POST /api/items - Create item
- GET /api/items/{item_id} - Get item detail
- DELETE /api/items/{item_id} - Delete item
- POST /api/items/{item_id}/pin - Pin item
- DELETE /api/items/{item_id}/pin - Unpin item
- GET /api/items/{item_id}/pin-status - Check pin status

### Categories
- GET /api/categories - List categories (with level/parent filter)
- POST /api/categories/subcategory - Create subcategory

### Reports
- POST /api/reports - Submit report
- GET /api/admin/reports - Get all reports (admin)
- PUT /api/admin/reports/{report_id} - Update report status

### Admin
- DELETE /api/admin/users/{user_id} - Delete user
- DELETE /api/admin/items/{item_id} - Delete item
- DELETE /api/admin/categories/{name} - Delete category
- GET /api/announcements - Get active announcements
- POST /api/admin/announcements - Create announcement
- PUT /api/admin/announcements/{id} - Toggle announcement
- DELETE /api/admin/announcements/{id} - Delete announcement
- GET /api/settings - Get global settings
- PUT /api/admin/settings - Update settings

## Prioritized Backlog
### P0 (Critical) - COMPLETE ✓

### P1 (Important)
- [ ] Real-time messaging with WebSockets
- [ ] Search with advanced filters
- [ ] Image compression before upload
- [ ] User blocking/reporting follow-up

### P2 (Nice to Have)
- [ ] Item watchlist/favorites
- [ ] Push notifications
- [ ] Trade history export
- [ ] Multiple images per item
- [ ] Location-based filtering
