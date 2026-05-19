# Admin API Setup Summary

## Overview

A comprehensive admin API system has been added to your JollyHQ backend server. This includes admin-specific endpoints for managing users, vendors, events, orders, and withdrawal requests with advanced filtering and control.

## Files Created/Modified

### 1. **Admin Controller** (`src/controllers/admin.ts`)

Comprehensive controller with 15+ methods for admin operations:

- Dashboard statistics
- User management (view, ban, unban, role update, delete, restore)
- Vendor management (verify, suspend/activate)
- Event management (view)
- Order management (view, update status)
- Withdrawal management (approve, reject)

### 2. **Admin Routes** (`src/routes/admin.ts`)

RESTful routes with admin authentication middleware:

- All routes protected with admin role verification
- Uses better-auth session validation
- Requires users to have `admin` or `superadmin` role

### 3. **Routes Index** (`src/routes/index.ts`)

Updated main router to include admin routes at `/api/admin`

### 4. **Documentation** (`ADMIN_API.md`)

Complete API documentation with:

- All endpoint descriptions
- Request/response formats
- Query parameters and filters
- Error handling
- Usage examples

## Key Features

### Authentication

- Built-in admin middleware checks for valid sessions
- Requires `admin` or `superadmin` role
- Uses better-auth for session management

### User Management

- List users with filtering by: search, ban status, role
- Get detailed user information and wallets
- Ban users with optional duration
- Unban users
- Update user roles
- Soft delete/restore users

### Vendor Management

- List vendors with verification filtering
- Verify/unverify vendors
- Suspend/activate vendors

### Event Management

- List all events with search and sorting
- Filter by date range (extensible)

### Order Management

- List orders with status filtering
- Update order status
- Search by order reference

### Withdrawal Management

- List withdrawal requests with status filtering
- Approve withdrawals with admin tracking
- Reject withdrawals with reason

## API Endpoints

```
GET    /api/admin/dashboard/stats              - Get dashboard statistics
GET    /api/admin/users                        - Get all users (paginated/filtered)
GET    /api/admin/users/:userId                - Get user details
POST   /api/admin/users/:userId/ban            - Ban a user
POST   /api/admin/users/:userId/unban          - Unban a user
PATCH  /api/admin/users/:userId/role           - Update user role
DELETE /api/admin/users/:userId                - Delete user (soft delete)
POST   /api/admin/users/:userId/restore        - Restore deleted user
GET    /api/admin/vendors                      - Get all vendors (paginated/filtered)
PATCH  /api/admin/vendors/:vendorId/verify     - Verify/unverify vendor
PATCH  /api/admin/vendors/:vendorId/activity   - Suspend/activate vendor
GET    /api/admin/events                       - Get all events (paginated/filtered)
GET    /api/admin/orders                       - Get all orders (paginated/filtered)
PATCH  /api/admin/orders/:orderId/status       - Update order status
GET    /api/admin/withdrawals                  - Get withdrawal requests (paginated)
POST   /api/admin/withdrawals/:withdrawalId/approve  - Approve withdrawal
POST   /api/admin/withdrawals/:withdrawalId/reject   - Reject withdrawal
```

## Features

### Pagination

- All list endpoints support pagination
- Default page size: 10
- Customizable with `page` and `limit` query parameters

### Filtering & Search

- Advanced filtering on most list endpoints
- Full-text search support
- Status-based filtering
- Role-based filtering

### Sorting

- Customizable sort field and direction
- Default sort: by creation date descending
- Supports: `asc` and `desc` order

### Error Handling

- Consistent error response format
- Proper HTTP status codes
- Descriptive error messages
- Logging for all operations

### Audit Trail

- Admin actions are logged
- Includes admin user ID in withdrawal approvals
- Tracks ban/unban reasons
- Records status changes

## Integration Notes

1. **Authentication Middleware**: Admin routes are protected by a middleware that checks for valid sessions and admin role
2. **Better Auth Integration**: Uses better-auth's session validation for authentication
3. **Database**: Uses Drizzle ORM with PostgreSQL
4. **Logging**: All admin actions are logged using the existing logger utility

## Usage Examples

### Ban a User

```bash
curl -X POST http://localhost:3000/api/admin/users/user-id/ban \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"reason": "Violating terms", "duration": 604800}'
```

### Get Unverified Vendors

```bash
curl -X GET "http://localhost:3000/api/admin/vendors?verified=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Verify a Vendor

```bash
curl -X PATCH http://localhost:3000/api/admin/vendors/vendor-id/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"verified": true}'
```

### Approve Withdrawal

```bash
curl -X POST http://localhost:3000/api/admin/withdrawals/withdrawal-id/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Environment & Configuration

- **Base URL**: `/api/admin`
- **Authentication**: Session-based (better-auth)
- **Required Role**: `admin` or `superadmin`
- **Database**: PostgreSQL with Drizzle ORM
- **Response Format**: JSON

## Next Steps

1. Test admin endpoints with valid admin credentials
2. Add any additional admin-specific fields or operations as needed
3. Consider adding email notifications for admin actions
4. Add rate limiting for sensitive operations
5. Consider implementing admin activity audit logs

## Notes

- All user deletions are soft deletes (data retained with `deletedAt` timestamp)
- User bans can be temporary (with duration) or permanent
- Withdrawal approvals track which admin approved them
- All timestamps are in ISO 8601 UTC format
- Database transactions ensure data consistency for critical operations
