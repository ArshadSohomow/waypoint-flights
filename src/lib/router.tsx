import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// A small History-API router. The site has a fixed set of routes, so a full routing
// library would add weight without adding anything we use.

type RouterValue = { path: string; query: URLSearchParams; navigate: (to: string, opts?: { replace?: boolean }) => void };
const RouterContext = createContext<RouterValue>({ path: '/', query: new URLSearchParams(), navigate: () => {} });

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname);
  const [query, setQuery] = useState(() => window.location.search);
  const [navId, setNavId] = useState(0); // bumps on every navigation, so same-page hash links still scroll

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname);
      setQuery(window.location.search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) window.history.replaceState(null, '', to);
    else window.history.pushState(null, '', to);
    const u = new URL(to, window.location.origin);
    setPath(u.pathname);
    setQuery(u.search);
    setNavId((n) => n + 1);
  }, []);

  // New page: scroll to top and move focus to the main heading so screen-reader
  // and keyboard users land at the start of the new content.
  const first = React.useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const hash = window.location.hash.slice(1);
    const target = hash ? document.getElementById(decodeURIComponent(hash)) : null;
    if (target) {
      target.scrollIntoView();
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      return;
    }
    window.scrollTo(0, 0);
    const h = document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('h1');
    if (h) {
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, navId]);

  const params = React.useMemo(() => new URLSearchParams(query), [query]);
  return <RouterContext.Provider value={{ path, query: params, navigate }}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

export function Link({ to, children, ...rest }: { to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        rest.onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export function Redirect({ to }: { to: string }) {
  const { navigate } = useRouter();
  useEffect(() => navigate(to, { replace: true }), [to, navigate]);
  return null;
}
