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
import apiClient from "@/lib/api"
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
    const data = (error as { response?: { data?: any } }).response?.data;
    if (data?.message) {
      if (typeof data.message === "string") return data.message;
      if (typeof data.message === "object" && data.message.error) return data.message.error;
      return JSON.stringify(data.message);
    }
    if (data?.error) return data.error;
  }

  return "Login failed. Please check your connection."
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
      router.replace("/dashboard/assets")
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
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          {/* Left Panel */}
          <div className="relative hidden w-[47%] flex-col justify-between border-r border-border bg-[#0f172a] p-8 text-white lg:flex">
            <div>
              <BrandMark tone="inverse" className="relative z-10" />
              <div className="relative z-10 mt-10">
                <p className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                  Standard Security Protocol
                </p>
                <h1 className="mt-5 max-w-md text-3xl font-semibold leading-tight text-white">
                  Enterprise IT Asset<br />Management Hub
                </h1>
                <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
                  Manage infrastructure, audit access, and track organizational inventory in a single unified platform.
                </p>
              </div>
            </div>

            <div className="relative z-10 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-white/50">
                  Infrastructure Management
                </div>
                <div className="mt-3 text-sm font-medium text-white/90">
                  Centralized repository for hardware, VMs, and databases.
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-white/70" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      Real-time Discovery
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      Automated sync and status monitoring for all resources.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative element */}
            <div className="absolute inset-0 dot-pattern opacity-10"></div>
          </div>


          {/* Right Panel - Login Form */}
          <div className="relative flex flex-1 items-center justify-center bg-background p-6 sm:p-8 lg:p-10">
            <div className="w-full max-w-md">
              <div className="lg:hidden">
                <BrandMark />
              </div>

              <div className="mt-6">
                <p className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  System Access
                </p>
                <h2 className="mt-5 text-2xl font-semibold text-foreground">
                  Welcome back
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Please sign in with your account to manage IT inventory.
                </p>
              </div>

              <form onSubmit={handleSubmit(handleLogin)} className="mt-8 space-y-5">
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

                <Button type="submit" className="h-12 w-full text-[15px] font-medium" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LockKeyhole className="h-4 w-4" />
                </div>
                Secure environment for internal data management.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
