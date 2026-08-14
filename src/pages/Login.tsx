import { useState } from 'react'
import { ArrowLeft, Lock, Mail, ShieldCheck } from 'lucide-react'
import { forgotPassword, login, register, resetPassword } from '@/lib/api'

interface LoginProps {
  /**
   * Called when login succeeds. Backend validates authorization.
   * We don't perform any role checks on the client.
   */
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetUid, setResetUid] = useState('')
  const [passwordActionLoading, setPasswordActionLoading] = useState(false)
  const [passwordActionMessage, setPasswordActionMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    if (isRegistering) {
      if (!firstName.trim() || !lastName.trim() || !identifier.trim() || !phoneNumber.trim() || !password) {
        setError('Please fill in all signup fields.')
        setLoading(false)
        return
      }
    } else if (!identifier.trim() || !password) {
      setError('Please enter your email or phone and password.')
      setLoading(false)
      return
    }

    try {
      if (isRegistering) {
        await register({
          first_name: firstName,
          last_name: lastName,
          email: identifier,
          phone_number: phoneNumber,
          password,
          role: 'Seller',
        })
        setSuccessMessage('Account created successfully. Please sign in.')
        setIsRegistering(false)
        setPassword('')
        setPhoneNumber('')
        return
      }

      /**
       * Login with email/phone and password.
       * Backend validates user role and sets HttpOnly cookies.
       * Frontend doesn't handle tokens - cookies are managed by browser.
       */
      await login(identifier, password)
      
      /**
       * SECURITY: No client-side role validation.
       * Backend endpoint validates authorization and denies access if user
       * doesn't have appropriate role (Seller/Admin).
       * If unauthorized, backend returns 403 and frontend cannot proceed.
       */
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : isRegistering ? 'Unable to create account' : 'Unable to sign in')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsRegistering(!isRegistering)
    setShowForgotPassword(false)
    setError(null)
    setSuccessMessage(null)
    setPasswordActionMessage(null)
  }

  const handleForgotPasswordRequest = async () => {
    if (!forgotEmail.trim()) {
      setError('Please enter your email to request a reset link.')
      return
    }

    setPasswordActionLoading(true)
    setError(null)
    setPasswordActionMessage(null)

    try {
      const data = await forgotPassword(forgotEmail.trim())
      // backend may return uid and token for convenience; capture them if present
      if (data && typeof data === 'object') {
        if (data.uid) setResetUid(String(data.uid))
        if (data.token) setResetToken(String(data.token))
      }
      setPasswordActionMessage('A password reset link has been sent to your email.')
      setSuccessMessage('Password reset requested. Use the token you received to set a new password.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request a password reset.')
    } finally {
      setPasswordActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if ((!resetUid.trim() && !forgotEmail.trim()) || !resetToken.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('Please provide uid (or email), reset token, new password and confirmation.')
      return
    }

    setPasswordActionLoading(true)
    setError(null)
    setPasswordActionMessage(null)

    try {
      await resetPassword({
        uid: resetUid.trim() || undefined,
        token: resetToken.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setPasswordActionMessage('Password reset successful. You can sign in with your new password.')
      setShowForgotPassword(false)
      setIsRegistering(false)
      setForgotEmail('')
      setResetToken('')
      setResetUid('')
      setNewPassword('')
      setConfirmPassword('')
      setPassword('')
      setSuccessMessage('Password changed successfully. Please sign in.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset your password.')
    } finally {
      setPasswordActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white/80 p-8 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-500 shadow-[0_12px_24px_-8px_rgba(99,102,241,0.18)]">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {isRegistering ? 'Create your account' : 'Seller Admin'}
            </h1>
            <p className="text-sm text-slate-500">
              {isRegistering ? 'Sign up to manage your store' : 'Sign in to manage your store'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">First name</label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                  placeholder="First name"
                  autoComplete="given-name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Last name</label>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                  placeholder="Last name"
                  autoComplete="family-name"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              {isRegistering ? 'Email address' : 'Email or phone'}
            </label>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3">
              <Mail className="mr-2 h-4 w-4 text-slate-400" />
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none"
                placeholder={isRegistering ? 'Enter your email' : 'Enter your email or phone'}
                autoComplete={isRegistering ? 'email' : 'email'}
              />
            </div>
          </div>

          {isRegistering && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Phone number</label>
              <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3">
                <input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none"
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3">
              <Lock className="mr-2 h-4 w-4 text-slate-400" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none"
                placeholder="Enter your password"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/10 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg border border-emerald-500/10 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          {!showForgotPassword && (
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (isRegistering ? 'Creating account...' : 'Signing in...') : (isRegistering ? 'Create account' : 'Sign in')}
            </button>
          )}
        </form>

        {showForgotPassword && (
          <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </button>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                placeholder="Enter your email"
              />
            </div>

            <button
              type="button"
              onClick={handleForgotPasswordRequest}
              disabled={passwordActionLoading}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {passwordActionLoading ? 'Sending...' : 'Send reset link'}
            </button>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Reset token</label>
              <input
                value={resetToken}
                onChange={(event) => setResetToken(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                placeholder="Paste the token from your email"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">New password</label>
              <input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                placeholder="Enter a new password"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                placeholder="Confirm your new password"
              />
            </div>

            <button
              type="button"
              onClick={handleResetPassword}
              disabled={passwordActionLoading}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {passwordActionLoading ? 'Resetting...' : 'Reset password'}
            </button>

            {passwordActionMessage && (
              <div className="rounded-lg border border-emerald-500/10 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {passwordActionMessage}
              </div>
            )}
          </div>
        )}

        {!showForgotPassword && (
          <div className="mt-4 space-y-2 text-center text-sm text-slate-400">
            {!isRegistering && (
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true)
                  setError(null)
                  setSuccessMessage(null)
                }}
                className="block w-full text-center text-indigo-600 hover:text-violet-600 underline"
              >
                Forgot password?
              </button>
            )}

            {isRegistering ? (
              <>
                Already have an account?{' '}
                <button type="button" onClick={toggleMode} className="text-indigo-600 hover:text-violet-600 underline">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button type="button" onClick={toggleMode} className="text-indigo-600 hover:text-violet-600 underline">
                  Sign up
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
