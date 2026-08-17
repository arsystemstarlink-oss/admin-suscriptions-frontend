import React from 'react';
import { Home, MessageSquare, CreditCard, Settings } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BrandMark } from '../brand/BrandMark';
import { useUnreadChatsCount } from '@/hooks/useUnreadChatsCount';
import { HeaderActions } from './HeaderActions';

export default function MobileAppShell({ children, onOpenSearch }: { children?: React.ReactNode; onOpenSearch?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const unreadChatsCount = useUnreadChatsCount();

  // Determinar la tab activa basada en la ruta
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'home';
    if (path.startsWith('/subscriptions')) return 'subs';
    if (path.startsWith('/chats')) return 'chats';
    if (path.startsWith('/settings') || path.startsWith('/plans')) return 'settings';
    return 'home';
  };

  const activeTab = getActiveTab();

  const navItems = [
    { id: 'home', icon: Home, label: 'Inicio', path: '/' },
    { id: 'subs', icon: CreditCard, label: 'Suscripciones', path: '/subscriptions' },
    { id: 'chats', icon: MessageSquare, label: 'Chats', path: '/chats' },
    { id: 'settings', icon: Settings, label: 'Ajustes', path: '/config' },
  ];

  return (
    <div className="flex flex-col h-dvh w-full overflow-x-hidden bg-slate-50 text-primary-900 dark:bg-primary-950 dark:text-primary-50 select-none antialiased [-webkit-tap-highlight-color:transparent] [--mobile-header-h:calc(max(env(safe-area-inset-top),1rem)+3.25rem)] [--mobile-nav-h:calc(4.25rem+env(safe-area-inset-bottom))]">
      
      {/* Header Fijo con Glassmorphism */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),16px)] pb-3 bg-primary-800 text-primary-50 border-b border-primary-700 dark:bg-primary-950 dark:text-primary-50 dark:border-primary-900 backdrop-blur-md transition-colors">
        <BrandMark size="md" hideSystemOnMobile className="text-primary-50" />
        <HeaderActions unreadChatsCount={unreadChatsCount} onOpenSearch={onOpenSearch ?? (() => {})} />
      </header>

      {/* Contenedor Principal (Scroll) */}
      <main className="flex-1 overflow-y-auto touch-pan-y overscroll-y-contain pb-[calc(80px+env(safe-area-inset-bottom))]">
        <div className="px-4 py-6 flex flex-col gap-4">
          {children || <Outlet />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 border-t border-primary-100 dark:bg-primary-900/95 dark:border-primary-800 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] transition-colors">
        <ul className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id} className="flex-1 flex justify-center">
                <button
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-center w-full min-h-11 py-2 gap-1 active:scale-95 transition-transform touch-manipulation focus:outline-none"
                  aria-label={item.label}
                  aria-selected={isActive}
                  role="tab"
                >
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-colors ${
                      isActive
                        ? 'text-secondary-600 dark:text-secondary-400'
                        : 'text-primary-400 dark:text-primary-500'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium tracking-wide transition-colors ${
                      isActive
                        ? 'text-primary-900 dark:text-primary-50'
                        : 'text-primary-500 dark:text-primary-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
