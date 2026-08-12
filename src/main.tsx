import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PageFlipProvider } from '@/components/ui/page-flip'
import { FocusTimer } from '@/components/FocusTimer'
import { installClickSound } from '@/lib/clickSound'

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
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PageFlipProvider>
      <App />
      <FocusTimer />
    </PageFlipProvider>
  </StrictMode>,
)
