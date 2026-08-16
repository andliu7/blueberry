import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PageFlipProvider } from '@/components/ui/page-flip'
import { FocusTimer } from '@/components/FocusTimer'
import { GlobalSearch } from '@/components/GlobalSearch'
import { installClickSound } from '@/lib/clickSound'
import { AuthProvider } from '@/lib/AuthContext'
import { BlueberryBot } from '@/components/ui/blueberry-bot'
import { AccountCorner } from '@/components/ui/account-corner'

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
    {/* The avatar, on every page whose own header does not already carry one.
        Out here rather than inside App because App is a router of early
        returns with no single place that wraps every page. */}
    <AccountCorner />
  </PageFlipProvider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* One auth provider, subscribing once for the whole app.

        One provider, subscribing once. Roles come from `profiles` and the JWT
        is the credential the database checks itself, so there is no second
        system that can disagree about who you are.

        No `supabaseConfigured` branch: `AuthProvider` handles a missing client
        and renders its children either way. */}
    <AuthProvider>{tree}</AuthProvider>
  </StrictMode>,
)
