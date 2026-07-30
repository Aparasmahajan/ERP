import { ReactNode } from 'react';

/**
 * Chrome lives in the page component, not here, because the sidebar needs the signed-in
 * user, their capabilities and the tenant's branding — all of which come from one
 * authenticated fetch. A layout wrapping /login would also have to special-case it.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
