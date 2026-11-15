import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { CircleAlert, LoaderCircle, LogIn } from 'lucide-react'
import { pb } from '../lib/pb'
import { iniciales } from '../lib/utils'
import { logoUrl, useNegocio } from '../lib/negocio'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input, Label } from '../components/ui/input'

export function LoginPage() {
  const navigate = useNavigate()
  const { data: negocio } = useNegocio()
  const logo = logoUrl(negocio)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError(null)
    try {
      await pb.collection('users').authWithPassword(email, password)
      navigate('/admin', { replace: true })
    } catch {
      setError('Correo o contraseña incorrectos.')
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      {logo ? (
        <img src={logo} alt={negocio?.business_name ?? ''} className="mb-6 h-28 w-auto" />
      ) : (
        <span className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-primary font-titulo text-4xl text-primary-foreground">
          {iniciales(negocio?.business_name ?? '')}
        </span>
      )}
      <h1 className="mb-6 font-titulo text-4xl tracking-wide">{negocio?.business_name ?? 'Catálogo'}</h1>
      <Card className="w-full max-w-sm bg-card/80 backdrop-blur-xl">
        <form className="space-y-5" onSubmit={entrar}>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && (
            <p role="alert" className="flex items-center gap-2 rounded-2xl bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive">
              <CircleAlert className="size-4" /> {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={cargando}>
            {cargando ? (
              <>
                <LoaderCircle className="animate-spin" /> Entrando…
              </>
            ) : (
              <>
                <LogIn /> Entrar
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}
