import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PageFlipProvider } from '@/components/ui/page-flip'

// Outside App on purpose. The turning sheet has to survive the route change it
// is covering, and anything inside App unmounts with the page it belongs to.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PageFlipProvider>
      <App />
    </PageFlipProvider>
  </StrictMode>,
)
