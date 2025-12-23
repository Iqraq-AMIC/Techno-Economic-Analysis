# SAFAPAC API Changelog

This document tracks all changes to the SAFAPAC API endpoints, request/response formats, and breaking changes.

**Current Version**: 2.0.0
**Last Updated**: December 1, 2025

---

## Version 2.0.0 (Current)

**Release Date**: November 2025
**Status**: Active Development

### Major Features

#### Authentication System Overhaul
- **BREAKING CHANGE**: Migrated from CSV-based authentication to JWT tokens
- Added `POST /api/v1/auth/login` endpoint
- Implemented bearer token authentication for all protected endpoints
- Added auto-logout functionality (60-minute token expiration)
- Password hashing with bcrypt
- Three-tier access level system (CORE, ADVANCE, ROADSHOW)

**Migration Impact**: Frontend must implement JWT token storage and header injection

#### Auto-Calculation on Create
- **NEW**: Projects automatically create and calculate "Scenario 1" on creation
- **NEW**: Scenarios are automatically calculated immediately after creation
- **BEHAVIOR CHANGE**: No longer need to call `/calculate` endpoint after creating scenarios
- Calculation failures no longer block resource creation (logged as warnings)

**Impact**: Reduces API calls from 2 (create + calculate) to 1 (create)

#### Improved Error Handling
- **NEW**: Calculation errors are caught separately from creation errors
- **NEW**: NaN and Infinity sanitization for JSON responses
- **IMPROVED**: More descriptive error messages with context
- **IMPROVED**: Consistent error response format across all endpoints

#### Master Data Consolidation
- **NEW**: `GET /api/v1/master-data` endpoint returns all master data in single request
- **IMPROVED**: Individual master data endpoints moved to `/api/v1/` namespace
- Reduces initial page load from 6+ API calls to 1 call

#### UUID Migration
- **BREAKING CHANGE**: User, Project, and Scenario IDs changed from Integer to UUID
- **IMPROVED**: Better security and distributed system compatibility
- **MIGRATION REQUIRED**: Frontend must handle UUID strings instead of integers

#### JSONB Field Renaming
- **BREAKING CHANGE**: Database columns renamed for consistency:
  - `user_inputs_json` → `user_inputs`
  - `techno_economics_json` → `techno_economics`
  - `financial_analysis_json` → `financial_analysis`
- **NO API IMPACT**: Response field names unchanged

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | JWT authentication |
| `GET` | `/api/v1/master-data` | All master data in one request |
| `POST` | `/api/v1/calculate/quick` | Calculation without saving |
| `GET` | `/api/v1/reference-data/{process}/{feedstock}/{country}` | Reference data for combination |

### Modified Endpoints

#### POST /api/v1/projects
- **CHANGED**: Auto-creates and auto-calculates Scenario 1
- **RESPONSE**: Now includes initial scenario data

#### POST /api/v1/projects/{project_id}/scenarios
- **CHANGED**: Auto-calculates scenario immediately after creation
- **RESPONSE**: Now includes calculation results
- **ERROR HANDLING**: Calculation failure returns scenario without results (no error)

#### POST /api/v1/scenarios/{scenario_id}/calculate
- **CHANGED**: Now updates relational columns (process_id, feedstock_id, country_id)
- **VALIDATION**: Validates process, feedstock, country names before calculation
- **ERROR**: Returns 400 if invalid names provided

### Removed Endpoints

None in this version.

### Deprecated Endpoints

None in this version.

---

## Version 1.x (Legacy)

**Status**: Deprecated
**End of Life**: November 2025

### Authentication
- CSV-based user authentication (deprecated)
- No JWT tokens
- Simple password verification

### Projects and Scenarios
- Integer-based IDs for users, projects, scenarios
- Manual calculation required after creation
- Separate create and calculate operations

### Master Data
- Individual endpoints only (no consolidated endpoint)
- Required 6+ API calls for initialization

