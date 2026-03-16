'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
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
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <div className="hidden w-[44%] flex-col justify-between border-r border-border bg-muted/40 p-8 lg:flex">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background">
              <Shield className="h-5 w-5" />
            </div>
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">AssetOps</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">Keep asset operations clear and controlled.</h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                Sign in to manage infrastructure assets, access records, and operational inventory in one shared workspace.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Operations Workspace</div>
            <div className="mt-2 text-sm font-medium text-foreground">Assets, VM, and DB stay aligned in one internal system.</div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background">
                <Shield className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Sign In</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">Welcome back</h2>
              <p className="mt-2 text-sm text-muted-foreground">Use your assigned account to continue into the asset workspace.</p>
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

              <Button type="submit" className="h-11 w-full bg-foreground text-background hover:bg-foreground/90" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
