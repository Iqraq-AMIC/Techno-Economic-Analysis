# Backend Optimization Plan for Concurrent Users

## Current Status
- Framework: FastAPI (async-capable) ✅
- Server: Uvicorn ASGI ✅
- Database: PostgreSQL with SQLAlchemy
- Connection Pool: **Configured (pool_size=20, max_overflow=10)** ✅
- CRUD Layer: **Async with asyncpg** ✅
- Calculation Engine: **Background Tasks with polling** ✅
- Master Data Cache: **In-memory with 1-hour TTL** ✅

---

## Completed Optimizations

### ✅ Priority 1: Database Connection Pool Configuration
**Status: IMPLEMENTED**

See `backend/PERFORMANCE_IMPLEMENTATION.md` for details.

### ✅ Priority 2: Async Database Operations (Option A)
**Status: IMPLEMENTED**

See `docs/PERFORMANCE_IMPLEMENTATION.md` for details.

---

### ✅ Priority 3: Background Tasks for Calculations
**Status: IMPLEMENTED**

See `docs/PERFORMANCE_IMPLEMENTATION.md` for details.

---

### ✅ Priority 4: Master Data Caching
**Status: IMPLEMENTED**

See `docs/PERFORMANCE_IMPLEMENTATION.md` for details.

---

## Remaining Optimizations

### 🔵 **Priority 5: Implement Rate Limiting**
**Impact: Low | Effort: Low | Urgency: Low**

#### Solution: Protect against abuse

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.post("/{scenario_id}/calculate")
@limiter.limit("10/minute")  # Max 10 calculations per minute per IP
async def calculate_scenario(...):
    ...
```

#### TODO:
- [ ] Install slowapi: `pip install slowapi`
- [ ] Configure limiter in main.py
- [ ] Add rate limits to calculation endpoint
- [ ] Add rate limits to auth endpoints (prevent brute force)

---

## 📈 Performance Targets

| Metric | Before | After P1+P2 ✅ | After P3+P4 ✅ | After P5 |
|--------|--------|---------------|----------------|----------|
| Concurrent Users | 5-10 | **50-100** | **200+** | 200+ |
| Avg Response Time | 100-200ms | **30-80ms** | **20-50ms** | 20-50ms |
| Calculation Blocking | 2-5s | 2-5s (in thread) | **Non-blocking** | Non-blocking |
| DB Connection Errors | Frequent | **Very Rare** | **None** | None |
| Master Data Queries | Every request | Every request | **Cached (1hr TTL)** | Cached |

---

## 🚀 Remaining Implementation

### Final Phase: Rate Limiting (P5)
- [ ] Install slowapi: `pip install slowapi`
- [ ] Configure limiter in main.py
- [ ] Add rate limits to calculation endpoint
- [ ] Add rate limits to auth endpoints (prevent brute force)

---

## 🧪 Load Testing Commands

```bash
# Install load testing tool
pip install locust

# Run test (example)
locust -f load_test.py --host=http://localhost:8000 --users 50 --spawn-rate 5
```

Example `load_test.py`:
```python
from locust import HttpUser, task, between

class SAFAPACUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Login
        response = self.client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "testpassword"
        })
        self.token = response.json()["accessToken"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def get_projects(self):
        self.client.get("/api/v1/projects", headers=self.headers)

    @task(2)
    def get_master_data(self):
        self.client.get("/api/v1/master-data", headers=self.headers)

    @task(1)
    def calculate_scenario(self):
        # Simulate calculation request
        self.client.post(
            f"/api/v1/scenarios/{scenario_id}/calculate",
            headers=self.headers,
            json={...}
        )
```

---

## ❓ FAQ

### Q: Do I need to make ALL functions async?
**A:** No. Focus on:
- Read operations that are called frequently
- Operations that fetch large datasets
- Keep simple write operations synchronous initially

### Q: Will async make my calculations faster?
**A:** No. Async doesn't speed up CPU-bound work (calculations). It only helps with I/O-bound operations (database queries, network calls). Use background tasks for calculations.

### Q: Can I use both sync and async functions?
**A:** Yes! FastAPI supports both. You can mix them:
```python
@router.get("/sync")
def sync_endpoint():  # Runs in thread pool automatically
    return crud.sync_function()

@router.get("/async")
async def async_endpoint():  # Runs in event loop
    return await crud.async_function()
```

### Q: How many workers should I run?
**A:** Formula: `workers = (2 x CPU_cores) + 1`
- 4-core machine: 9 workers
- Each worker handles requests independently
- Use with uvicorn: `uvicorn main:app --workers 9`

---

## 📚 References

- [FastAPI Async SQL Databases](https://fastapi.tiangolo.com/advanced/async-sql-databases/)
- [SQLAlchemy 2.0 Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [Database Connection Pooling](https://docs.sqlalchemy.org/en/20/core/pooling.html)
