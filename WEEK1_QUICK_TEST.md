# Week 1 Quick Test Guide

**Run these tests after npm install to verify Week 1 is working**

---

## Prerequisites

```bash
# 1. Install dependencies
npm install

# 2. Setup .env.local (get keys from Cloudinary & Resend websites)
cat > .env.local << 'EOF'
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EOF

# 3. Start dev server
npm run dev
```

---

## Test 1: Tenant Initialization ✅

Creates a complete tenant with Excel schema, sample data, roles, and branding.

```bash
curl -X POST http://localhost:3000/api/tenants/init \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Acme Corporation",
    "pack": "ORGANISATION",
    "adminEmail": "admin@acme.com",
    "adminName": "Alice Admin"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantName": "Acme Corporation",
  "adminEmail": "admin@acme.com",
  "filePath": "data/tenants/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440000.xlsx"
}
```

**Check:** Look for file at `data/tenants/[tenant-id]/[tenant-id].xlsx`

---

## Test 2: Read Branding Config ✅

Get tenant's branding colors and logo settings.

```bash
# Using tenant ID from Test 1
TENANT_ID="550e8400-e29b-41d4-a716-446655440000"

curl "http://localhost:3000/api/branding?tenant_id=$TENANT_ID"
```

**Expected Response:**
```json
{
  "data": {
    "primary_color": "#2563eb",
    "secondary_color": "#7c3aed",
    "domain": "acme-corporation.erp"
  }
}
```

---

## Test 3: Update Branding ✅

Change tenant colors and logo.

```bash
TENANT_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X PUT http://localhost:3000/api/branding \
  -H "Content-Type: application/json" \
  -d "{
    \"tenant_id\": \"$TENANT_ID\",
    \"branding\": {
      \"primary_color\": \"#dc2626\",
      \"secondary_color\": \"#f59e0b\",
      \"logo_url\": \"https://example.com/logo.png\"
    },
    \"actor_id\": \"user-123\"
  }"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "primary_color": "#dc2626",
    "secondary_color": "#f59e0b",
    "logo_url": "https://example.com/logo.png"
  }
}
```

---

## Test 4: Read Module Features ✅

Get all feature toggles for tenant.

```bash
TENANT_ID="550e8400-e29b-41d4-a716-446655440000"

curl "http://localhost:3000/api/module-features?tenant_id=$TENANT_ID"
```

**Expected Response:**
```json
{
  "data": [
    {
      "feature_id": "retail_barcode_scan",
      "name": "Barcode Scanning",
      "category": "Scanning & Speed",
      "enabled": false,
      "description": "Scan barcodes for fast product entry",
      "phase": 2
    },
    {
      "feature_id": "retail_low_stock",
      "name": "Low Stock Alerts",
      "category": "Alerts & Reminders",
      "enabled": true,
      "description": "Get notified when stock falls below threshold",
      "phase": 2
    },
    ...more features
  ]
}
```

---

## Test 5: Upload Image to Cloudinary ✅

Upload a test image file.

```bash
TENANT_ID="550e8400-e29b-41d4-a716-446655440000"

# Create a test image (1x1 pixel PNG)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\r\xf6Y\x00\x00\x00\x00IEND\xaeB`\x82' > test.png

curl -X POST http://localhost:3000/api/uploads \
  -F "file=@test.png" \
  -F "tenant_id=$TENANT_ID"
```

**Expected Response:**
```json
{
  "url": "https://res.cloudinary.com/your_cloud_name/image/upload/erp/550e8400-e29b-41d4-a716-446655440000/test.png",
  "publicId": "erp/550e8400-e29b-41d4-a716-446655440000/test.png",
  "width": 1,
  "height": 1,
  "size": 67
}
```

---

## Test 6: Send Invitation Email ✅

Send a test invitation email via Resend.

```bash
curl -X POST http://localhost:3000/api/emails/invite \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "userName": "John Doe",
    "tenantName": "Acme Corporation",
    "inviteLink": "https://erpsystem.com/accept-invite?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "messageId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Note:** Check your inbox (or Resend dashboard) for the email. Free tier allows 100/day.

---

## Test 7: Send Daily Sales Summary Email ✅

```bash
curl -X POST http://localhost:3000/api/emails/summary \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@acme.com",
    "managerName": "Bob Manager",
    "tenantName": "Acme Corporation",
    "summary": {
      "totalSales": 45000,
      "itemsSold": 312,
      "refunds": 2,
      "cash": 30000,
      "card": 15000,
      "topProducts": [
        { "name": "Widget A", "qty": 150 },
        { "name": "Gadget B", "qty": 98 },
        { "name": "Doohickey C", "qty": 64 }
      ]
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "messageId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Test 8: Read Positions (Hierarchy) ✅

```bash
TENANT_ID="550e8400-e29b-41d4-a716-446655440000"

curl "http://localhost:3000/api/positions?tenant_id=$TENANT_ID"
```

**Expected Response:**
```json
{
  "data": [
    {
      "user_id": "admin-user-id",
      "org_unit_id": "org-unit-id",
      "title_override": "Administrator",
      "valid_from": "2026-07-26T00:00:00Z",
      "session_id": "SESSION_2026"
    }
  ]
}
```

---

## Test 9: Read Organization Units ✅

```bash
TENANT_ID="550e8400-e29b-41d4-a716-446655440000"

curl "http://localhost:3000/api/org-units?tenant_id=$TENANT_ID"
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "org-unit-id",
      "name": "Main Office",
      "location_code": "HQ",
      "status": "ACTIVE"
    }
  ]
}
```

---

## Test 10: Read Capabilities (Permissions) ✅

```bash
TENANT_ID="550e8400-e29b-41d4-a716-446655440000"

# Read all capabilities
curl "http://localhost:3000/api/capabilities?tenant_id=$TENANT_ID"

# Read capabilities for specific user
curl "http://localhost:3000/api/capabilities?tenant_id=$TENANT_ID&user_id=admin-user-id"
```

**Expected Response:**
```json
{
  "data": [
    {
      "user_id": "admin-user-id",
      "capability": "platform.tenant.provision",
      "scope": "TENANT",
      "granted_by": "system",
      "granted_at": "2026-07-26T00:00:00Z",
      "delegable": true
    }
  ]
}
```

---

## Troubleshooting

### Cloudinary upload fails
- Check `.env.local` has correct CLOUD_NAME
- Verify API keys at https://cloudinary.com/console
- Check cloud storage quota

### Email not sending
- Check `.env.local` has RESEND_API_KEY
- Verify API key at https://resend.com
- Check email domain is whitelisted in Resend
- Check free tier limit (100/day)

### Tenant file not created
- Check `data/tenants/` directory exists
- Verify write permissions on directory
- Check disk space

### TypeScript errors
- Run `npm run type-check`
- Check all imports are correct
- Verify `lib/` files exist

---

## Success Criteria ✅

All tests should pass:
- [ ] Test 1: Tenant created with Excel file
- [ ] Test 2: Branding config reads
- [ ] Test 3: Branding config updates
- [ ] Test 4: Features list returns
- [ ] Test 5: Image uploads to Cloudinary
- [ ] Test 6: Invitation email sends
- [ ] Test 7: Summary email sends
- [ ] Test 8: Positions readable
- [ ] Test 9: Org units readable
- [ ] Test 10: Capabilities readable

---

**All tests passing = Week 1 COMPLETE ✅**

Ready for Week 2: UI Components & Portal Integration
