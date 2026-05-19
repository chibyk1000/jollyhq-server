# Admin API - Complete Endpoints Documentation

## Base Configuration

**Base URL**: `/api/admin`
**Authentication**: All endpoints require valid session with `admin` or `superadmin` role
**Response Format**: JSON

## Authentication Endpoints

### Get Admin Session

```
GET /api/auth/get-session
```

Returns current session information with user role.

## Admin Management Endpoints

### Dashboard Overview

```
GET /api/admin/dashboard/stats
```

Get comprehensive dashboard statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "activeUsers": 145,
    "bannedUsers": 5,
    "totalVendors": 30,
    "totalEvents": 85,
    "totalOrders": 200,
    "totalWallets": 150
  }
}
```

### Get Admin Overview

```
GET /api/admin/overview
```

Get quick overview with recent data.

**Response:**

```json
{
  "success": true,
  "data": {
    "recentUsers": [...],
    "recentOrders": [...],
    "pendingPlannerVerifications": 5,
    "pendingVendorVerifications": 3,
    "totalRevenue": 50000
  }
}
```

## User Management Endpoints

### Get All Users

```
GET /api/admin/users?page=1&limit=10&search=&banned=&role=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search by email, name, username, phone
- `banned` (boolean): "true" or "false"
- `role` (string): Filter by role
- `sortBy` (string): "createdAt" or "firstName"
- `order` (string): "asc" or "desc"

**Response:**

```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "pages": 15
    }
  }
}
```

### Get User Details

```
GET /api/admin/users/:userId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {...},
    "wallets": [...]
  }
}
```

### Ban User

```
POST /api/admin/users/:userId/ban
```

**Request Body:**

```json
{
  "reason": "Violating terms of service",
  "duration": 604800
}
```

### Unban User

```
POST /api/admin/users/:userId/unban
```

### Update User Role

```
PATCH /api/admin/users/:userId/role
```

**Request Body:**

```json
{
  "role": "vendor"
}
```

### Delete User (Soft Delete)

```
DELETE /api/admin/users/:userId
```

### Restore User

```
POST /api/admin/users/:userId/restore
```

## Event Planner Endpoints

### Get All Event Planners

```
GET /api/admin/event-planners?page=1&limit=10&search=&verified=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search by business name, email, phone
- `verified` (boolean): "true" or "false"
- `sortBy` (string): "createdAt" or "businessName"
- `order` (string): "asc" or "desc"

**Response:**

```json
{
  "success": true,
  "data": {
    "planners": [...],
    "pagination": {...}
  }
}
```

### Verify Event Planner

```
PATCH /api/admin/event-planners/:plannerId/verify
```

**Request Body:**

```json
{
  "isVerified": true
}
```

## Event Management Endpoints

### Get All Events

```
GET /api/admin/events?page=1&limit=10&search=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search by name, description, location
- `sortBy` (string): "createdAt" or "name"
- `order` (string): "asc" or "desc"

### Get Event Ticket Sales

```
GET /api/admin/events/:eventId/tickets?page=1&limit=10
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "uuid",
        "label": "VIP",
        "quantity": 100,
        "price": "50.00",
        "isFree": false
      }
    ],
    "pagination": {...}
  }
}
```

## Ticket Management Endpoints

### Get Event Tickets

```
GET /api/admin/events/:eventId/tickets
```

Returns ticket types and sales information for an event.

## Vendor Management Endpoints

### Get All Vendors

```
GET /api/admin/vendors?page=1&limit=10&verified=&search=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page
- `verified` (boolean): "true" or "false"
- `search` (string): Search by name/email/contact
- `sortBy` (string): "createdAt" or "businessName"
- `order` (string): "asc" or "desc"

### Verify Vendor

```
PATCH /api/admin/vendors/:vendorId/verify
```

**Request Body:**

```json
{
  "verified": true
}
```

### Suspend/Activate Vendor

```
PATCH /api/admin/vendors/:vendorId/activity
```

**Request Body:**

```json
{
  "isActive": false
}
```

## Order Management Endpoints

### Get All Orders

```
GET /api/admin/orders?page=1&limit=10&status=&search=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): "PENDING", "PAID", "FAILED", "CANCELLED"
- `search` (string): Search by order reference
- `sortBy` (string): "createdAt" or "orderReference"
- `order` (string): "asc" or "desc"

### Update Order Status

```
PATCH /api/admin/orders/:orderId/status
```

**Request Body:**

```json
{
  "status": "PAID"
}
```

## Transaction & Payout Endpoints

### Get Transactions

```
GET /api/admin/transactions?page=1&limit=10&userId=&type=&source=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page
- `userId` (string): Filter by user ID
- `type` (string): "credit" or "debit"
- `source` (string): "ticket_sale", "vendor_payment", "withdrawal_payout", "refund_reversal"
- `sortBy` (string): "createdAt" or "amount"
- `order` (string): "asc" or "desc"

**Response:**

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "walletId": "uuid",
        "type": "credit",
        "source": "ticket_sale",
        "amount": 1000,
        "balanceBefore": 5000,
        "balanceAfter": 6000,
        "reference": "ORDER-123",
        "narration": "Ticket sale",
        "createdAt": "2024-05-16T12:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

### Get User Transactions

```
GET /api/admin/users/:userId/transactions?page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "pagination": {...}
  }
}
```

### Get Withdrawal Requests

```
GET /api/admin/withdrawals?page=1&limit=10&status=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): "pending", "approved", "paid", "rejected"
- `sortBy` (string): "createdAt" or "status"
- `order` (string): "asc" or "desc"

