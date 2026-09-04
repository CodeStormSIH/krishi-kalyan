import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

export const MOBILE_SIDEBAR_QUERY = '(max-width: 780px)';

function subscribeToViewport(callback) {
  const query = window.matchMedia(MOBILE_SIDEBAR_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

const getMobileSnapshot = () => window.matchMedia(MOBILE_SIDEBAR_QUERY).matches;

export function useSidebar(pathname) {
  const isMobile = useSyncExternalStore(subscribeToViewport, getMobileSnapshot, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const sidebarRef = useRef(null);
  const toggleRef = useRef(null);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const visible = isMobile ? mobileOpen : !desktopCollapsed;

  // Reset before paint so a rapid click after resizing is not undone by a late effect.
  useLayoutEffect(closeMobile, [pathname, isMobile, closeMobile]);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const sidebar = sidebarRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusableElements = () => [...sidebar.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
    )].filter(element => element.getClientRects().length > 0);
    focusableElements()[0]?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobile();
      }
      if (event.key !== 'Tab') return;
      const elements = focusableElements();
      const first = elements[0], last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        sidebar.focus();
      } else if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      toggleRef.current?.focus();
    };
  }, [isMobile, mobileOpen, closeMobile]);

  function toggle() {
    if (isMobile) setMobileOpen(open => !open);
    else setDesktopCollapsed(collapsed => !collapsed);
  }

  return { isMobile, mobileOpen, desktopCollapsed, visible, toggle, closeMobile, sidebarRef, toggleRef };
}
