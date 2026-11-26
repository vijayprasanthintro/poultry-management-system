import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppearance } from '../context/AppearanceContext';
import Icon from '../components/Icon';
import LanguageSwitcher from '../components/LanguageSwitcher';

const NAV_KEYS = [
  { to: '/', labelKey: 'dashboard', icon: 'dashboard' },
  { to: '/poultry-sets', labelKey: 'poultrySets', icon: 'set' },
  { to: '/birds', labelKey: 'birdManagement', icon: 'bird' },
  { to: '/daily-eggs', labelKey: 'dailyEggs', icon: 'egg' },
  { to: '/dead-hens', labelKey: 'deadHens', icon: 'mortality' },
  { to: '/egg-stock', labelKey: 'eggStock', icon: 'stock' },
  { to: '/egg-prices', labelKey: 'eggPrices', icon: 'price' },
  { to: '/feed', labelKey: 'feed', icon: 'feed' },
  { to: '/feed-usage', labelKey: 'feedUsage', icon: 'usage' },
  { to: '/expenses', labelKey: 'expenses', icon: 'expense' },
  { to: '/labours', labelKey: 'labours', icon: 'customer' },
  { to: '/labour-expenses', labelKey: 'labourExpenses', icon: 'payment' },
  { to: '/customers', labelKey: 'customers', icon: 'customer' },
  { to: '/local-sales', labelKey: 'localSales', icon: 'sale' },
  { to: '/wholesale-sales', labelKey: 'wholesaleSales', icon: 'stock' },
  { to: '/payments', labelKey: 'payments', icon: 'payment' },
  { to: '/reports', labelKey: 'reports', icon: 'chart' },
  { to: '/audit-logs', labelKey: 'auditLogs', icon: 'audit' },
];

const QUICK_KEYS = [
  { to: '/settings', labelKey: 'settings', icon: 'settings' },
  { to: '/profile', labelKey: 'profile', icon: 'profile' },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, logout } = useAuth();
  const { t } = useLanguage();
  const { density } = useAppearance();

  const compact = density === 'compact';
  const closeSidebar = () => setSidebarOpen(false);

  const linkCls = ({ isActive }) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
    }`;

  return (
    <div className="flex h-dvh min-h-0 bg-orange-50/40">
      {/* Sidebar drawer overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex-col bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:flex ${
          sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-3 px-5 py-4 border-b border-slate-100">
          <span className="text-2xl">🐔</span>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">{t('layout.farmName')}</p>
            <p className="text-[10px] font-semibold text-brand-600 tracking-wide uppercase">{t('layout.tagline')}</p>
          </div>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-0.5">
          {NAV_KEYS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={linkCls}
              end={item.to === '/'}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {t(`nav.${item.labelKey}`)}
            </NavLink>
          ))}
        </nav>

        {/* Pinned bottom: settings / profile / logout */}
        <div className="shrink-0 border-t border-slate-100 p-2 space-y-0.5">
          {QUICK_KEYS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={linkCls}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {t(`nav.${item.labelKey}`)}
            </NavLink>
          ))}
          <button
            onClick={() => {
              closeSidebar();
              logout();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 h-dvh">
        {/* Top bar */}
        <header className="shrink-0 sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn-ghost lg:hidden shrink-0"
              aria-label={t('layout.openSidebar')}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-sm font-bold text-slate-800 sm:text-base hidden sm:block truncate">{t('layout.title')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <span className="hidden sm:block text-xs text-slate-500">{admin?.name}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-bold">
              {(admin?.name || 'A').charAt(0)}
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className={`flex-1 min-h-0 overflow-y-auto ${compact ? 'px-3 py-2.5 sm:px-4 lg:px-5' : 'px-4 py-4 sm:px-6 lg:px-8'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}