# API Reference

## Overview

All API endpoints follow REST conventions. Multi-tenant routing uses the `x-tenant-id` header.

**Base URL:** `http://localhost:3000/api`

---

## Setup & Provisioning

### Initialize Tenant

**POST** `/setup`

Create a new tenant with seed data (roles, org units, session).

**Request:**
```json
{
  "tenantName": "Greenwood Academy",
  "pack": "INSTITUTION" | "ORGANISATION" | "HYBRID"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "tenant": {
    "id": "uuid",
    "slug": "greenwood-academy",
    "name": "Greenwood Academy",
    "pack": "INSTITUTION",
    "timezone": "UTC",
    "status": "ACTIVE",
    "createdAt": "2026-07-26T00:00:00.000Z",
    "grantVersion": 1
  },
  "session": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "2026-2027",
    "startsOn": "2026-01-01",
    "endsOn": "2027-12-31",
    "isCurrent": true
  },
  "message": "Tenant 'Greenwood Academy' initialized with INSTITUTION pack"
}
```

**Error Responses:**
- `400` — Missing `tenantName` or `pack`
- `500` — Server error

---

### List All Tenants

**GET** `/setup`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "greenwood-academy",
      "name": "Greenwood Academy",
      "pack": "INSTITUTION",
      "status": "ACTIVE",
      ...
    }
  ]
}
```

---

## Users

### List Users

**GET** `/users`

**Headers:**
```
x-tenant-id: greenwood-academy
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "code": "STU001",
      "email": "alice@greenwood.edu",
      "firstName": "Alice",
      "lastName": "Johnson",
      "displayName": "Alice Johnson",
      "gender": "F",
      "dob": "2008-05-15",
      "status": "ACTIVE",
      "joinedOn": "2026-07-26T00:00:00.000Z",
      "photoKey": null,
      "lastLoginAt": null
    }
  ]
}
```

---

### Create User

**POST** `/users`

**Headers:**
```
x-tenant-id: greenwood-academy
Content-Type: application/json
```

**Request:**
```json
{
  "code": "STU001",
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@greenwood.edu",
  "phone": "+91-9876543210",
  "gender": "F",
  "dob": "2008-05-15"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "code": "STU001",
  "firstName": "Alice",
  "lastName": "Johnson",
  "displayName": "Alice Johnson",
  "email": "alice@greenwood.edu",
  "phone": "+91-9876543210",
  "gender": "F",
  "dob": "2008-05-15",
  "status": "ACTIVE",
  "joinedOn": "2026-07-26T12:34:56.789Z"
}
```

**Error Responses:**
- `400` — Invalid input (validation error)
- `409` — Code or email already exists for this tenant

---

### Get User

**GET** `/users/{id}`

**Headers:**
```
x-tenant-id: greenwood-academy
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "code": "STU001",
  "firstName": "Alice",
  ...
}
```

**Error Responses:**
- `404` — User not found

---

### Update User

**PUT** `/users/{id}`

**Headers:**
```
x-tenant-id: greenwood-academy
Content-Type: application/json
```

**Request:** (all fields optional)
```json
{
  "firstName": "Alexandra",
  "email": "alex@greenwood.edu"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "code": "STU001",
  "firstName": "Alexandra",
  "email": "alex@greenwood.edu",
  ...
}
```

**Error Responses:**
- `400` — Invalid input
- `404` — User not found

---

### Delete (Archive) User

**DELETE** `/users/{id}`

**Headers:**
```
x-tenant-id: greenwood-academy
```

Soft-deletes the user (sets `status = ARCHIVED` and `leftOn` timestamp).

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User archived"
}
```

**Error Responses:**
- `404` — User not found
- `500` — Server error

---

## Roles

### List Roles

**GET** `/roles?pack=INSTITUTION`

**Headers:**
```
x-tenant-id: greenwood-academy
```

**Query Parameters:**
- `pack` (optional) — Filter by `INSTITUTION`, `ORGANISATION`, or `HYBRID`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "key": "INSTITUTION_HEAD",
      "title": "Principal / Director",
      "pack": "INSTITUTION",
      "rank": 1,
      "kind": "LINE",
      "system": true,
      "mayHoldReports": true,
      "maxDelegableRank": 9,
      "color": "#366092",
      "icon": "crown",
      "sortOrder": 1
    }
  ]
}
```

---

### Create Custom Role

**POST** `/roles`

**Headers:**
```
x-tenant-id: greenwood-academy
Content-Type: application/json
```

**Request:**
```json
{
  "key": "CUSTOM_ROLE",
  "title": "My Custom Role",
  "rank": 4,
  "kind": "STAFF",
  "mayHoldReports": false,
  "maxDelegableRank": 5,
  "color": "#FF5733",
  "icon": "star"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "key": "CUSTOM_ROLE",
  "title": "My Custom Role",
  "pack": "CUSTOM",
  "rank": 4,
  "kind": "STAFF",
  "system": false,
  "mayHoldReports": false,
  "maxDelegableRank": 5,
  "color": "#FF5733",
  "icon": "star",
  "sortOrder": 100
}
```

**Error Responses:**
- `400` — Invalid input
- `409` — Role key already exists

---

## Error Responses

All errors return JSON in this format:

```json
{
  "error": "Description of the error"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `404` | Not Found |
| `409` | Conflict (duplicate, constraint violation) |
| `500` | Internal Server Error |

---

## Future Endpoints (Planned)

These will be implemented in later phases:

```
GET  /positions                  # List all positions
POST /positions                  # Create position (set reporting)
PUT  /positions/{id}             # Move person in hierarchy

GET  /org-units                  # List org units
POST /org-units                  # Create department/team
PUT  /org-units/{id}             # Update org unit

GET  /roles/{id}                 # Get role detail
PUT  /roles/{id}                 # Update role

GET  /user-roles                 # List role assignments
POST /user-roles                 # Assign role to user
PUT  /user-roles/{id}            # Update role assignment

GET  /attendance                 # List attendance
POST /attendance                 # Mark attendance

GET  /leave                      # List leave requests
POST /leave                      # Request leave

GET  /sessions                   # List sessions
POST /sessions                   # Create session (year rollover)
```

---

## Testing

### cURL Examples

```bash
# Create tenant
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{"tenantName": "Test", "pack": "INSTITUTION"}'

# List users
curl http://localhost:3000/api/users \
  -H "x-tenant-id: test"

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: test" \
  -d '{"code": "U001", "firstName": "John", "lastName": "Doe", "email": "john@test.com"}'
```

### Postman Collection

(To be created — save API calls as a collection for easy testing)

---

## Rate Limiting

(Not implemented in MVP — added in Spring Boot migration)

---

## Versioning

(Not implemented in MVP — fixed to v1 for now)

Future: `/v1/users`, `/v2/users`, etc.

---

## Changelog

### v0.0.1 (Current)
- Initial MVP
- Setup, Users, Roles endpoints
- Excel backend
