// Google Analytics utility functions
export const GA_MEASUREMENT_ID = 'G-JJ42L9610Z';

// GA is loaded via index.html, no need to initialize
export const initGA = () => {
  // GA script is already loaded in index.html
};

// Track page views
export const trackPageView = (url: string) => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  
  // @ts-ignore
  if (window.gtag) {
    // @ts-ignore
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  
  // @ts-ignore
  if (window.gtag) {
    // @ts-ignore
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track outbound link clicks (for /clipboard and other external links)
export const trackOutboundLink = (url: string, label?: string) => {
  trackEvent('click', 'outbound_link', label || url);
};
