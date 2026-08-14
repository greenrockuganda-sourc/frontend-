# Frontend Migration Guide: Security Hardening

This guide explains all changes made to the frontend code for security hardening and helps developers adapt to the new authentication model.

## Quick Summary

| Aspect | Before | After |
|--------|--------|-------|
| Token Storage | localStorage | HttpOnly Cookies |
| Auth Header | `x-forward-auth-token` | Cookies (automatic) |
| Token in Frontend | Yes | No |
| Role Validation | Client-side | Backend-only |
| Login Function | Receives tokens | No tokens |
| Page Components | Receive `token` prop | No `token` prop |
| Logout | Clears localStorage | Invalidates session |

---

## Changed Files

### 1. **src/lib/api.ts** - Main API Layer

#### What Changed
- Removed all token parameters from functions
- Added `credentials: 'include'` to all fetch requests
- Removed `registerAuthTokenUpdater` callback
- Added `registerAuthSessionCallback` for session changes
- Improved error handling

#### Migration for Component Developers
```typescript
// BEFORE
const data = await fetchProfile(accessToken)

// AFTER
const data = await fetchProfile()
// No token needed - browser handles cookies
```

#### Function Signature Changes
```typescript
// BEFORE
export async function fetchProfile(token: string)
export async function login(identifier: string, password: string) -> { access, refresh, user }
export async function logout(token: string)

// AFTER
export async function fetchProfile()
export async function login(identifier: string, password: string) -> { user? }
export async function logout()
```

---

### 2. **src/App.tsx** - Main App Component

#### Key Changes
1. Removed localStorage usage
2. Removed `accessToken` state variable
3. Added `isAuthenticated` state
4. Removed client-side role validation
5. Removed token prop from all page components
6. Simplified auth flow

#### State Changes
```typescript
// BEFORE
const [accessToken, setAccessToken] = useState(() => localStorage.getItem('access'))
const [user, setUser] = useState(() => {
  const stored = localStorage.getItem('user')
  return stored ? JSON.parse(stored) : null
})

// AFTER
const [isAuthenticated, setIsAuthenticated] = useState(true)
const [user, setUser] = useState<UserProfile | null>(null)
```

#### Component Rendering
```typescript
// BEFORE
if (!accessToken) {
  return <Login onLogin={handleLogin} />
}

return <Dashboard token={accessToken} user={user} />

// AFTER
if (!isAuthenticated) {
  return <Login onLogin={handleLogin} />
}

return <Dashboard user={user} />
```

#### Effect Hook Changes
```typescript
// BEFORE - Validated role on client
useEffect(() => {
  fetchProfile(accessToken).then(profile => {
    if (!['Seller', 'Admin'].includes(profile.role)) {
      clearAuthSession()
    }
    setUser(profile)
  })
}, [accessToken])

// AFTER - No role validation, backend handles it
useEffect(() => {
  if (!isAuthenticated) return
  
  fetchProfile().then(profile => {
    setUser(profile)
  }).catch(error => {
    if (error.message.includes('401')) {
      setIsAuthenticated(false)
    }
  })
}, [isAuthenticated])
```

---

### 3. **src/pages/Login.tsx** - Login Component

#### What Changed
- Removed token handling from response
- Removed client-side role validation
- Simplified onLogin callback

#### Function Signature
```typescript
// BEFORE
interface LoginProps {
  onLogin: (accessToken: string, refreshToken: string, user: any) => void
}

// AFTER
interface LoginProps {
  onLogin: () => void
}
```

#### Login Logic
```typescript
// BEFORE - Validated role and handled tokens
const data = await login(identifier, password)
const user = data.user || { email: identifier }
if (!user.role || !['Seller', 'Admin'].includes(user.role)) {
  setError('Access denied. Only authorized dashboard users can sign in.')
  return
}
onLogin(data.access, data.refresh, user)

// AFTER - No role check, no token handling
await login(identifier, password)
onLogin()  // That's it!
```

---

### 4. **lib/django-api.ts** - Django Integration

#### What Changed
- Added `credentials: 'include'` to all fetch requests
- Removed token reading from localStorage
- Removed token setter/getter functions
- Added security documentation

#### Example
```typescript
// BEFORE
const token = localStorage.getItem('access') || ''
const headers: Record<string, string> = {}
if (token) {
  headers['Authorization'] = `Bearer ${token}`
}
const response = await fetch(url, { headers })

// AFTER
const response = await fetch(url, {
  credentials: 'include', // Browser handles cookies
})
```

---

### 5. **lib/api.ts** - Basic API Helper

#### What Changed
- Added `credentials: 'include'` to apiCall
- Removed custom header handling
- Improved error messages

#### Code
```typescript
// BEFORE
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, headers })
}

// AFTER
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies
    headers: { 'Content-Type': 'application/json', ...options.headers }
  })
}
```

---

### 6. **vite.config.ts** - Build Configuration

