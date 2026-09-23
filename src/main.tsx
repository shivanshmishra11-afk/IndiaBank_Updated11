import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Guard against unhandled cross-origin or storage script errors in sandboxed iframes
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // If it is a generic cross-origin script error, log diagnostic information
    if (event.message === 'Script error.') {
      console.warn('[India Bank Portal] Cross-origin script event caught gracefully');
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[India Bank Portal] Unhandled promise rejection captured:', event.reason);
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

