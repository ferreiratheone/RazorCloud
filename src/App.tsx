import React, { useState, useEffect, useTransition, Suspense, lazy } from 'react';
import { AuthModal } from './components/auth/AuthModal';
import { DataService } from './lib/data-service';
import { supabase, isSupabaseConfigured } from './lib/supabase/client';
import type { Organization, UserProfile } from './types/database';
import { Loader2 } from 'lucide-react';

const RazorCloudBookingPage = lazy(() => import('./components/public/BookingWizard'));
const RazorCloudAdminShell = lazy(() => import('./components/dashboard/RazorCloudAdminShell'));

export default function App() {
  const [currentView, setCurrentView] = useState<'public' | 'dashboard'>('public');
  const [slug, setSlug] = useState('minha-barbearia');
  const [isPending, startTransition] = useTransition();
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const [organization, setOrganization] = useState<Organization>({
    id: 'org-main',
    name: 'Minha Barbearia',
    slug: 'minha-barbearia',
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 1. Ouvir e processar mudanças no Hash da URL
  useEffect(() => {
    function parseHashRoute() {
      const hash = window.location.hash.replace('#/', '').replace('#', '').trim();
      
      if (hash === 'admin') {
        setCurrentView('dashboard');
      } else if (hash) {
        setSlug(hash);
        setCurrentView('public');
      } else {
        // Se a raiz estiver vazia, decide baseado no login
        if (currentUser) {
          setCurrentView('dashboard');
        } else {
          setCurrentView('public');
        }
      }
    }

    parseHashRoute();
    window.addEventListener('hashchange', parseHashRoute);
    return () => window.removeEventListener('hashchange', parseHashRoute);
  }, [currentUser]);

  // 2. Verificar Sessão Autenticada no Supabase / Local
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { user, organization: org } = await DataService.getCurrentUserProfile();
        
        if (isMounted) {
          if (user && org) {
            setCurrentUser(user);
            setOrganization(org);

            const hash = window.location.hash.replace('#/', '').replace('#', '').trim();
            // Se o hash for #/admin ou vazio, abre o painel
            if (hash === 'admin' || !hash) {
              setSlug(org.slug);
              setCurrentView('dashboard');
            } else {
              // Se o hash for um slug de barbearia (ex: #/minha-barbearia), exibe a vitrine daquela barbearia!
              setSlug(hash);
              setCurrentView('public');
            }
          } else {
            const hash = window.location.hash.replace('#/', '').replace('#', '').trim();
            if (hash === 'admin') {
              setIsAuthModalOpen(true);
            } else if (hash) {
              setSlug(hash);
              setCurrentView('public');
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao inicializar sessão:', err);
      } finally {
        if (isMounted) setIsLoadingSession(false);
      }
    }

    initSession();

    // Listener de login / logout no Supabase
    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { user, organization: org } = await DataService.getCurrentUserProfile();
          if (user && org && isMounted) {
            setCurrentUser(user);
            setOrganization(org);
            setSlug(org.slug);
            const hash = window.location.hash.replace('#/', '').replace('#', '').trim();
            if (hash === 'admin' || !hash) {
              setCurrentView('dashboard');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setCurrentUser(null);
            setCurrentView('public');
          }
        }
      });

      return () => {
        isMounted = false;
        authListener?.subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  function handleViewPublicPage(targetSlug: string) {
    startTransition(() => {
      setSlug(targetSlug);
      window.location.hash = `#/${targetSlug}`;
      setCurrentView('public');
    });
  }

  function handleOpenDashboard() {
    if (!currentUser) {
      setIsAuthModalOpen(true);
    } else {
      startTransition(() => {
        window.location.hash = '#/admin';
        setCurrentView('dashboard');
      });
    }
  }

  async function handleLogout() {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('razorcloud_current_user');
    setCurrentUser(null);
    window.location.hash = '#/';
    setCurrentView('public');
  }

  function handleAuthSuccess(user: UserProfile, org: Organization) {
    startTransition(() => {
      setCurrentUser(user);
      setOrganization(org);
      setSlug(org.slug);
      window.location.hash = '#/admin';
      setCurrentView('dashboard');
    });
  }

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
        <p className="text-xs text-zinc-500">Inicializando RazorCloud...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col antialiased">
      
      {/* Visualização Principal */}
      <div className="flex-1 min-h-0">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
              <p className="text-xs text-zinc-500">Carregando interface...</p>
            </div>
          }
        >
          {currentView === 'dashboard' && currentUser ? (
            <RazorCloudAdminShell 
              currentUser={currentUser}
              organization={organization}
              onUpdateOrg={(newOrg) => {
                setOrganization(newOrg);
                setSlug(newOrg.slug);
              }}
              onLogout={handleLogout}
              onViewPublicPage={handleViewPublicPage}
            />
          ) : (
            <RazorCloudBookingPage 
              slug={slug}
              onOpenDashboard={handleOpenDashboard}
            />
          )}
        </Suspense>
      </div>

      {/* Modal de Autenticação / Login do Dono */}
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
