# Admin API Quick Reference

## Quick Start

All admin endpoints are at `/api/admin` and require authentication with `admin` or `superadmin` role.

## Main Endpoints

### Dashboard

- `GET /api/admin/dashboard/stats` - Get system statistics

### User Management

| Method | Endpoint                       | Action           |
| ------ | ------------------------------ | ---------------- |
| GET    | `/admin/users`                 | List all users   |
| GET    | `/admin/users/:userId`         | Get user details |
| POST   | `/admin/users/:userId/ban`     | Ban user         |
| POST   | `/admin/users/:userId/unban`   | Unban user       |
| PATCH  | `/admin/users/:userId/role`    | Update role      |
| DELETE | `/admin/users/:userId`         | Delete user      |
| POST   | `/admin/users/:userId/restore` | Restore user     |

### Vendor Management

| Method | Endpoint                            | Action           |
| ------ | ----------------------------------- | ---------------- |
| GET    | `/admin/vendors`                    | List vendors     |
| PATCH  | `/admin/vendors/:vendorId/verify`   | Verify vendor    |
| PATCH  | `/admin/vendors/:vendorId/activity` | Suspend/activate |

### Events & Orders

| Method | Endpoint                        | Action              |
| ------ | ------------------------------- | ------------------- |
| GET    | `/admin/events`                 | List events         |
| GET    | `/admin/orders`                 | List orders         |
| PATCH  | `/admin/orders/:orderId/status` | Update order status |

### Withdrawals

| Method | Endpoint                                   | Action           |
| ------ | ------------------------------------------ | ---------------- |
| GET    | `/admin/withdrawals`                       | List withdrawals |
| POST   | `/admin/withdrawals/:withdrawalId/approve` | Approve          |
| POST   | `/admin/withdrawals/:withdrawalId/reject`  | Reject           |

## Query Parameters for List Endpoints

### Common Parameters

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sortBy` - Sort field (default: createdAt)
- `order` - asc or desc (default: desc)

### User Endpoint

- `search` - Search email/name/username/phone
- `banned` - true/false
- `role` - Filter by role

### Vendor Endpoint

- `search` - Search business name/email/contact
- `verified` - true/false

### Event Endpoint

- `search` - Search by name/description/location

### Order Endpoint

- `search` - Search by order reference
- `status` - PENDING, PAID, FAILED, CANCELLED

### Withdrawal Endpoint

- `status` - pending, approved, paid, rejected

## Request Body Examples

### Ban User

```json
{
  "reason": "Violating terms",
  "duration": 604800
}
```

### Update Role

```json
{
  "role": "vendor"
}
```

### Verify Vendor

```json
{
  "verified": true
}
```

### Update Order Status

```json
{
  "status": "PAID"
}
```

### Reject Withdrawal

```json
{
  "reason": "Invalid account details"
}
```

## Response Format

### Success

```json
{
  "success": true,
  "data": {},
  "message": "optional"
}
```

### Error

```json
{
  "success": false,
  "error": "Error message"
}
```

## HTTP Status Codes

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `404` - Not Found
- `500` - Server Error

## Admin Requirements

User must have:

- Valid session/authentication
- `admin` OR `superadmin` role

## Filtering Examples

### Get banned users

```
GET /api/admin/users?banned=true
```

### Get unverified vendors

```
GET /api/admin/vendors?verified=false
```

### Search users

```
GET /api/admin/users?search=john@example.com
```

### Pending withdrawals

```
GET /api/admin/withdrawals?status=pending
```

### Paginate results

```
GET /api/admin/users?page=2&limit=20
```

### Sort ascending

```
GET /api/admin/vendors?sortBy=createdAt&order=asc
```

## Notes

- Timestamps are in ISO 8601 UTC format
- User deletions are soft deletes (recoverable)
- User bans can have optional duration in seconds
- Withdrawal approvals track admin ID
- All operations are logged
