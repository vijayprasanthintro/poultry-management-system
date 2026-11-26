import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PoultrySets from './pages/PoultrySets';
import BirdManagement from './pages/BirdManagement';
import DailyEggs from './pages/DailyEggs';
import DeadHenMortality from './pages/DeadHenMortality';
import EggStockPage from './pages/EggStockPage';
import EggPrices from './pages/EggPrices';
import FeedManagement from './pages/FeedManagement';
import FeedUsage from './pages/FeedUsage';
import Expenses from './pages/Expenses';
import Labours from './pages/Labours';
import LabourDetail from './pages/LabourDetail';
import LabourExpenses from './pages/LabourExpenses';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import LocalSales from './pages/LocalSales';
import WholesaleSales from './pages/WholesaleSales';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50/40">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="mt-3 text-sm font-semibold text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/poultry-sets" element={<PoultrySets />} />
            <Route path="/birds" element={<BirdManagement />} />
            <Route path="/daily-eggs" element={<DailyEggs />} />
            <Route path="/dead-hens" element={<DeadHenMortality />} />
            <Route path="/egg-stock" element={<EggStockPage />} />
            <Route path="/egg-prices" element={<EggPrices />} />
            <Route path="/feed" element={<FeedManagement />} />
            <Route path="/feed-usage" element={<FeedUsage />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/labours" element={<Labours />} />
            <Route path="/labours/:id" element={<LabourDetail />} />
            <Route path="/labour-expenses" element={<LabourExpenses />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/local-sales" element={<LocalSales />} />
            <Route path="/wholesale-sales" element={<WholesaleSales />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;