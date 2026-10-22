import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import { BrandSpinner } from './components/BrandSpinner';

const Landing = lazy(() => import('./pages/Landing'));
const AppShell = lazy(() => import('./app/AppShell'));
const Home = lazy(() => import('./app/pages/Home'));
const Research = lazy(() => import('./app/pages/Research'));
const Result = lazy(() => import('./app/pages/Result'));
const Compare = lazy(() => import('./app/pages/Compare'));
const Saved = lazy(() => import('./app/pages/Saved'));
const PriceWatch = lazy(() => import('./app/pages/PriceWatch'));
const Preferences = lazy(() => import('./app/pages/Preferences'));
const History = lazy(() => import('./app/pages/History'));
const NotFound = lazy(() => import('./pages/NotFound'));

function FullPageLoader() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <BrandSpinner label="Loading BuyWise" />
    </Box>
  );
}

export function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="research" element={<Research />} />
          <Route path="research/:id" element={<Result />} />
          <Route path="compare" element={<Compare />} />
          <Route path="saved" element={<Saved />} />
          <Route path="watch" element={<PriceWatch />} />
          <Route path="preferences" element={<Preferences />} />
          <Route path="history" element={<History />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
