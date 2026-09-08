import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SiteChrome } from '@/components/SiteChrome'
import { PageFlipProvider } from '@/components/ui/page-flip'
import { installClickSound } from '@/lib/clickSound'
import { AuthProvider } from '@/lib/AuthContext'

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
    {/* The timer, the search, the bot and the avatar. Still mounted out here so
        they survive a route change, but gathered into one component because
        they now share a rule: they stand down on "#/app", where the game draws
        its own header, its own bottom tab bar and its own mascot. See
        components/SiteChrome. */}
    <SiteChrome />
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
