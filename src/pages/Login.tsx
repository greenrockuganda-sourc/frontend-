import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { forgotPassword, login, register, resetPassword } from '@/lib/api'

interface LoginProps { onLogin: () => void }
type AuthView = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password'

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'

function PasswordField({ label, value, onChange, placeholder, autoComplete }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false)
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><span className="relative block"><input value={value} onChange={(event) => onChange(event.target.value)} type={visible ? 'text' : 'password'} className={`${inputClass} pr-12`} placeholder={placeholder} autoComplete={autoComplete} required /><button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
}

export default function Login({ onLogin }: LoginProps) {
  const [view, setView] = useState<AuthView>('sign-in')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetUid, setResetUid] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const uid = params.get('uid') || params.get('uidb64') || ''
    const token = params.get('token') || ''
    if (uid || token) { setResetUid(uid); setResetToken(token); setView('reset-password') }
  }, [])

  const changeView = (next: AuthView) => { setView(next); setError(null); setNotice(null) }
  const validEmail = () => {
    if (!email.trim()) { setError('Enter your email address.'); return false }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter a valid email address.'); return false }
    return true
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null); setNotice(null); setLoading(true)
    try {
      if (view === 'sign-in') {
        if (!email.trim() || !password) throw new Error('Enter your email or phone number and password.')
        await login(email.trim(), password); onLogin(); return
      }
      if (view === 'sign-up') {
        if (!validEmail()) return
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
        if (password !== confirmPassword) throw new Error('Your passwords do not match.')
        await register({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), phone_number: phoneNumber.trim(), password, role: 'Seller' })
        setPassword(''); setConfirmPassword(''); changeView('sign-in'); setNotice('Your account is ready. Sign in to continue.'); return
      }
      if (view === 'forgot-password') {
        if (!validEmail()) return
        await forgotPassword(email.trim())
        setNotice('If an account exists for this email, we have sent password reset instructions.'); return
      }
      if (!resetUid.trim() || !resetToken.trim()) throw new Error('Open the reset link from your email, or enter the UID and reset token.')
      if (newPassword.length < 8) throw new Error('Use a password with at least 8 characters.')
      if (newPassword !== confirmNewPassword) throw new Error('Your passwords do not match.')
      await resetPassword({ uid: resetUid.trim(), token: resetToken.trim(), new_password: newPassword, confirm_password: confirmNewPassword })
      setNewPassword(''); setConfirmNewPassword(''); changeView('sign-in'); setNotice('Password updated. You can now sign in with your new password.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.') } finally { setLoading(false) }
  }

  const title = view === 'sign-up' ? 'Create your account' : view === 'forgot-password' ? 'Reset your password' : view === 'reset-password' ? 'Choose a new password' : 'Welcome back'
  const description = view === 'sign-up' ? 'Create a seller account in a few simple steps.' : view === 'forgot-password' ? 'We will send reset instructions to your email.' : view === 'reset-password' ? 'Secure your account with a new password.' : 'Sign in to manage your store, inventory and orders.'
  const submitLabel = view === 'sign-up' ? 'Create account' : view === 'forgot-password' ? 'Send reset instructions' : view === 'reset-password' ? 'Update password' : 'Sign in'

  return <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-2 lg:p-0">
    <div className="pointer-events-none absolute inset-0 overflow-hidden"><div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" /><div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" /></div>
    <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-12 text-white lg:flex">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_12%,rgba(255,255,255,0.2),transparent_25%),radial-gradient(circle_at_15%_85%,rgba(6,78,59,0.55),transparent_36%)]" />
      <div className="relative flex items-center gap-3 text-lg font-bold"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25"><ShieldCheck className="h-6 w-6" /></span>Greenrock Seller Hub</div>
      <div className="relative max-w-lg"><span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-50 backdrop-blur"><Sparkles className="h-4 w-4" />Built for growing businesses</span><h1 className="text-5xl font-bold leading-tight tracking-tight">Keep your shop moving, wherever you are.</h1><p className="mt-6 max-w-md text-lg leading-8 text-emerald-50/90">Manage stock, orders, deliveries and customer relationships from one calm, secure workspace.</p></div>
      <div className="relative grid grid-cols-3 gap-3 text-sm text-emerald-50/90">{['Secure access', 'Live inventory', 'Clear insights'].map((item) => <div key={item} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">{item}</div>)}</div>
    </section>
    <section className="relative flex min-h-[calc(100vh-3rem)] items-center justify-center lg:min-h-screen lg:bg-white lg:p-12"><div className="w-full max-w-md rounded-3xl border border-white/15 bg-white p-6 shadow-2xl shadow-slate-950/30 sm:p-9 lg:border-slate-100 lg:shadow-xl lg:shadow-slate-200/60">
      <div className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white"><ShieldCheck className="h-5 w-5" /></span><span className="font-bold text-slate-900">Greenrock</span></div>{(view === 'forgot-password' || view === 'reset-password') && <button type="button" onClick={() => changeView('sign-in')} className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"><ArrowLeft className="h-4 w-4" />Back to sign in</button>}</div>
      <div className="mb-7"><h2 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h2><p className="mt-2 leading-6 text-slate-500">{description}</p></div>
      {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}{notice && <div role="status" className="mb-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}
      <form onSubmit={submit} className="space-y-5">
        {view === 'sign-up' && <><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">First name <span className="font-normal text-slate-400">(optional)</span></span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} placeholder="Jane" autoComplete="given-name" /></label><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Last name <span className="font-normal text-slate-400">(optional)</span></span><input value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} placeholder="Doe" autoComplete="family-name" /></label></div><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Phone number <span className="font-normal text-slate-400">(optional)</span></span><input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className={inputClass} placeholder="+256 700 000 000" autoComplete="tel" /></label></>}
        {(view === 'sign-in' || view === 'sign-up' || view === 'forgot-password') && <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{view === 'sign-in' ? 'Email or phone number' : 'Email address'}</span><input value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder={view === 'sign-in' ? 'you@example.com or +256…' : 'you@example.com'} autoComplete={view === 'sign-in' ? 'username' : 'email'} required /></label>}
        {(view === 'sign-in' || view === 'sign-up') && <PasswordField label="Password" value={password} onChange={setPassword} placeholder={view === 'sign-up' ? 'At least 8 characters' : 'Enter your password'} autoComplete={view === 'sign-up' ? 'new-password' : 'current-password'} />}{view === 'sign-up' && <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Enter your password again" autoComplete="new-password" />}
        {view === 'reset-password' && <><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">User ID</span><input value={resetUid} onChange={(event) => setResetUid(event.target.value)} className={inputClass} placeholder="From your reset email" autoComplete="off" required /></label><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Reset token</span><input value={resetToken} onChange={(event) => setResetToken(event.target.value)} className={inputClass} placeholder="From your reset email" autoComplete="one-time-code" required /></label><PasswordField label="New password" value={newPassword} onChange={setNewPassword} placeholder="At least 8 characters" autoComplete="new-password" /><PasswordField label="Confirm new password" value={confirmNewPassword} onChange={setConfirmNewPassword} placeholder="Enter your new password again" autoComplete="new-password" /></>}
        <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <>{submitLabel}<ArrowRight className="h-4 w-4" /></>}</button>
      </form>
      {view === 'sign-in' && <div className="mt-6 space-y-4 text-center text-sm"><button type="button" onClick={() => changeView('forgot-password')} className="font-semibold text-emerald-700 transition hover:text-emerald-800">Forgot your password?</button><p className="text-slate-500">New to Greenrock? <button type="button" onClick={() => changeView('sign-up')} className="font-bold text-slate-900 underline decoration-emerald-400 underline-offset-4">Create an account</button></p></div>}{view === 'sign-up' && <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <button type="button" onClick={() => changeView('sign-in')} className="font-bold text-slate-900 underline decoration-emerald-400 underline-offset-4">Sign in</button></p>}{view === 'forgot-password' && <div className="mt-5 text-center text-sm text-slate-500"><button type="button" onClick={() => changeView('reset-password')} className="font-semibold text-emerald-700 hover:text-emerald-800">Already have a reset code?</button></div>}
    </div></section>
  </main>
}