---

## Breaking Changes Summary

### v2.0.0

1. **Authentication Method**
   - **Old**: CSV-based authentication
   - **New**: JWT bearer token authentication
   - **Action Required**: Frontend must implement token storage and Authorization header

2. **ID Format Change**
   - **Old**: Integer IDs (e.g., `123`)
   - **New**: UUID strings (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
   - **Action Required**: Update frontend ID handling and validation

3. **Auto-Calculation Behavior**
   - **Old**: Must call `/calculate` after creating projects/scenarios
   - **New**: Calculation happens automatically on creation
   - **Action Required**: Remove redundant calculation calls from frontend

4. **Process/Feedstock/Country Updates**
   - **Old**: Could update user_inputs JSON without updating relational columns
   - **New**: `/calculate` endpoint now syncs relational columns from input names
   - **Action Required**: Ensure process/feedstock/country names in JSON match master data

---

## Migration Guide: v1.x → v2.0

### Step 1: Update Authentication

**Old Code**:
```javascript
// v1.x - CSV authentication (example)
const response = await fetch('/api/v1/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
```

**New Code**:
```javascript
// v2.0 - JWT authentication
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();
localStorage.setItem('access_token', data.access_token);

// Include token in subsequent requests
const apiResponse = await fetch('/api/v1/projects', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
```

### Step 2: Update ID Handling

**Old Code**:
```javascript
// v1.x - Integer IDs
const projectId = 123;
const url = `/api/v1/projects/${projectId}`;
```

**New Code**:
```javascript
// v2.0 - UUID strings
const projectId = "550e8400-e29b-41d4-a716-446655440000";
const url = `/api/v1/projects/${projectId}`;

// Validation
function isValidUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}
```

### Step 3: Remove Redundant Calculation Calls

**Old Code**:
```javascript
// v1.x - Create then calculate
const createResponse = await fetch('/api/v1/projects', {
  method: 'POST',
  body: JSON.stringify(projectData)
});
const project = await createResponse.json();

// Separate calculation call needed
const calcResponse = await fetch(`/api/v1/scenarios/${scenarioId}/calculate`, {
  method: 'POST',
  body: JSON.stringify(inputs)
});
```

**New Code**:
```javascript
// v2.0 - Auto-calculated on create
const createResponse = await fetch('/api/v1/projects', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(projectData)
});
const project = await createResponse.json();
// Scenario 1 is already calculated! No second call needed.
```

### Step 4: Use Consolidated Master Data Endpoint

**Old Code**:
```javascript
// v1.x - Multiple API calls
const [processes, feedstocks, countries, utilities, products] = await Promise.all([
  fetch('/api/v1/process-technologies').then(r => r.json()),
  fetch('/api/v1/feedstocks').then(r => r.json()),
  fetch('/api/v1/countries').then(r => r.json()),
  fetch('/api/v1/utilities').then(r => r.json()),
  fetch('/api/v1/products').then(r => r.json())
]);
```

**New Code**:
```javascript
// v2.0 - Single consolidated call
const response = await fetch('/api/v1/master-data', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const masterData = await response.json();

// Access all data from single response
const processes = masterData.process_technologies;
const feedstocks = masterData.feedstocks;
const countries = masterData.countries;
const utilities = masterData.utilities;
const products = masterData.products;
const units = masterData.units;
```

---

## Upcoming Changes (Future Versions)

### Planned for v2.1

#### Pagination Support
- `GET /api/v1/projects` will support query parameters:
  - `page` (default: 1)
  - `page_size` (default: 20)
- Response will include metadata:
  ```json
  {
    "items": [...],
    "total": 150,
    "page": 1,
    "page_size": 20,
    "total_pages": 8
  }
  ```

#### Rate Limiting
- Authentication endpoints: 5 requests/minute
- Calculation endpoints: 10 requests/minute
- General endpoints: 100 requests/minute
- Headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

#### Enhanced Filtering
- `GET /api/v1/projects?filter=name:contains:SAF&sort=-created_at`
- Support for filtering and sorting on list endpoints

### Under Consideration for v3.0

#### GraphQL Support
- Alternative GraphQL endpoint alongside REST API
- Single query for complex nested data
- Reduced over-fetching

#### Webhooks
- Calculation completion webhooks
- Project update notifications
- User activity webhooks

#### Batch Operations
- `POST /api/v1/scenarios/batch` for creating multiple scenarios
- `DELETE /api/v1/projects/batch` for bulk deletions

#### Versioned API URLs
- Explicit version in URL: `/api/v2/projects`
- Support for multiple API versions simultaneously
- Gradual migration path for breaking changes

---

## Deprecation Policy

### Timeline
1. **Announcement**: Breaking changes announced 60 days before release
2. **Deprecation**: Old endpoint marked as deprecated in documentation
3. **Support Period**: Deprecated endpoints supported for 90 days
4. **Removal**: Deprecated endpoints removed in next major version

### Current Deprecations

None.

---

## API Versioning Strategy

### Current Strategy (v2.0)
- Major version in application version (`/api/v1` prefix)
- Breaking changes increment major version
- Backward-compatible changes released as minor versions

### Future Strategy (v3.0+)
- Move to URL-based versioning: `/api/v2/`, `/api/v3/`
- Support N-1 versions (current + one previous major version)
- Semantic versioning for API spec (OpenAPI)

---

## Changelog Best Practices

### Adding New Endpoint
```markdown
#### POST /api/v1/new-endpoint
- **NEW**: Brief description of what this endpoint does
- **REQUEST**: Example request body
- **RESPONSE**: Example response
- **USE CASE**: When to use this endpoint
```

### Modifying Existing Endpoint
```markdown
#### PUT /api/v1/existing-endpoint
- **CHANGED**: Description of what changed
- **BREAKING CHANGE** (if applicable): How this breaks backward compatibility
- **MIGRATION**: How to update code for the change
```

### Deprecating Endpoint
```markdown
#### DELETE /api/v1/old-endpoint
- **DEPRECATED**: This endpoint is deprecated as of vX.X.X
- **REASON**: Why it's being deprecated
- **REPLACEMENT**: Use this endpoint instead
- **REMOVAL DATE**: Will be removed in vX.X.X
```

---

## Version History

| Version | Release Date | Status | Notes |
|---------|--------------|--------|-------|
| 2.0.0 | Nov 2025 | **Current** | JWT auth, UUID IDs, auto-calculation |
| 1.x | Jul-Oct 2025 | Deprecated | CSV auth, integer IDs |

---

## Friday Integration Changes (Pending)

**Date**: December 5, 2025
**Status**: Scheduled

### Expected Changes from Frontend Integration

The following changes may be required after frontend delivery on Friday:

1. **API Contract Adjustments**
   - Potential request/response schema modifications
   - Additional validation requirements
   - New error scenarios

2. **Frontend-Driven Requirements**
   - New endpoints for specific UI needs
   - Modified response formats for visualization
   - Additional filtering/sorting capabilities

3. **Bug Fixes**
   - API issues discovered during integration
   - Edge cases not covered in current implementation

### Update Plan

1. Document all API changes made during Friday integration
2. Update this changelog with specific modifications
3. Update API_DOCUMENTATION.md with new/changed endpoints
4. Tag release as v2.0.1 (if backward-compatible) or v2.1.0 (if new features)

---

## Contact

For questions about API changes or migration assistance:
- **Backend Developer**: [Your Name] - [Your Email]
- **API Documentation**: See `docs/API_DOCUMENTATION.md`
- **Git Commit History**: Review commit messages for detailed change descriptions

---

**Document Version**: 1.0
**Last Updated**: December 1, 2025
**Maintained By**: Backend Development Team
