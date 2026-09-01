import React, { useState, useEffect, useTransition, Suspense, lazy } from 'react';
import { AuthModal } from './components/auth/AuthModal';
import { DataService } from './lib/data-service';
import type { Organization, UserProfile } from './types/database';
import { Scissors, LayoutDashboard, Globe, KeyRound, Loader2 } from 'lucide-react';

// Dynamic code splitting for high PageSpeed performance and minimal initial bundle size
const RazorCloudBookingPage = lazy(() => import('./components/public/BookingWizard'));
const RazorCloudAdminShell = lazy(() => import('./components/dashboard/RazorCloudAdminShell'));

export default function App() {
  const [currentView, setCurrentView] = useState<'public' | 'dashboard'>('dashboard');
  const [slug, setSlug] = useState('minha-barbearia');
  const [isPending, startTransition] = useTransition();
  const [organization, setOrganization] = useState<Organization>({
    id: 'org-demo-123',
    name: 'RazorCloud Barber Studio',
    slug: 'minha-barbearia',
    address: 'Avenida Paulista, 1500 - São Paulo, SP',
    phone: '(11) 98765-4321',
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'user-demo-1',
    organization_id: 'org-demo-123',
    full_name: 'Alexandre Silva',
    role: 'owner',
    email: 'alexandre@razorcloud.app',
    rating: 4.9,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      const org = await DataService.getOrganizationBySlug(slug);
      if (org && isMounted) {
        setOrganization(org);
        setSlug(org.slug);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  function handleViewPublicPage(targetSlug: string) {
    startTransition(() => {
      setSlug(targetSlug);
      setCurrentView('public');
    });
  }

  function handleSwitchView(view: 'public' | 'dashboard') {
    startTransition(() => {
      setCurrentView(view);
    });
  }

  function handleAuthSuccess(user: UserProfile, org: Organization) {
    startTransition(() => {
      setCurrentUser(user);
      setOrganization(org);
      setSlug(org.slug);
      setCurrentView('dashboard');
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col antialiased">
      {/* Dev & Testing Quick Navigation Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <Scissors className="w-3 h-3 text-zinc-200" />
          </div>
          <span className="font-bold text-white tracking-tight">RazorCloud Mini-SaaS</span>
          <span className="text-zinc-500 hidden sm:inline">|</span>
          <span className="text-zinc-400 hidden sm:inline">
            Modo: <strong className="text-zinc-200">{currentView === 'dashboard' ? 'Painel do Dono (B2B)' : 'Vitrine do Cliente Final'}</strong>
          </span>
          {isPending && (
            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
              <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => handleSwitchView('dashboard')}
              aria-label="Abrir Painel B2B"
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-colors
                ${currentView === 'dashboard' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}
              `}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Painel B2B
            </button>
            <button
              onClick={() => handleSwitchView('public')}
              aria-label="Abrir Vitrine Pública"
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-colors
                ${currentView === 'public' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}
              `}
            >
              <Globe className="w-3.5 h-3.5" /> Vitrine /{organization.slug}
            </button>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(true)}
            aria-label="Trocar Conta ou Fazer Login"
            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg border border-zinc-700 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" /> Trocar Conta / Login
          </button>
        </div>
      </div>

      {/* Main View Render with Suspense Fallback */}
      <div className="flex-1 min-h-0">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
              <p className="text-xs font-medium text-zinc-400">Carregando interface do RazorCloud...</p>
            </div>
          }
        >
          {currentView === 'dashboard' ? (
            <RazorCloudAdminShell 
              currentUser={currentUser}
              organization={organization}
              onUpdateOrg={(newOrg) => {
                setOrganization(newOrg);
                setSlug(newOrg.slug);
              }}
              onLogout={() => setIsAuthModalOpen(true)}
              onViewPublicPage={handleViewPublicPage}
            />
          ) : (
            <RazorCloudBookingPage 
              slug={slug}
              onOpenDashboard={() => handleSwitchView('dashboard')}
            />
          )}
        </Suspense>
      </div>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