#### What Changed
- Require HTTPS in production
- Enable cookie domain rewrite for proxying

#### Configuration
```typescript
// BEFORE
proxy: {
  '/api': {
    secure: false,  // ❌ Insecure
  }
}

// AFTER
proxy: {
  '/api': {
    secure: process.env.NODE_ENV === 'production' || !backendUrl.includes('localhost'),
    cookieDomainRewrite: { '*': '' }  // Enable cookies
  }
}
```

---

## Updating Page Components

If you have custom page components that currently use the `token` prop:

### Before
```typescript
interface ProductsProps {
  token: string
  onNavigate: (page: string) => void
}

export default function Products({ token, onNavigate }: ProductsProps) {
  const [products, setProducts] = useState([])
  
  useEffect(() => {
    fetchProducts(token).then(setProducts)
  }, [token])
}
```

### After
```typescript
interface ProductsProps {
  onNavigate: (page: string) => void
}

export default function Products({ onNavigate }: ProductsProps) {
  const [products, setProducts] = useState([])
  
  useEffect(() => {
    fetchProducts().then(setProducts)  // No token needed
  }, [])
}
```

---

## Testing Your Changes

### 1. Verify Tokens Not in localStorage
```javascript
// Open DevTools Console
console.log(localStorage.getItem('access'))  // Should be null
console.log(localStorage.getItem('refresh'))  // Should be null
console.log(localStorage.getItem('user'))  // Should be null
```

### 2. Verify Cookies Sent
```javascript
// In Network tab of DevTools
// Check any API request - look for Cookie header
// Should see: Cookie: access_token=...; refresh_token=...
```

### 3. Test Login Flow
```
1. Open DevTools → Storage → Cookies
2. Clear all cookies
3. Log in
4. Check cookies are set (access_token, refresh_token)
5. Verify localStorage is empty
6. Verify profile loads
7. Log out
8. Verify cookies cleared
9. Verify redirected to login
```

### 4. Test 401 Handling
```
1. Set access_token cookie to invalid value
2. Try to navigate to dashboard
3. Should get 401 error
4. Should redirect to login
5. localStorage should still be empty
```

---

## Common Migration Issues

### Issue 1: "token is undefined" Error
**Cause:** Component still trying to use token prop
**Fix:**
```typescript
// Remove token from function calls
- const data = await fetchProducts(token)
+ const data = await fetchProducts()
```

### Issue 2: Component Props Show Error
**Cause:** Component definition still expects token prop
**Fix:**
```typescript
// Update interface
interface Props {
- token: string
  onNavigate: (page: string) => void
}

export default function MyComponent({ onNavigate }: Props) {
```

### Issue 3: localStorage Access Errors
**Cause:** Code still trying to read from localStorage
**Fix:**
```typescript
// Remove all localStorage references
- const token = localStorage.getItem('access')
- localStorage.setItem('user', JSON.stringify(data))
```

### Issue 4: 401 Errors After Changes
**Cause:** Backend not configured for cookies yet
**Check:**
- [ ] Backend sets HttpOnly cookies on login
- [ ] Backend validates cookies on each request
- [ ] Frontend uses `credentials: 'include'`

---

## New Callback System

### Old System (Token-Based)
```typescript
registerAuthTokenUpdater((token) => {
  setAccessToken(token)
})
```

### New System (Session-Based)
```typescript
registerAuthSessionCallback((isAuthenticated) => {
  setIsAuthenticated(isAuthenticated)
})
```

---

## Environment Variables

No new environment variables needed, but ensure:

```bash
# .env or Railway environment
VITE_API_BASE_URL=https://api.example.com  # Must be HTTPS in production
```

---

## Rollback Plan

If you need to rollback (not recommended):

1. The old code is in git history
2. `git log --oneline src/lib/api.ts` to find previous version
3. `git show <commit>:src/lib/api.ts` to view old code

However, **do not rollback** - the new system is more secure and should be maintained.

---

## Performance Impact

✅ **No negative impact** - actually slightly better:
- Fewer bytes sent (no token in requests)
- Cookies cached by browser
- Automatic cookie management by OS
- Same number of round trips

---

## Security Benefits

✅ **Much more secure:**
- Tokens not exposed to XSS
- Cookies inaccessible to JavaScript
- Backend has full control over session
- Authorization validated on server for every request
- No client-side secrets

---

## Next Steps

1. ✅ Frontend changes complete
2. ⏳ Backend developer should implement `BACKEND_REQUIREMENTS.md`
3. ⏳ Test the complete flow (see Testing section)
4. ⏳ Deploy with HTTPS enabled
5. ⏳ Monitor logs for auth issues

---

## Questions?

1. Read `SECURITY_HARDENING.md` for detailed explanation
2. Read `BACKEND_REQUIREMENTS.md` for backend setup
3. Check the code comments (marked with `// SECURITY:`)
4. Review error logs for auth failures

