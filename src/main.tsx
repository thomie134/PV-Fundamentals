import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import 'katex/dist/katex.min.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/diagrams.css';
import './styles/pages.css';
import { mdxComponents } from './components/mdx';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MDXProvider components={mdxComponents}>
        <App />
      </MDXProvider>
    </BrowserRouter>
  </StrictMode>,
);
