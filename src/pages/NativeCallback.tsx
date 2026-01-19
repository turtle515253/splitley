import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const NativeCallback = () => {
  const [searchParams] = useSearchParams();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Get deeplink scheme from query params (set by edge function)
    const deeplinkScheme = searchParams.get('deeplink_scheme') || 
                           new URLSearchParams(window.location.search).get('deeplink_scheme');
    
    if (!deeplinkScheme) {
      console.error('No deeplink_scheme provided');
      return;
    }

    // Parse tokens from URL hash (Supabase implicit flow puts them here)
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    console.log('NativeCallback - Processing OAuth response');
    console.log('Deeplink scheme:', deeplinkScheme);
    console.log('Has access token:', !!accessToken);

    if (!accessToken) {
      // Check for errors
      const error = hashParams.get('error') || searchParams.get('error');
      const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');
      
      console.error('OAuth error:', error, errorDesc);
      
      // Redirect to app with error
      const errorUrl = `${deeplinkScheme}://oauth/auth?error=${encodeURIComponent(error || 'unknown')}&error_description=${encodeURIComponent(errorDesc || '')}`;
      window.location.href = errorUrl;
      return;
    }

    // Build deeplink URL
    // Format: myapp://oauth/auth?access_token=xxx&refresh_token=yyy
    // - myapp:// = your app's scheme
    // - oauth/ = tells native code to close ASWebAuthenticationSession/Chrome Custom Tab
    // - auth = the path to navigate to in the WebView
    // - ?params = passed to that page
    const params = new URLSearchParams();
    params.set('access_token', accessToken);
    if (refreshToken) {
      params.set('refresh_token', refreshToken);
    }

    const deeplinkUrl = `${deeplinkScheme}://oauth/auth?${params.toString()}`;
    
    console.log('Redirecting to deeplink:', deeplinkUrl);
    
    // This closes the ASWebAuthenticationSession / Chrome Custom Tab
    // and opens /auth?access_token=xxx in the WebView
    window.location.href = deeplinkUrl;
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
};

export default NativeCallback;
