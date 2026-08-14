import { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Dashboard from '@/pages/Dashboard'
import Products from '@/pages/Products'
import Brands from '@/pages/Brands'
import Categories from '@/pages/Categories'
import CreateBrand from '@/pages/CreateBrand'
import CreateCategory from '@/pages/CreateCategory'
import Orders from '@/pages/Orders'
import Deliveries from '@/pages/Deliveries'
import Receipts from '@/pages/Receipts'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import Login from '@/pages/Login'
import { fetchProfile, logout, registerAuthSessionCallback } from '@/lib/api'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { UserProfile } from '@/types'
import NotificationSystem, { useNotifications } from '@/components/NotificationSystem'

type Page = 'dashboard' | 'products' | 'brands' | 'categories' | 'createBrand' | 'createCategory' | 'orders' | 'deliveries' | 'receipts' | 'reports' | 'settings'

export default function App() {
  const readInitialPage = (): Page => {
    if (typeof window === 'undefined') return 'dashboard'
    const params = new URLSearchParams(window.location.search)
    const p = params.get('page')
    return (p as Page) || 'dashboard'
  }

  const [currentPage, setCurrentPage] = useState<Page>(readInitialPage)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Assume authenticated until proven otherwise
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
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

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard user={user} />
      case 'products':
        return <Products onNavigate={handleNavigate} />
      case 'brands':
        return <Brands onNavigate={handleNavigate} />
      case 'categories':
        return <Categories onNavigate={handleNavigate} />
      case 'createBrand':
        return <CreateBrand onCreated={() => handleNavigate('brands')} />
      case 'createCategory':
        return <CreateCategory onCreated={() => handleNavigate('categories')} />
      case 'orders':
        return <Orders />
      case 'deliveries':
        return <Deliveries />
      case 'receipts':
        return <Receipts />
      case 'reports':
        return <Reports />
      case 'settings':
        return <Settings user={user} onProfileSave={handleProfileSave} />
      default:
        return <Dashboard user={user} />
    }
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-white">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          user={user}
          onLogout={handleLogout}
          onProfileClick={() => handleNavigate('settings')}
          notifications={notifications}
          onDismissNotification={dismissNotification}
          addNotification={addNotification}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
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
