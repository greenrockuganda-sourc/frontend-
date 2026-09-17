import { Suspense, lazy, useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Login from '@/pages/Login'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Products = lazy(() => import('@/pages/Products'))
const Brands = lazy(() => import('@/pages/Brands'))
const Categories = lazy(() => import('@/pages/Categories'))
const CreateBrand = lazy(() => import('@/pages/CreateBrand'))
const CreateCategory = lazy(() => import('@/pages/CreateCategory'))
const Orders = lazy(() => import('@/pages/Orders'))
const Deliveries = lazy(() => import('@/pages/Deliveries'))
const Receipts = lazy(() => import('@/pages/Receipts'))
const Reports = lazy(() => import('@/pages/Reports'))
const Customers = lazy(() => import('@/pages/Customers'))
const Settings = lazy(() => import('@/pages/Settings'))
import { fetchProfile, logout, registerAuthSessionCallback } from '@/lib/api'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { UserProfile } from '@/types'
import NotificationSystem, { useNotifications } from '@/components/NotificationSystem'

type Page = 'dashboard' | 'products' | 'brands' | 'categories' | 'createBrand' | 'createCategory' | 'orders' | 'deliveries' | 'receipts' | 'reports' | 'customers' | 'settings'

export default function App() {
  const readInitialPage = (): Page => {
    if (typeof window === 'undefined') return 'dashboard'
    const params = new URLSearchParams(window.location.search)
    const p = params.get('page')
    return (p as Page) || 'dashboard'
  }

  const [currentPage, setCurrentPage] = useState<Page>(readInitialPage)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const { notifications, dismissNotification, addNotification } = useNotifications()

  // Register session callback - backend validates all auth
  useEffect(() => {
    registerAuthSessionCallback((sessionValid) => {
      setIsAuthenticated(sessionValid)
    })
  }, [])

  useEffect(() => {
    const handleCloudinaryConfigError = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>
      const message = customEvent.detail?.message || 'Cloudinary uploads are not configured in the current environment.'
      toast.error(message)
    }

    window.addEventListener('cloudinary-config-error', handleCloudinaryConfigError)

    return () => {
      window.removeEventListener('cloudinary-config-error', handleCloudinaryConfigError)
    }
  }, [])

  /**
   * Fetch user profile on mount and when authentication state changes.
   * The backend validates authorization - we don't perform client-side role checks.
   * If the user doesn't have permission, the backend returns 403.
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    let active = true
    setLoadingProfile(true)
    setProfileError(null)

    fetchProfile()
      .then((profile) => {
        if (!active) {
          return
        }
        setUser(profile)
      })
      .catch((error) => {
        if (active) {
          if (error.message.includes('401') || error.message.includes('Session expired')) {
            setIsAuthenticated(false)
          }
          setProfileError('Unable to load your profile. Please try again.')
          console.error('Profile fetch error:', error)
        }
      })
      .finally(() => {
        if (active) {
          setLoadingProfile(false)
        }
      })

    return () => {
      active = false
    }
  }, [isAuthenticated])

  /**
   * Handle successful login - cookies are set by backend, just update auth state
   */
  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleProfileSave = (updatedProfile: UserProfile) => {
    setUser(updatedProfile)
  }

  /**
   * Handle logout - backend clears HttpOnly cookies
   */
  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
      // Still logout locally even if server call fails
    } finally {
      setIsAuthenticated(false)
      setUser(null)
      setProfileError(null)
    }
  }

  const handleNavigate = (page: Page) => {
    setCurrentPage(page)
    setSidebarOpen(false)

    // Update URL to reflect current page while preserving other query params (e.g., dashboardRange)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      params.set('page', page)
      const newUrl = `${window.location.pathname}?${params.toString()}`
      try {
        window.history.pushState(null, '', newUrl)
      } catch {
        // fallback to replaceState if pushState fails
        window.history.replaceState(null, '', newUrl)
      }
    }
  }

  // Use the stored access token when available so authenticated actions (including order status changes)
  // continue to work while the backend may also rely on cookie-based auth.
  const accessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('access') : null

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  const renderPage = () => {
    const pageFallback = <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Loading page...</div>

    switch (currentPage) {
      case 'dashboard':
        return <Suspense fallback={pageFallback}><Dashboard user={user} token={accessToken ?? ''} /></Suspense>
      case 'products':
        return <Suspense fallback={pageFallback}><Products onNavigate={handleNavigate} /></Suspense>
      case 'brands':
        return <Suspense fallback={pageFallback}><Brands onNavigate={handleNavigate} /></Suspense>
      case 'categories':
        return <Suspense fallback={pageFallback}><Categories onNavigate={handleNavigate} /></Suspense>
      case 'createBrand':
        return <Suspense fallback={pageFallback}><CreateBrand onCreated={() => handleNavigate('brands')} /></Suspense>
      case 'createCategory':
        return <Suspense fallback={pageFallback}><CreateCategory onCreated={() => handleNavigate('categories')} /></Suspense>
      case 'orders':
        return <Suspense fallback={pageFallback}><Orders token={accessToken ?? ''} /></Suspense>
      case 'deliveries':
        return <Suspense fallback={pageFallback}><Deliveries token={accessToken ?? ''} /></Suspense>
      case 'receipts':
        return <Suspense fallback={pageFallback}><Receipts token={accessToken ?? ''} /></Suspense>
      case 'reports':
        return <Suspense fallback={pageFallback}><Reports token={accessToken ?? ''} /></Suspense>
      case 'customers':
        return <Suspense fallback={pageFallback}><Customers token={accessToken ?? ''} /></Suspense>
      case 'settings':
        return <Suspense fallback={pageFallback}><Settings user={user} onProfileSave={handleProfileSave} /></Suspense>
      default:
        return <Suspense fallback={pageFallback}><Dashboard user={user} /></Suspense>
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden min-h-0">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          user={user}
          token={accessToken}
          onLogout={handleLogout}
          onProfileClick={() => handleNavigate('settings')}
          notifications={notifications}
          onDismissNotification={dismissNotification}
          addNotification={addNotification}
        />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {loadingProfile && (
            <div className="px-4 py-3 text-sm text-slate-600">Loading your account details...</div>
          )}
          {profileError && (
            <div className="mx-4 mt-4 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {profileError}
            </div>
          )}
          {renderPage()}
        </main>
      </div>

      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover
        draggable
      />
      
      <NotificationSystem
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </div>
  )
}
