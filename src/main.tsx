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
    {/* One auth provider, subscribing once for the whole app.

        This replaced ClerkProvider and its boundary. Clerk could hold a session
        that nothing on the server could verify, so an owner saw every editing
        control and could save none of them. Supabase's JWT is the credential
        the database checks, and roles come from `profiles`, so there is no
        second system to disagree with.

        No `supabaseConfigured` branch is needed here: `AuthProvider` handles a
        missing client itself and renders its children either way, unlike
        ClerkProvider which threw when handed no key. */}
    <AuthProvider>{tree}</AuthProvider>
  </StrictMode>,
)
