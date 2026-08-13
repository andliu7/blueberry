import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.tsx'
import { PageFlipProvider } from '@/components/ui/page-flip'
import { FocusTimer } from '@/components/FocusTimer'
import { GlobalSearch } from '@/components/GlobalSearch'
import { installClickSound } from '@/lib/clickSound'
import { CLERK_PUBLISHABLE_KEY, clerkConfigured } from '@/lib/clerk'
import { ClerkBoundary } from '@/components/ui/clerk-boundary'
import { BlueberryBot } from '@/components/ui/blueberry-bot'

// One delegated listener for the whole site rather than a prop on every button.
// Controls opt out with `data-click-silent`; see lib/clickSound.
installClickSound()

// Outside App on purpose. The turning sheet has to survive the route change it
// is covering, and anything inside App unmounts with the page it belongs to.
//
// The focus timer is out here for the same reason and a stronger one: it is
// timing you reading a deck, so it has to keep counting while you move between
// pages. Mounted inside a route it would reset on every navigation, which is
// the one thing a timer must never do.
const tree = (
  <PageFlipProvider>
    <App />
    <FocusTimer />
    {/* Out here for the same reason: `/` should open the search on any page,
        including ones whose header does not draw a search pill. */}
    <GlobalSearch />
    {/* Beside the timer for the same reason: it docks into the shared corner
        column and has to survive the route change, not remount with a page. */}
    <BlueberryBot />
  </PageFlipProvider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Wrapped only when there is a key to wrap it with.

        `ClerkProvider` throws when handed no publishable key, so mounting it
        unconditionally would turn a build without one into a white page rather
        than a site with a feature switched off. Every other optional service
        here works the same way: see `clerkConfigured` and `useGoogleAuth`. */}
    {clerkConfigured ? (
      <ClerkBoundary fallback={tree}>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!} afterSignOutUrl="#/home">
          {tree}
        </ClerkProvider>
      </ClerkBoundary>
    ) : (
      tree
    )}
  </StrictMode>,
)
