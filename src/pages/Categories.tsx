import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Clock3, Filter, FolderTree, Pencil, Plus, Search, Sparkles } from 'lucide-react'
import { categoriesApi } from '../../lib/api'
import CategoryForm from '../../components/products/category-form'

interface Props {
  token?: string
  onNavigate?: (page: string) => void
}

const formatDate = (value?: string) => {
  if (!value) return 'Not set'
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

export default function Categories({ onNavigate }: Props) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editingCategory, setEditingCategory] = useState<any | null>(null)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const data = await categoriesApi.getAll()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load categories', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => {
      const haystack = String(item.category_name ?? '').toLowerCase()
      return haystack.includes(q)
    })
  }, [items, query])

  const totalCategories = items.length
  const featuredCategories = items.slice(0, 3)

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-indigo-700 via-violet-700 to-indigo-950 px-6 py-8 text-white shadow-[0_30px_70px_-30px_rgba(79,70,229,0.8)] sm:px-8 lg:px-10">
          <div className="absolute -right-10 -top-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 right-20 h-56 w-56 rounded-full bg-violet-400/20 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Categories</h1>
              <p className="mt-3 max-w-xl text-sm text-indigo-100 sm:text-base">
                Organize products into structured collections and keep your storefront navigation intuitive.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                console.log('Categories (spa): Add clicked')
                if (onNavigate) onNavigate('createCategory')
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: 'Total categories', value: String(totalCategories), detail: 'In storefront', accent: 'from-indigo-500 to-indigo-600', icon: FolderTree },
            { label: 'Featured', value: String(featuredCategories.length), detail: 'Ready to showcase', accent: 'from-violet-500 to-violet-600', icon: Sparkles },
            { label: 'Recent activity', value: 'Today', detail: 'Updated in real time', accent: 'from-sky-500 to-cyan-500', icon: Clock3 },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600">Live</span>
                </div>
                <p className="mt-5 text-sm text-slate-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.detail}</p>
              </div>
            )
          })}
        </section>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_60px_-32px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Category library</h2>
              <p className="mt-1 text-sm text-slate-500">Keep each product group easy to browse and manage.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
              <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm">Categories</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-200/80 p-4 sm:flex-row sm:items-center sm:px-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search categories..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 p-5 sm:p-6">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No categories found</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">Try a different keyword or add a category to build out the catalog structure.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/80">
              {filteredItems.map((category) => (
                <div key={category.id} className="group flex flex-col gap-4 p-5 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-100 via-white to-violet-100 text-sm font-bold text-indigo-700 shadow-sm">
                      {category.image_url ? (
                        <img src={category.image_url} alt={category.category_name} className="h-full w-full object-cover" />
                      ) : (
                        (category.category_name ?? 'CT').slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-slate-900">{category.category_name}</h3>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">Active</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:gap-8">
                    <div className="flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                      <Clock3 className="h-3.5 w-3.5" />
                      Updated {formatDate(category.updated_at)}
                    </div>
                    <div className="hidden text-xs text-slate-500 md:block">
                      Created {formatDate(category.created_at)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingCategory(category)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      aria-label={`Edit ${category.category_name}`}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="text-xs font-medium">Edit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-200/80 px-6 py-4 text-sm text-slate-500">
            <span>Showing {filteredItems.length} of {items.length} categories</span>
            <button className="inline-flex items-center gap-1 font-medium text-indigo-600 transition hover:text-indigo-700">
              View overview
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>

      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Edit category</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">{editingCategory.category_name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <CategoryForm
              mode="edit"
              initialData={editingCategory}
              onDone={(updated) => {
                setItems((prev) => prev.map((item) => (String(item.id) === String(updated?.id ?? item.id) ? { ...item, ...updated } : item)))
                setEditingCategory(null)
                void load()
              }}
              onClose={() => setEditingCategory(null)}
            />
          </div>
        </div>
      )}
    </main>
  )
}
