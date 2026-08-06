import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PageFlipProvider } from '@/components/ui/page-flip'
import { installClickSound } from '@/lib/clickSound'

// One delegated listener for the whole site rather than a prop on every button.
// Controls opt out with `data-click-silent`; see lib/clickSound.
installClickSound()

// Outside App on purpose. The turning sheet has to survive the route change it
// is covering, and anything inside App unmounts with the page it belongs to.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PageFlipProvider>
      <App />
    </PageFlipProvider>
  </StrictMode>,
)
