import { Sparkles } from 'lucide-react'
import CategoryForm from '../../components/products/category-form'
import { useEffect } from 'react'

interface Props {
  token: string
  onCreated?: () => void
}

export default function CreateCategory({ token, onCreated }: Props) {
  useEffect(() => {
    console.log('CreateCategory mounted')
  }, [token])

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-700 via-violet-700 to-indigo-950 p-6 text-white shadow-[0_30px_70px_-30px_rgba(79,70,229,0.8)]">
          <div className="flex items-center gap-2 text-sm text-indigo-100">
            <Sparkles className="h-4 w-4" />
            Category setup
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Create Category</h1>
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.25)] sm:p-6 lg:p-8">
          <CategoryForm onDone={() => onCreated && onCreated()} onClose={() => onCreated && onCreated()} />
        </div>
      </div>
    </main>
  )
}
