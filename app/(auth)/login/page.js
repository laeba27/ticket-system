'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

const DEMO = [
  { email: 'admin@ethata.dev',     password: 'Admin@123456',     role: 'Admin',     color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { email: 'support@ethata.dev',   password: 'Support@123456',   role: 'Support',   color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  { email: 'developer@ethata.dev', password: 'Developer@123456', role: 'Developer', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { email: 'agent@ethata.dev',     password: 'Agent@123456',     role: 'Agent',     color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
]

export default function LoginPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Theme toggle — top right */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 size-8 text-muted-foreground hover:text-foreground"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-purple-500/6 blur-[80px]" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="size-12 rounded-2xl bg-primary mx-auto flex items-center justify-center text-primary-foreground text-xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-display)', boxShadow: '0 0 32px oklch(0.60 0.22 264 / 0.3)' }}>
            E
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}>
            Ethata
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ticket Management System</p>
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@ethata.dev"
                  required
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-9"
                />
              </div>

              {error && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertCircle className="size-3.5" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <Separator className="my-5" />

            {/* Demo accounts */}
            <div>
              <p className="text-xs text-muted-foreground text-center mb-3">Quick login — demo accounts</p>
              <div className="space-y-1.5">
                {DEMO.map(acc => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => { setEmail(acc.email); setPassword(acc.password) }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:bg-accent text-xs transition-colors cursor-pointer text-left"
                  >
                    <span className="text-muted-foreground">{acc.email}</span>
                    <Badge variant="outline" className={cn('text-[10px] font-bold uppercase tracking-wider', acc.color)}>
                      {acc.role}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
