import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { z } from 'zod';
import splitlelyLogo from '@/assets/Splitley_Logo.png';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [oauthError, setOauthError] = useState<string | null>(null);
  
  const { login, signup, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasProcessedOAuth = useRef(false);

  // Handle OAuth callback (both web and native after deeplink)
  useEffect(() => {
    if (hasProcessedOAuth.current) return;
    
    const handleOAuthCallback = async () => {
      // Parse tokens from URL hash (web flow) or query params (native flow after deeplink)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const windowParams = new URLSearchParams(window.location.search);

      // Check for OAuth errors
      const errorParam = searchParams.get('error') || hashParams.get('error') || windowParams.get('error');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description') || windowParams.get('error_description');
      
      if (errorParam) {
        hasProcessedOAuth.current = true;
        setOauthError(errorDescription || errorParam);
        return;
      }

      // Get tokens (try all sources - hash for web, query params for native)
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || windowParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token') || windowParams.get('refresh_token');

      if (accessToken) {
        hasProcessedOAuth.current = true;
        setIsProcessingOAuth(true);
        
        console.log('Processing OAuth tokens');
        
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (sessionError) {
            console.error('Failed to set session:', sessionError);
            setOauthError(sessionError.message);
            setIsProcessingOAuth(false);
            return;
          }
          
          toast.success('Welcome!');
          navigate('/', { replace: true });
        } catch (err) {
          console.error('Error setting session:', err);
          setOauthError(err instanceof Error ? err.message : 'Failed to complete sign in');
          setIsProcessingOAuth(false);
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isProcessingOAuth) {
      navigate('/');
    }
  }, [user, navigate, isProcessingOAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await login(email, password);
        if (error) {
          toast.error(error);
          setIsLoading(false);
          return;
        }
        toast.success('Welcome back!');
        navigate('/');
      } else {
        const result = signupSchema.safeParse({ name, email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signup(name, email, password);
        if (error) {
          toast.error(error);
          setIsLoading(false);
          return;
        }
        toast.success('Account created! Please check your email to confirm your account.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show error state for OAuth failures
  if (oauthError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-destructive">Sign in failed</CardTitle>
            <CardDescription>{oauthError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                setOauthError(null);
                hasProcessedOAuth.current = false;
                navigate('/auth', { replace: true });
              }} 
              className="w-full"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while processing OAuth
  if (isProcessingOAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <img 
            src={splitlelyLogo} 
            alt="Splitley Logo" 
            className="w-24 h-24 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Splitley</h1>
          <p className="text-muted-foreground">Split expenses with friends, simplified</p>
        </div>

        <Card className="border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Enter your credentials to access your account' 
                : 'Enter your details to get started'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google Sign In - now uses the new component with Despia support */}
            <GoogleLoginButton disabled={isLoading} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-sm text-primary hover:underline"
                disabled={isLoading}
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
