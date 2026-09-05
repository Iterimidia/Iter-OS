import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, Briefcase, Compass, Eye, EyeOff, Lock, Mail, Sparkles, TriangleAlert } from 'lucide-react'
import { useAuthStore } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { GradientBackdrop } from '@/components/ui/GradientBackdrop'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'

const PILLARS = [
  { label: 'Direção', icon: Compass },
  { label: 'Comercial', icon: Briefcase },
  { label: 'Operação', icon: BarChart3 },
  { label: 'Criativo', icon: Sparkles },
]

export function LoginPage() {
  const navigate = useNavigate()
  const status = useAuthStore((s) => s.status)
  const login = useAuthStore((s) => s.login)
  const lastError = useAuthStore((s) => s.lastError)
  const clearLastError = useAuthStore((s) => s.clearLastError)
  const appSettings = useDataStore((s) => s.appSettings)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Sessão encerrada em outro lugar (ex: RequireAuth detectou perfil inválido/
  // inativo) chega aqui como lastError — mostra uma vez só e limpa.
  useEffect(() => {
    if (lastError) {
      setError(lastError)
      clearLastError()
    }
  }, [lastError, clearLastError])

  // A navegação para dentro do app não acontece no submit — só quando o
  // status global realmente vira 'signed_in' (evita corrida entre o
  // `await login(...)` resolver e o listener de auth atualizar o estado).
  useEffect(() => {
    if (status === 'signed_in') navigate('/', { replace: true })
  }, [status, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await login(email, password)
    if (!result.ok) setError(result.error)
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen w-full bg-iter-bg">
      <GradientBackdrop />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:flex-row lg:items-center lg:gap-16 lg:px-16">
        <div className="mb-10 lg:hidden">
          <Logo />
        </div>

        <div className="flex-1 lg:flex lg:flex-col lg:justify-center">
          <div className="mb-8 hidden lg:block">
            <Logo />
          </div>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-iter-border bg-iter-surface/70 px-3 py-1 text-[11px] font-medium text-iter-muted backdrop-blur">
            <Sparkles className="h-3 w-3 text-iter-accent" />
            Sistema Operacional Interno · Iter Mídia
          </span>

          <h1 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-tight text-iter-text lg:text-[2.75rem] lg:leading-[1.1]">
            {appSettings.loginSlogan}
          </h1>

          <p className="mt-4 max-w-md text-sm text-iter-muted lg:text-base">
            {appSettings.companyName}: direção, comercial, operação e criação em um único lugar — com a visão certa
            para cada pessoa da equipe.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {PILLARS.map((p) => (
              <span
                key={p.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-iter-border bg-iter-surface/60 px-3 py-1.5 text-xs font-medium text-iter-muted backdrop-blur"
              >
                <p.icon className="h-3.5 w-3.5 text-iter-accent" />
                {p.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-10 lg:py-0">
          <div className="glass-panel w-full max-w-md rounded-3xl p-7 shadow-popover sm:p-9">
            <h2 className="text-lg font-semibold text-iter-text">Bem-vindo de volta</h2>
            <p className="mt-1 text-sm text-iter-muted">Entre com suas credenciais da Iter Mídia.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iter-faint" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="voce@itermidia.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iter-faint" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 text-iter-faint hover:text-iter-muted"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-iter-danger/25 bg-iter-danger/10 px-3 py-2.5 text-xs text-iter-danger">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" loading={loading} className="w-full justify-center">
                Entrar
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
