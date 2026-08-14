const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')
const isLocalDevelopment = import.meta.env.DEV
  && typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname)

// Use Vite's same-origin proxy while developing locally. This avoids browser CORS
// failures and lets the proxy rewrite the backend session cookie for localhost.
const API_BASE_URL = isLocalDevelopment
  ? ''
  : configuredApiBaseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '')

if (!API_BASE_URL && !isLocalDevelopment) {
  // Helpful developer warning when no API base is configured
  // Ensure you set `VITE_API_BASE_URL` to your Railway (or other) backend URL.
  // Example: https://my-app.up.railway.app
  // In production, set the env var in your Railway project settings.
  // This check runs at import-time in the client bundle.
  // eslint-disable-next-line no-console
  console.warn('VITE_API_BASE_URL is not set — requests will use an empty base URL. Set VITE_API_BASE_URL to your Railway backend URL.')
}

/**
 * Security Note: Tokens are now managed via HttpOnly, Secure, SameSite cookies.
 * The frontend NEVER handles or stores tokens. The browser automatically includes
 * cookies in requests when credentials: 'include' is set.
 * 
 * This prevents XSS attacks from stealing authentication tokens.
 */

let authSessionCallback: ((isAuthenticated: boolean) => void) | null = null

export function registerAuthSessionCallback(callback: (isAuthenticated: boolean) => void) {
  authSessionCallback = callback
}

function notifySessionChange(isAuthenticated: boolean) {
  authSessionCallback?.(isAuthenticated)
}

/**
 * Check if user session is valid by attempting to fetch profile.
 * This validates the server-side session without exposing tokens to frontend.
 */
async function checkSessionValidity(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/profile/`, {
      method: 'GET',
      credentials: 'include', // Include cookies automatically
    })
    return response.ok
  } catch {
    return false
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers)

  // SECURITY: No token handling in frontend. Cookies sent automatically via credentials: 'include'
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include', // Include cookies automatically (HttpOnly, Secure, SameSite)
    headers,
  })

  const contentType = response.headers.get('content-type') || ''
  if (response.ok) {
    if (contentType.includes('application/json')) {
      try {
        return await response.json() as Promise<T>
      } catch (parseError) {
        // Received a response claiming to be JSON but parsing failed.
        // Read the raw text to make debugging easier and include a snippet.
        const raw = await response.text()
        const snippet = raw ? raw.slice(0, 1000) : '<empty response>'
        throw new Error(`Invalid JSON response from ${path}: ${snippet}`)
      }
    }

    return response.text() as unknown as Promise<T>
  }

  // 401 = Unauthorized (invalid/expired session)
  if (response.status === 401) {
    notifySessionChange(false)
    throw new Error('Session expired. Please sign in again.')
  }

  let errorMessage = 'Request failed'
  if (contentType.includes('application/json')) {
    try {
      const errorBody = await response.json()
      if (typeof errorBody === 'string') {
        errorMessage = errorBody
      } else if (errorBody.detail) {
        errorMessage = errorBody.detail
      } else if (typeof errorBody === 'object' && errorBody !== null) {
        errorMessage = Object.values(errorBody)
          .flat()
          .filter(Boolean)
          .join(' ') || errorMessage
      }
    } catch {
      errorMessage = await response.text()
    }
  } else {
    errorMessage = await response.text()
  }

  throw new Error(errorMessage || 'Request failed')
}

export async function login(identifier: string, password: string) {
  const payload = {
    identifier,
    email_or_phone: identifier,
    email: identifier,
    phone_number: identifier,
    password,
  }

  try {
    const response = await request<{ access?: string; refresh?: string; user?: any }>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    console.debug('[auth] login success', response)
    notifySessionChange(true)
    return response
  } catch (error) {
    console.debug('[auth] login failed payload', payload)
    console.debug('[auth] login failed error', error)
    throw error
  }
}

export async function register(userData: { first_name: string; last_name: string; email: string; phone_number: string; password: string; role?: string }) {
  return request<any>('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

/**
 * Logout - invalidates server-side session and clears cookies
 * Backend will clear the HttpOnly cookies
 */
export async function logout() {
  try {
    await request<any>('/api/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  } finally {
    // Always clear session flag even if logout fails
    notifySessionChange(false)
  }
}

export async function forgotPassword(email: string) {
  return request<any>('/api/auth/forgot-password/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(payload: {
  email?: string
  token?: string
  otp?: string
  password?: string
  new_password?: string
}) {
  return request<any>('/api/auth/reset-password/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Profile and user data - all use cookies for authentication
 */
export async function fetchProfile() {
  return request<any>('/api/user/profile/', {})
}

export async function fetchHomeProfile() {
  return request<any>('/api/profile/', {})
}

export async function updateProfile(profileData: { first_name?: string; last_name?: string; phone_number?: string; profile_image?: string }) {
  return request<any>('/api/user/profile/', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  })
}

export async function fetchDashboard() {
  return request<any>('/api/admin/dashboard/', {})
}

export async function fetchProducts(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  return request<any>(`/api/products/${query}`, {})
}

export async function searchProducts(query: string) {
  const params = query ? `?q=${encodeURIComponent(query)}` : ''
  return request<any>(`/api/products/search/${params}`, {})
}

export async function getProductById(productId: string) {
  return request<any>(`/api/products/${productId}/`, {})
}

export async function getCategoryById(categoryId: string) {
  return request<any>(`/api/categories/${categoryId}/`, {})
}

export async function getBrandById(brandId: string) {
  return request<any>(`/api/brands/${brandId}/`, {})
}

export async function fetchRecipes() {
  return request<any>('/api/recipes/', {})
}

export async function getRecipeById(recipeId: string) {
  return request<any>(`/api/recipes/${recipeId}/`, {})
}

export async function createRecipe(recipeData: any) {
  return request<any>('/api/recipes/', {
    method: 'POST',
    body: JSON.stringify(recipeData),
  })
}

export async function updateRecipe(recipeId: string, recipeData: any) {
  return request<any>(`/api/recipes/${recipeId}/`, {
    method: 'PUT',
    body: JSON.stringify(recipeData),
  })
}

export async function fetchAdminInventory() {
  return request<any>('/api/admin/inventory/', {})
}

export async function updateAdminInventory(productId: string, payload: any) {
  return request<any>(`/api/admin/inventory/${productId}/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function fetchCustomers() {
  return request<any>('/api/admin/customers/', {})
}

export async function getCustomerById(customerId: string) {
  return request<any>(`/api/admin/customers/${customerId}/`, {})
}

export async function fetchBanners() {
  return request<any>('/api/banners/', {})
}

export async function fetchOrders() {
  return request<any>('/api/admin/orders/', {})
}

export async function fetchDeliveries() {
  return request<any>('/api/admin/deliveries/', {})
}

export async function fetchReceipts() {
  return request<any>('/api/admin/receipts/', {})
}

export async function sendReceiptEmail(receiptId: string) {
  return request<any>(`/api/admin/receipts/${receiptId}/email/`, {
    method: 'POST',
  })
}

export async function fetchReport(reportType: string, params?: Record<string, string>) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : ''
  return request<any>(`/api/admin/reports/${reportType}/${query}`, {})
}

