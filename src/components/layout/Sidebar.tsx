import { Home, Package, ShoppingCart, Truck, FileText, Settings as SettingsIcon, X, BarChart3, ShieldCheck, Tag, Award } from 'lucide-react'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: any) => void
  isOpen: boolean
  onClose: () => void
}

const navSections = [
  {
    label: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }],
  },
  {
    label: 'Operations',
    items: [
      { id: 'products', label: 'Products', icon: Package },
      { id: 'categories', label: 'Categories', icon: Tag },
      { id: 'brands', label: 'Brands', icon: Award },
      { id: 'orders', label: 'Orders', icon: ShoppingCart },
      { id: 'deliveries', label: 'Deliveries', icon: Truck },
      { id: 'receipts', label: 'Receipts', icon: FileText },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
]

export default function Sidebar({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-[2px] lg:hidden fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          sidebar fixed lg:sticky top-0 left-0 h-screen w-[84vw] max-w-[288px] lg:w-[268px] lg:max-w-none
          transform transition-transform duration-300 ease-in-out z-40 lg:z-10
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col shadow-2xl lg:shadow-none no-print
        `}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
            <span className="text-sm font-bold tracking-tight">GL</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-semibold leading-tight text-white">Glow</p>
            <p className="truncate text-[0.6875rem] font-medium tracking-wide text-slate-400">Seller Workspace</p>
          </div>
          <button
            onClick={onClose}
            className="-mr-2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 pb-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="sidebar-section-label">{section.label}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPage === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id)
                        onClose()
                      }}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
            <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-emerald-400" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white">Secure session</p>
              <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-slate-400">
                All data is synced live with your store.
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-[0.6875rem] text-slate-500">Seller Dashboard · v1.0.0</p>
        </div>
      </aside>
    </>
  )
}
