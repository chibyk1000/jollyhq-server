# Admin API Documentation

## Base URL

`/api/admin`

## Authentication

All admin endpoints require:

- Valid session/authentication token
- User must have `admin` or `superadmin` role

## Endpoints

### Dashboard & Statistics

#### Get Dashboard Statistics

```
GET /admin/dashboard/stats
```

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

---

### User Management

#### Get All Users

```
GET /admin/users?page=1&limit=10&search=&banned=&role=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search by email, name, username, or phone
- `banned` (boolean): Filter by ban status ("true", "false")
- `role` (string): Filter by user role
- `sortBy` (string): Sort field ("createdAt" or "firstName")
- `order` (string): Sort order ("asc" or "desc")

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

#### Get User Details

```
GET /admin/users/:userId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "banned": false,
      "role": "user",
      ...
    },
    "wallets": [...]
  }
}
```

#### Ban User

```
POST /admin/users/:userId/ban
```

**Request Body:**

```json
{
  "reason": "Violating terms of service",
  "duration": 604800 // Optional: duration in seconds (7 days = 604800)
}
```

**Response:**

```json
{
  "success": true,
  "message": "User banned successfully",
  "data": {
    "id": "uuid",
    "banned": true,
    "banReason": "Violating terms of service",
    "banExpires": "2024-05-23T12:00:00Z"
  }
}
```

#### Unban User

```
POST /admin/users/:userId/unban
```

**Response:**

```json
{
  "success": true,
  "message": "User unbanned successfully",
  "data": {
    "id": "uuid",
    "banned": false,
    "banReason": null,
    "banExpires": null
  }
}
```

#### Update User Role

```
PATCH /admin/users/:userId/role
```

**Request Body:**

```json
{
  "role": "vendor"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User role updated successfully",
  "data": {
    "id": "uuid",
    "role": "vendor"
  }
}
```

#### Delete User (Soft Delete)

```
DELETE /admin/users/:userId
```

**Response:**

```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "id": "uuid",
    "deletedAt": "2024-05-16T12:00:00Z"
  }
}
```

#### Restore User

```
POST /admin/users/:userId/restore
```

**Response:**

```json
{
  "success": true,
  "message": "User restored successfully",
  "data": {
    "id": "uuid",
    "deletedAt": null
  }
}
```

---

### Vendor Management

#### Get All Vendors

```
GET /admin/vendors?page=1&limit=10&verified=&search=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `verified` (boolean): Filter by verification status ("true", "false")
- `search` (string): Search by business name, email, or contact name
- `sortBy` (string): Sort field ("createdAt" or "businessName")
- `order` (string): Sort order ("asc" or "desc")

**Response:**

```json
{
  "success": true,
  "data": {
    "vendors": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 30,
      "pages": 3
    }
  }
}
```

#### Verify/Unverify Vendor

```
PATCH /admin/vendors/:vendorId/verify
```

**Request Body:**

```json
{
  "verified": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Vendor verified successfully",
  "data": {
    "id": "uuid",
    "verified": true,
    "businessName": "John's Catering"
  }
}
```

#### Activate/Suspend Vendor

```
PATCH /admin/vendors/:vendorId/activity
```

**Request Body:**

```json
{
  "isActive": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Vendor suspended successfully",
  "data": {
    "id": "uuid",
    "isActive": false,
    "businessName": "John's Catering"
  }
}
```

---

### Events Management

#### Get All Events

```
GET /admin/events?page=1&limit=10&search=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search by title, description, or location
- `sortBy` (string): Sort field ("createdAt" or "title")
- `order` (string): Sort order ("asc" or "desc")

---

### Orders Management

#### Get All Orders

```
GET /admin/orders?page=1&limit=10&status=&search=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by order status
- `search` (string): Search by order ID
- `sortBy` (string): Sort field ("createdAt" or "orderId")
- `order` (string): Sort order ("asc" or "desc")

#### Update Order Status

```
PATCH /admin/orders/:orderId/status
```

**Request Body:**

```json
{
  "status": "completed"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "id": "uuid",
    "status": "completed"
  }
}
```

---

### Withdrawal Management

#### Get Withdrawal Requests

```
GET /admin/withdrawals?page=1&limit=10&status=&sortBy=createdAt&order=desc
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status ("pending", "approved", "rejected")
- `sortBy` (string): Sort field ("createdAt" or "status")
- `order` (string): Sort order ("asc" or "desc")

#### Approve Withdrawal

```
POST /admin/withdrawals/:withdrawalId/approve
```

**Response:**

```json
{
  "success": true,
  "message": "Withdrawal approved successfully",
  "data": {
    "id": "uuid",
    "status": "approved",
    "reviewedBy": "admin-uuid"
  }
}
```

#### Reject Withdrawal

```
POST /admin/withdrawals/:withdrawalId/reject
```

**Request Body:**

```json
{
  "reason": "Invalid account details"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Withdrawal rejected successfully",
  "data": {
    "id": "uuid",
    "status": "rejected",
    "reviewedBy": "admin-uuid",
    "notes": "Invalid account details"
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Common HTTP Status Codes

- `200`: Success
- `400`: Bad Request (missing/invalid parameters)
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (not admin)
- `404`: Not Found (resource not found)
- `500`: Internal Server Error

---

## Usage Examples

### Example 1: Ban a user for 7 days

```bash
curl -X POST http://localhost:3000/api/admin/users/user-uuid/ban \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reason": "Inappropriate behavior",
    "duration": 604800
  }'
```

### Example 2: Get all unverified vendors

```bash
curl -X GET "http://localhost:3000/api/admin/vendors?verified=false&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 3: Verify a vendor

```bash
curl -X PATCH http://localhost:3000/api/admin/vendors/vendor-uuid/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "verified": true
  }'
```

### Example 4: Approve a withdrawal request

```bash
curl -X POST http://localhost:3000/api/admin/withdrawals/withdrawal-uuid/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

- All endpoints are protected by admin authentication middleware
- User must have either `admin` or `superadmin` role to access these endpoints
- Pagination defaults to page 1 with 10 items per page
- Soft deletes are used for users (data is retained in database with `deletedAt` timestamp)
- All timestamps are in ISO 8601 format (UTC)
