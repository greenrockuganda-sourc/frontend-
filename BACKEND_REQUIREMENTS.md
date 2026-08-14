# Backend Authentication Requirements

This document outlines all backend changes required to support the new secure authentication system implemented in the frontend.

## Summary of Frontend Changes

The frontend now uses **HttpOnly cookie-based authentication** instead of localStorage tokens. This means:

1. ✅ The frontend **never stores tokens** anywhere
2. ✅ The frontend **never handles tokens** in code
3. ✅ The browser **automatically includes cookies** in all requests
4. ✅ The backend **validates on every request**
5. ✅ Authorization is **backend-only responsibility**

---

## Required Backend Implementation

### 1. Cookie-Based Authentication Setup

#### 1.1 Django Settings Configuration

```python
# settings.py

# Enable HTTPS and secure cookies
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'

SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
SESSION_COOKIE_AGE = 3600  # 1 hour

# If using JWT tokens (recommended)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': settings.SECRET_KEY,
    'VERIFYING_KEY': None,
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# Security headers
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
    'script-src': ("'self'", "'unsafe-inline'"),
    'style-src': ("'self'", "'unsafe-inline'"),
}
```

#### 1.2 Custom JWT Response Middleware

```python
# middleware.py
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

class JWTCookieMiddleware(MiddlewareMixin):
    """
    Sets JWT tokens in HttpOnly cookies after authentication
    """
    def process_response(self, request, response):
        # Get tokens from JWT library if generated
        if hasattr(request, 'auth_tokens'):
            access_token = request.auth_tokens.get('access')
            refresh_token = request.auth_tokens.get('refresh')
            
            if access_token:
                response.set_cookie(
                    'access_token',
                    access_token,
                    max_age=15 * 60,  # 15 minutes
                    secure=True,
                    httponly=True,
                    samesite='Strict',
                    path='/',
                )
            
            if refresh_token:
                response.set_cookie(
                    'refresh_token',
                    refresh_token,
                    max_age=7 * 24 * 60 * 60,  # 7 days
                    secure=True,
                    httponly=True,
                    samesite='Strict',
                    path='/',
                )
        
        return response
```

---

### 2. Login Endpoint

**Endpoint:** `POST /api/auth/login/`

```python
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

class LoginView(APIView):
    permission_classes = []  # Allow unauthenticated access
    
    def post(self, request):
        email_or_phone = request.data.get('email_or_phone')
        password = request.data.get('password')
        
        if not email_or_phone or not password:
            return Response(
                {'detail': 'Email/phone and password required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find user by email or phone
        try:
            user = User.objects.get(
                Q(email=email_or_phone) | Q(phone_number=email_or_phone)
            )
        except User.DoesNotExist:
            return Response(
                {'detail': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Validate password
        if not user.check_password(password):
            return Response(
                {'detail': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # ⚠️ CRITICAL: Validate user role here
        if user.role not in ['Admin', 'Seller']:
            return Response(
                {'detail': 'Access denied. Only Admin and Seller users can access this system.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        response = Response({
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
                'role': user.role,
            }
        }, status=status.HTTP_200_OK)
        
        # ✅ Set cookies (NOT returned in response body)
        response.set_cookie(
            'access_token',
            access_token,
            max_age=15 * 60,  # 15 minutes
            secure=True,
            httponly=True,  # ⚠️ IMPORTANT: Can't be accessed by JavaScript
            samesite='Strict',
            path='/',
        )
        
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=7 * 24 * 60 * 60,  # 7 days
            secure=True,
            httponly=True,
            samesite='Strict',
            path='/',
        )
        
        return response
```

---

### 3. Logout Endpoint

**Endpoint:** `POST /api/auth/logout/`

```python
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        response = Response(
            {'detail': 'Logged out successfully'},
            status=status.HTTP_200_OK
        )
        
        # Clear cookies
        response.delete_cookie(
            'access_token',
            samesite='Strict',
            path='/',
        )
        response.delete_cookie(
            'refresh_token',
            samesite='Strict',
            path='/',
        )
        
        # Optional: Blacklist token to prevent reuse
        # token = request.auth
        # BlacklistedToken.objects.create(token=token)
        
        return response
```

---

### 4. JWT Authentication Backend

```python
# authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import exceptions

class CookieJWTAuthentication(JWTAuthentication):
    """
    Extracts JWT from HttpOnly cookies instead of Authorization header
    """
    def get_validated_token(self, raw_token):
        try:
            return super().get_validated_token(raw_token)
        except exceptions.AuthenticationFailed:
            raise exceptions.AuthenticationFailed(
                'Invalid or expired token. Please sign in again.'
            )
    
    def authenticate(self, request):
        # Get token from cookies
        raw_token = request.COOKIES.get('access_token')
        
        if not raw_token:
            # Check if it's a refresh request
            if request.path == '/api/auth/refresh/':
                raw_token = request.COOKIES.get('refresh_token')
            else:
                return None
        
        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        
        return (user, validated_token)
```

---

### 5. Profile Endpoint

**Endpoint:** `GET /api/user/profile/`

```python
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # ⚠️ IMPORTANT: Validate authorization here
        # Don't trust any role info from frontend
        if not user.is_authenticated:
            return Response(
                {'detail': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if user.role not in ['Admin', 'Seller']:
            return Response(
                {'detail': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return Response({
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone_number': user.phone_number,
            'role': user.role,
        })
```

