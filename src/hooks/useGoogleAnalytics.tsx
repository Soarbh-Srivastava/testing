import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGA, trackPageView } from '@/lib/analytics';

export const useGoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Initialize GA on mount
    initGA();
  }, []);

  useEffect(() => {
    // Track page views on route change
    trackPageView(location.pathname + location.search);
  }, [location]);
};