### Approve Withdrawal

```
POST /api/admin/withdrawals/:withdrawalId/approve
```

**Response:**

```json
{
  "success": true,
  "message": "Withdrawal approved successfully",
  "data": {
    "id": "uuid",
    "status": "approved",
    "reviewedBy": "admin-id"
  }
}
```

### Reject Withdrawal

```
POST /api/admin/withdrawals/:withdrawalId/reject
```

**Request Body:**

```json
{
  "reason": "Invalid account details"
}
```

## Discount Code Endpoints

### Get Discount Codes

```
GET /api/admin/discount-codes?page=1&limit=10&eventId=&search=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page
- `eventId` (string): Filter by event ID
- `search` (string): Search by code
- `sortBy` (string): "createdAt" or "code"
- `order` (string): "asc" or "desc"

**Response:**

```json
{
  "success": true,
  "data": {
    "codes": [
      {
        "id": "uuid",
        "eventId": "uuid",
        "code": "SUMMER2024",
        "usageLimit": 100,
        "usedCount": 45,
        "createdAt": "2024-05-16T12:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

### Create Discount Code

```
POST /api/admin/discount-codes
```

**Request Body:**

```json
{
  "eventId": "event-uuid",
  "code": "SUMMER2024",
  "usageLimit": 100
}
```

**Response:**

```json
{
  "success": true,
  "message": "Discount code created successfully",
  "data": {
    "id": "uuid",
    "eventId": "uuid",
    "code": "SUMMER2024",
    "usageLimit": 100,
    "usedCount": 0,
    "createdAt": "2024-05-16T12:00:00Z"
  }
}
```

### Delete Discount Code

```
DELETE /api/admin/discount-codes/:codeId
```

## Response Models

### Standard Success Response

```json
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}
```

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

### Pagination Object

```json
{
  "page": 1,
  "limit": 10,
  "total": 150,
  "pages": 15
}
```

### User Object

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+234...",
  "username": "johndoe",
  "displayUsername": "john_doe",
  "image": "image_url",
  "emailVerified": true,
  "phoneNumberVerified": false,
  "role": "user",
  "banned": false,
  "banReason": null,
  "banExpires": null,
  "agreedToTerms": true,
  "createdAt": "2024-05-16T12:00:00Z",
  "updatedAt": "2024-05-16T12:00:00Z",
  "deletedAt": null
}
```

### Event Planner Object

```json
{
  "id": "uuid",
  "profileId": "uuid",
  "businessName": "Event Company",
  "businessEmail": "contact@event.com",
  "businessPhone": "+234...",
  "website": "https://event.com",
  "address": "123 Main St",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "postalCode": "100001",
  "bvn": "1234567890",
  "nin": "0123456789",
  "logoUrl": "logo_url",
  "idDocumentUrl": "id_doc_url",
  "businessDocumentUrl": "business_doc_url",
  "instagram": "@event",
  "facebook": "event-page",
  "twitter": "@event",
  "isVerified": true,
  "isActive": true,
  "createdAt": "2024-05-16T12:00:00Z",
  "updatedAt": "2024-05-16T12:00:00Z"
}
```

### Transaction Object

```json
{
  "id": "uuid",
  "walletId": "uuid",
  "type": "credit",
  "source": "ticket_sale",
  "amount": 1000,
  "balanceBefore": 5000,
  "balanceAfter": 6000,
  "reference": "ORDER-123",
  "narration": "Ticket sale",
  "createdAt": "2024-05-16T12:00:00Z"
}
```

### Discount Code Object

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "code": "SUMMER2024",
  "usageLimit": 100,
  "usedCount": 45,
  "createdAt": "2024-05-16T12:00:00Z"
}
```

### Withdrawal Request Object

```json
{
  "id": "uuid",
  "vendorId": "uuid",
  "amount": 10000,
  "status": "pending",
  "accountNumber": "1234567890",
  "bankName": "GTBank",
  "accountName": "Vendor Name",
  "reviewedBy": null,
  "notes": null,
  "createdAt": "2024-05-16T12:00:00Z",
  "updatedAt": "2024-05-16T12:00:00Z"
}
```

## HTTP Status Codes

- `200` OK - Successful request
- `201` Created - Successful creation
- `400` Bad Request - Invalid parameters
- `401` Unauthorized - Not authenticated
- `403` Forbidden - Not authorized (not admin)
- `404` Not Found - Resource not found
- `500` Internal Server Error - Server error

## Error Handling

All endpoints return consistent error responses with appropriate HTTP status codes and descriptive error messages.

**Example Error Response:**

```json
{
  "success": false,
  "error": "Admin access required"
}
```

## Authentication

All admin endpoints require:

1. Valid session with better-auth
2. User role must be either `admin` or `superadmin`
3. Session is validated via the admin middleware

## Rate Limiting

Consider implementing rate limiting for sensitive operations like:

- Creating/deleting discount codes
- Approving/rejecting withdrawals
- Banning/unbanning users

## Logging

All admin actions are logged including:

- User bans/unbans
- Verification status changes
- Order updates
- Discount code operations
- Withdrawal approvals/rejections

## Pagination

All list endpoints support pagination with:

- `page`: Current page (default: 1)
- `limit`: Items per page (default: 10)
- Response includes total count and number of pages

## Sorting

Supported sorting options:

- `sortBy`: Field to sort by (varies by endpoint)
- `order`: "asc" (ascending) or "desc" (descending, default)

## Filtering

Each list endpoint supports specific filters:

- Search across multiple fields
- Status-based filtering
- User/role-based filtering
- Date range filtering (extensible)
