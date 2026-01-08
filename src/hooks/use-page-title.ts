import { useEffect } from 'react';

const DEFAULT_TITLE = 'TatamiPro - Competition Management';
const DEFAULT_FAVICON = '/favicon.ico';

/**
 * Hook to dynamically set page title and favicon
 * @param title - Page title (will be appended to app name)
 * @param favicon - Optional custom favicon URL
 */
export function usePageTitle(title?: string, favicon?: string) {
  useEffect(() => {
    // Set document title
    if (title) {
      document.title = `${title} | TatamiPro`;
    } else {
      document.title = DEFAULT_TITLE;
    }

    // Set favicon if provided
    if (favicon) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = favicon;
    }

    // Cleanup on unmount
    return () => {
      document.title = DEFAULT_TITLE;
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = DEFAULT_FAVICON;
      }
    };
  }, [title, favicon]);
}

/**
 * Hook specifically for event pages
 */
export function useEventPageTitle(eventName?: string, subPage?: string) {
  useEffect(() => {
    if (eventName) {
      const fullTitle = subPage 
        ? `${subPage} - ${eventName}` 
        : eventName;
      document.title = `${fullTitle} | TatamiPro`;
    }

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [eventName, subPage]);
}

export default usePageTitle;
