import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';

// Route-level code splitting: only Home ships in the first bundle.
const WeekPage = lazy(() => import('./pages/WeekPage').then((m) => ({ default: m.WeekPage })));
const GlossaryPage = lazy(() => import('./pages/GlossaryPage').then((m) => ({ default: m.GlossaryPage })));
const FoundationsIndex = lazy(() => import('./pages/Foundations').then((m) => ({ default: m.FoundationsIndex })));
const FoundationPage = lazy(() => import('./pages/Foundations').then((m) => ({ default: m.FoundationPage })));
const FormulasPage = lazy(() => import('./pages/FormulasPage'));
const PracticePage = lazy(() => import('./pages/PracticePage'));
const StyleGuide = lazy(() => import('./pages/StyleGuide'));

const page = (el: React.ReactNode) => <Suspense fallback={<div className="page muted">Loading…</div>}>{el}</Suspense>;

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="week/:n" element={page(<WeekPage />)} />
        <Route path="practice" element={page(<PracticePage />)} />
        <Route path="formulas" element={page(<FormulasPage />)} />
        <Route path="glossary" element={page(<GlossaryPage />)} />
        <Route path="foundations" element={page(<FoundationsIndex />)} />
        <Route path="foundations/:id" element={page(<FoundationPage />)} />
        <Route path="style-guide" element={page(<StyleGuide />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
