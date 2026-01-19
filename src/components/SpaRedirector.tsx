import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function SpaRedirector() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");
    
    if (!redirect) return;

    try {
      const decoded = decodeURIComponent(redirect);
      navigate(`${decoded}${location.hash ?? ""}`, { replace: true });
    } catch {
      console.error('Failed to decode redirect path');
    }
  }, [location.search, location.hash, navigate]);

  return null;
}
