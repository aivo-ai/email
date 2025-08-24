import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Mail, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswordField, setShowPasswordField] = useState(false)
  
  const { state, login } = useAuth()

  // If already authenticated, redirect to app (after all hooks)
  if (state.isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      setError('Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.includes('@')) {
      setShowPasswordField(true)
      // Focus password field
      setTimeout(() => {
        const passwordInput = document.getElementById('password') as HTMLInputElement
        if (passwordInput) {
          passwordInput.focus()
        }
      }, 100)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center py-12 px-4">
      {/* Ceerion Branding */}
      <div className="text-right mb-8 w-full max-w-md">
        <div className="flex items-center justify-end space-x-2 text-sm text-gray-600">
          <span>Ceerion</span>
          <span className="text-blue-600 hover:underline cursor-pointer">Sign in</span>
        </div>
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            {/* Gmail-style logo */}
            <div className="relative">
              <Mail className="h-20 w-20 text-red-600" />
            </div>
          </div>
          <h1 className="text-2xl font-normal text-gray-700 mb-2">
            <span className="text-blue-600">C</span>
            <span className="text-red-600">e</span>
            <span className="text-yellow-500">e</span>
            <span className="text-blue-600">r</span>
            <span className="text-green-600">i</span>
            <span className="text-red-600">o</span>
            <span className="text-yellow-500">n</span>
            <span className="ml-2 text-gray-700">Mail</span>
          </h1>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-8 shadow-sm">
          {!showPasswordField ? (
            // Email entry form - Gmail style
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-normal text-gray-700">Sign in</h2>
                <p className="text-sm text-gray-600 mt-2">Use your Ceerion account</p>
              </div>
              
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Email or phone"
                    autoFocus
                  />
                </div>

                <div className="text-left">
                  <a href="#" className="text-sm text-blue-600 hover:underline">
                    Forgot email?
                  </a>
                </div>

                <div className="text-sm text-gray-600 py-4">
                  Not your computer? Use Guest mode to sign in privately.{' '}
                  <a href="#" className="text-blue-600 hover:underline">Learn more</a>
                </div>

                <div className="text-sm text-gray-500 py-2 border-t border-gray-100">
                  <strong>Admin-only provisioning:</strong> New accounts are created by system administrators only.
                </div>

                <div className="flex justify-end items-center pt-4">
                  <button
                    type="submit"
                    disabled={!email.includes('@')}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // Password entry form - Gmail style
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-normal text-gray-700">Welcome</h2>
                <div className="flex items-center justify-center space-x-2 mt-2 p-2 bg-gray-50 rounded-md">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordField(false)
                      setPassword('')
                      setError('')
                    }}
                    className="text-blue-600 text-sm hover:underline ml-2"
                  >
                    Switch account
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent pr-10"
                      placeholder="Password"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-left">
                  <a href="#" className="text-sm text-blue-600 hover:underline">
                    Forgot password?
                  </a>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4">
                  <div></div>
                  <button
                    type="submit"
                    disabled={isLoading || !password}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      'Next'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="flex justify-center space-x-6 text-xs text-gray-500 mb-4">
              <a href="#" className="hover:underline">English (United States)</a>
              <a href="#" className="hover:underline">Help</a>
              <a href="#" className="hover:underline">Privacy</a>
              <a href="#" className="hover:underline">Terms</a>
            </div>
            
            {/* Demo Access */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-3">For demo access:</p>
              <button
                onClick={async () => {
                  setIsLoading(true)
                  try {
                    await login('demo@ceerion.com', 'demo123')
                  } catch (err) {
                    setError('Demo login failed')
                  } finally {
                    setIsLoading(false)
                  }
                }}
                className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                Access Gmail-Style Interface
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
