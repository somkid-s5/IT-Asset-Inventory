"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react"
import { BrandMark } from "@/components/BrandMark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import apiClient from "@/services/api"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    
    // Unified message for all common authentication/validation failures
    if (status === 400 || status === 401 || status === 403) {
      return "Invalid username or password.";
    }
    
    if (status === 429) return "Too many attempts. Please try again later.";
    if (status === 404 || status === 500) return "Authentication service unavailable. Please contact IT.";
  }

  return "Login failed. Please check your network connection."
}

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, login } = useAuth()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard")
    }
  }, [authLoading, router, user])

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true)

    try {
      const response = await apiClient.post("/auth/login", data)
      login(response.data.user)
      toast.success("Signed in successfully")
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      toast.error(msg);
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <main id="main-content" className="flex min-h-screen items-center justify-center bg-background">
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Preparing secure sign in...
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className="flex min-h-screen items-center bg-background px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex min-h-[620px] w-full max-w-6xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-black/10 lg:h-[min(720px,calc(100vh-4rem))]">
          {/* Left Panel */}
          <section aria-label="Product overview" className="relative hidden w-[47%] flex-col justify-between overflow-hidden border-r border-sidebar-border bg-sidebar-background p-10 text-white lg:flex">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,hsl(var(--primary)/0.24),transparent_36%),linear-gradient(145deg,transparent_35%,hsl(var(--primary)/0.06))]" />
            <div>
              <BrandMark tone="inverse" className="relative z-10" />
              <div className="relative z-10 mt-14">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70">
                  <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                  Private team workspace
                </p>
                <h1 className="mt-6 max-w-md text-4xl font-semibold leading-[1.12] tracking-tight text-white">
                  Your infrastructure,<br />clear and accountable.
                </h1>
                <p className="mt-5 max-w-sm text-[15px] leading-7 text-white/65">
                  Keep assets, virtual machines, databases, ownership, and operational knowledge in one reliable place.
                </p>
              </div>
            </div>

            <div className="relative z-10 rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-primary/15 p-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Built for day-to-day IT operations</div>
                  <div className="mt-1.5 text-sm leading-6 text-white/60">
                    Fast inventory lookup, clear ownership, quality checks, and traceable changes for your team.
                  </div>
                </div>
              </div>
            </div>
          </section>


          {/* Right Panel - Login Form */}
          <section aria-label="Sign in" className="relative flex flex-1 items-center justify-center bg-card p-6 sm:p-10 lg:p-14">
            <div className="w-full max-w-md">
              <div className="lg:hidden">
                <BrandMark />
              </div>

              <div className="mt-8 lg:mt-0">
                <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                  Secure access
                </p>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">
                  Welcome back
                </h2>
                <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
                  Sign in with the account provided by your team administrator.
                </p>
              </div>

              <form aria-label="Sign in" onSubmit={handleSubmit(handleLogin)} className="mt-8 space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="username" required>Username</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="Enter your username"
                    disabled={loading}
                    {...register("username")}
                    aria-invalid={!!errors.username}
                    aria-describedby={errors.username ? "username-error" : undefined}
                  />
                  {errors.username && (
                    <p id="username-error" className="text-xs text-destructive" role="alert">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" required>Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={loading}
                    {...register("password")}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  {errors.password && (
                    <p id="password-error" className="text-xs text-destructive" role="alert">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="h-12 w-full text-[15px] font-semibold shadow-lg shadow-primary/15" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
                Access is restricted to authorized team members. Activity may be recorded for security and audit purposes.
              </p>
            </div>
          </section>
        </div>
    </main>
  )
}
