import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, useRouter } from './lib/router';
import { BookingProvider } from './lib/booking';
import { ComingSoonProvider } from './components/Dialog';
import { SearchPage } from './pages/SearchPage';
import { FlightsPage } from './pages/FlightsPage';
import { ReviewPage } from './pages/ReviewPage';
import { SeatsPage } from './pages/SeatsPage';
import { SummaryPage } from './pages/SummaryPage';
import { PassengersPage } from './pages/PassengersPage';
import { PaymentPage } from './pages/PaymentPage';
import { ComparePage } from './pages/ComparePage';
import { ConfirmationPage, ErrorBoundary, NotFoundPage } from './pages/OtherPages';
import { BRAND } from './components/Chrome';

const TITLES: Record<string, string> = {
  '/': 'Book a flight',
  '/flights/outbound': 'Choose your outbound flight',
  '/flights/return': 'Choose your return flight',
  '/review': 'Review flights',
  '/seats/outbound': 'Outbound seats',
  '/seats/return': 'Return seats',
  '/compare/outbound': 'Compare outbound journeys',
  '/compare/return': 'Compare return journeys',
  '/summary': 'Bags and extras',
  '/passengers': 'Passenger details',
  '/payment': 'Review and confirm',
  '/confirmation': 'Booking confirmed',
};

function Routes() {
  const { path } = useRouter();
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  React.useEffect(() => {
    document.title = `${TITLES[clean] ?? 'Page not found'} · ${BRAND}`;
  }, [clean]);
  switch (clean) {
    case '/':
      return <SearchPage />;
    case '/flights/outbound':
      return <FlightsPage key="out" leg="outbound" />;
    case '/flights/return':
      return <FlightsPage key="ret" leg="return" />;
    case '/review':
      return <ReviewPage />;
    case '/seats/outbound':
      return <SeatsPage key="out" leg="outbound" />;
    case '/seats/return':
      return <SeatsPage key="ret" leg="return" />;
    case '/compare/outbound':
      return <ComparePage key="cout" leg="outbound" />;
    case '/compare/return':
      return <ComparePage key="cret" leg="return" />;
    case '/summary':
      return <SummaryPage />;
    case '/passengers':
      return <PassengersPage />;
    case '/payment':
      return <PaymentPage />;
    case '/confirmation':
      return <ConfirmationPage />;
    default:
      return <NotFoundPage />;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider>
        <BookingProvider>
          <ComingSoonProvider>
            <a className="skip-link" href="#main">Skip to main content</a>
            <Routes />
          </ComingSoonProvider>
        </BookingProvider>
      </RouterProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