---

### 6. RBAC (Role-Based Access Control)

```python
# permissions.py
from rest_framework import permissions

class IsAdminOrSeller(permissions.BasePermission):
    """Allow only Admin and Seller users"""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['Admin', 'Seller']
        )

class IsAdmin(permissions.BasePermission):
    """Allow only Admin users"""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'Admin'
        )

class IsSeller(permissions.BasePermission):
    """Allow only Seller users"""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'Seller'
        )
```

---

### 7. Apply RBAC to All Endpoints

```python
# views.py - Example Dashboard View
from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action

class AdminDashboardViewSet(ViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrSeller]
    
    def list(self, request):
        # ⚠️ Every endpoint MUST validate authorization
        if request.user.role not in ['Admin', 'Seller']:
            return Response(
                {'detail': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Your logic here
        return Response({'message': 'Dashboard data'})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def admin_only_action(self, request, pk=None):
        # Only admins can access
        return Response({'message': 'Admin only action'})

# Apply to other endpoints
class ProductsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrSeller]
    
    def perform_create(self, serializer):
        # Validate on every mutation
        if self.request.user.role != 'Admin':
            raise PermissionDenied('Only admins can create products')
        serializer.save()
```

---

### 8. CORS Configuration

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ... other middleware
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://yourfrontend.com',
]

CORS_ALLOW_CREDENTIALS = True  # ⚠️ IMPORTANT: Allow cookies in cross-origin requests

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

---

## Testing the Backend

### Test 1: Login and Cookie Generation

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email_or_phone": "user@example.com", "password": "password123"}' \
  -v

# Look for Set-Cookie headers in response
# Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict
# Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict
```

### Test 2: Authenticated Request

```bash
curl -X GET http://localhost:8000/api/user/profile/ \
  -H "Cookie: access_token=<TOKEN_HERE>" \
  -v

# Should return 200 with user profile
```

### Test 3: Invalid Role Access

```bash
# Login with non-admin user
# Try to access admin endpoint
curl -X GET http://localhost:8000/api/admin/dashboard/ \
  -H "Cookie: access_token=<SELLER_TOKEN>" \
  -v

# Should return 403 Forbidden
```

### Test 4: Logout Clears Cookies

```bash
curl -X POST http://localhost:8000/api/auth/logout/ \
  -H "Cookie: access_token=<TOKEN>" \
  -v

# Look for Set-Cookie with empty/Max-Age=0 values
```

---

## API Endpoints Summary

| Method | Endpoint | Authentication | Role | Purpose |
|--------|----------|------------------|------|---------|
| POST | `/api/auth/login/` | None | Any | User login |
| POST | `/api/auth/logout/` | Cookie | Authenticated | User logout |
| GET | `/api/user/profile/` | Cookie | Admin/Seller | Get user profile |
| PUT | `/api/user/profile/` | Cookie | Admin/Seller | Update profile |
| GET | `/api/admin/dashboard/` | Cookie | Admin/Seller | Dashboard data |
| * | All other endpoints | Cookie | Varies | Validate role per endpoint |

---

## Common Issues & Solutions

### Issue 1: Cookies Not Being Set
**Problem:** Login succeeds but no cookies in response
**Solution:** Check:
- [ ] `secure=True` only works with HTTPS
- [ ] Frontend uses `credentials: 'include'`
- [ ] CORS allows credentials: `CORS_ALLOW_CREDENTIALS = True`
- [ ] Cookie attributes are correct (HttpOnly, SameSite)

### Issue 2: 401 Errors After Login
**Problem:** Token is set but endpoints return 401
**Solution:** Check:
- [ ] Authentication class configured correctly
- [ ] Token cookie name matches (`access_token`)
- [ ] JWT settings configured correctly
- [ ] User is actually authenticated

### Issue 3: CORS Errors
**Problem:** Cross-origin requests fail with CORS error
**Solution:** Check:
- [ ] Frontend URL in `CORS_ALLOWED_ORIGINS`
- [ ] `CORS_ALLOW_CREDENTIALS = True`
- [ ] Correct CORS headers configured

### Issue 4: Role Validation Not Working
**Problem:** Non-admin users can access admin endpoints
**Solution:** Check:
- [ ] Permission classes applied to views
- [ ] Role validation logic is correct
- [ ] Returns 403 for unauthorized users
- [ ] Test with different roles

---

## Security Checklist

Before going to production:

- [ ] HTTPS enabled
- [ ] HttpOnly cookies configured
- [ ] SameSite=Strict set on all cookies
- [ ] CSRF protection enabled
- [ ] Role validation on every endpoint
- [ ] 401/403 errors handled correctly
- [ ] Logout clears cookies
- [ ] No tokens in logs
- [ ] No sensitive data in error messages
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging enabled
- [ ] HSTS headers set
- [ ] X-Frame-Options headers set
- [ ] X-Content-Type-Options: nosniff set

---

## Questions?

For implementation questions or issues, check:
1. This document
2. `SECURITY_HARDENING.md` in frontend repo
3. Django REST Framework docs: https://www.django-rest-framework.org/
4. Django-REST-SimplleJWT docs: https://django-rest-framework-simplejwt.readthedocs.io/

