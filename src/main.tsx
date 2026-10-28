import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SiteChrome } from '@/components/SiteChrome'
import { PageFlipProvider } from '@/components/ui/page-flip'
import { installClickSound } from '@/lib/clickSound'
import { installGradientCursor } from '@/lib/gradientCursor'
import { AuthProvider } from '@/lib/AuthContext'

// One delegated listener for the whole site rather than a prop on every button.
// Controls opt out with `data-click-silent`; see lib/clickSound.
installClickSound()

// Same shape and the same reason: one delegated listener for every
// `.gradient-button` on the page, rather than a handler per button.
installGradientCursor()

// First-party analytics: one delegated click listener for every `data-track`
// control, plus screen views and visible time. Sends nothing until the visitor
// says yes to usage stats, and never under Do Not Track; see lib/analytics.
// A dynamic import, so its 2 KB load beside the first screen instead of in it.
void import('@/lib/analytics').then((analytics) => analytics.installAnalytics())

// The liquid-glass logo reveal: once per session, landing page only, after the page has
// loaded and the browser is idle. Never in the first-open path; see lib/glassSplash.
const afterLoad = () =>
  window.setTimeout(() => void import('@/lib/glassSplash').then((m) => m.mountGlassSplash()), 1200)
if (document.readyState === 'complete') afterLoad()
else window.addEventListener('load', afterLoad, { once: true })

// Outside App on purpose. The turning sheet has to survive the route change it
// is covering, and anything inside App unmounts with the page it belongs to.
//
// The focus timer is out here for the same reason and a stronger one: it is
// timing you reading a deck, so it has to keep counting while you move between
// pages. Mounted inside a route it would reset on every navigation, which is
// the one thing a timer must never do.
const tree = (
  <PageFlipProvider>
    {/* The header, the phone bar and the footer around every site page, and the
        timer, search and assistant beside them. SiteChrome wraps the router so
        the header comes before the page and the footer after it; it stands down
        on "#/app", where the game draws its own frame. See components/SiteChrome. */}
    <SiteChrome>
      <App />
    </SiteChrome>
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
