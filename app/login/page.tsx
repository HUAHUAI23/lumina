import { Suspense } from 'react'

import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#020203] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-zinc-500 font-mono uppercase tracking-wider">Loading...</p>
      </div>
    </div>
  )
}
