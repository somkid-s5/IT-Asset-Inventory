'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/services/api';

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
  ) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message as string;
  }

  return 'Failed to sign in';
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard/assets');
    }
  }, [authLoading, router, user]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      login(response.data.access_token, response.data.user);
      toast.success('Signed in successfully');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="brand-grid min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="glass-card mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden">
        <div className="relative hidden w-[47%] flex-col justify-between border-r border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,hsl(var(--primary))_48%,black_52%)_0%,color-mix(in_oklab,hsl(var(--background))_75%,black_25%)_100%)] p-8 text-white lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(223,37,49,0.22),transparent_42%)]" />

          <div>
            <BrandMark tone="inverse" className="relative z-10" />
            <div className="relative z-10 mt-10">
              <p className="brand-chip border-white/12 bg-white/8 text-white/60">Secure Operations</p>
              <h1 className="mt-5 max-w-md font-display text-4xl font-semibold uppercase leading-tight tracking-[0.08em] text-white">
                Keep asset control sharp and unified.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/72">
                Sign in to manage infrastructure assets, access records, and operational inventory in one shared workspace.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/56">Operations Workspace</div>
              <div className="mt-3 text-sm font-medium text-white">Assets, VM, and DB stay aligned in one internal system.</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">Live Inventory</div>
                  <div className="mt-1 text-sm text-white/58">A cleaner control layer for hardware, VM, and database records.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center bg-card/48 p-6 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden">
              <BrandMark />
            </div>

            <div className="mt-6">
              <p className="brand-chip">Sign In</p>
              <h2 className="mt-5 font-display text-3xl font-semibold uppercase tracking-[0.08em] text-foreground">Welcome back</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Use your assigned account to continue into the asset workspace.</p>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="Enter your username"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <Button type="submit" className="h-12 w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-3 rounded-[24px] border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <LockKeyhole className="h-4 w-4" />
              </div>
              Secure access for internal inventory administration.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