export async function sendReportEmail(reportType: string, body: any) {
  return request<any>(`/api/admin/reports/${reportType}/`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function downloadReceiptPdf(receiptId: string) {
  const response = await fetch(`${API_BASE_URL}/api/admin/receipts/${receiptId}/pdf/`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Unable to download receipt PDF.')
  }

  return response.blob()
}

export async function getCategories() {
  return request<any>('/api/categories/', {}, undefined)
}

export async function getBrands() {
  return request<any>('/api/brands/', {}, undefined)
}

export async function createCategory(data: { category_name: string; image_url?: string }) {
  return request<any>('/api/categories/', {
    method: 'POST',
    body: JSON.stringify(data),
  }, undefined)
}

export async function createBrand(data: { brand_name: string; logo?: string }) {
  return request<any>('/api/brands/', {
    method: 'POST',
    body: JSON.stringify(data),
  }, undefined)
}

export async function createReceipt(orderId: string) {
  return request<any>(`/api/orders/${orderId}/receipt/`, {
    method: 'POST',
  })
}

export async function createProduct(productData: any) {
  return request<any>('/api/products/', {
    method: 'POST',
    body: JSON.stringify(productData),
  })
}

export async function updateProduct(productId: string, productData: any) {
  return request<any>(`/api/products/${productId}/`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  })
}

export async function deleteProduct(productId: string) {
  return request<any>(`/api/products/${productId}/`, {
    method: 'DELETE',
  })
}

export async function getOrderDetails(orderId: string) {
  return request<any>(`/api/admin/orders/${orderId}/`, {})
}

export async function updateOrderStatus(orderId: string, status: string) {
  return request<any>(`/api/admin/orders/${orderId}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function updateDelivery(deliveryId: string, deliveryStatus: string) {
  return request<any>(`/api/admin/deliveries/${deliveryId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ delivery_status: deliveryStatus }),
  })
}
