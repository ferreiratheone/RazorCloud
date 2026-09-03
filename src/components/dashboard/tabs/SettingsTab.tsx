import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Save, 
  MapPin, 
  Phone, 
  ExternalLink, 
  Loader2, 
  Image as ImageIcon,
  Share2,
  ShieldCheck,
  AlertCircle,
  Upload,
  Trash2
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import { isSupabaseConfigured } from '@/src/lib/supabase/client';
import type { Organization } from '@/src/types/database';

interface SettingsTabProps {
  organization: Organization;
  onUpdateOrg: (org: Organization) => void;
  onViewPublicPage: (slug: string) => void;
}

// Função utilitária para comprimir e converter imagem do PC/Mobile para Base64 leve
function compressAndConvertImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Erro ao processar imagem.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
    reader.readAsDataURL(file);
  });
}

export function SettingsTab({ organization, onUpdateOrg, onViewPublicPage }: SettingsTabProps) {
  const [name, setName] = useState(organization.name || '');
  const [slug, setSlug] = useState(organization.slug || '');
  const [address, setAddress] = useState(organization.address || '');
  const [phone, setPhone] = useState(organization.phone || '');
  const [logoUrl, setLogoUrl] = useState(organization.logo_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(organization.name || '');
    setSlug(organization.slug || '');
    setAddress(organization.address || '');
    setPhone(organization.phone || '');
    setLogoUrl(organization.logo_url || '');
  }, [organization]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://meuagendamento.app';
  const publicUrl = `${originUrl}/#/${slug}`;
  const shareText = `💈 Olá! Agende seu corte ou barba na *${name || organization.name}* com rapidez e sem filas pelo nosso link oficial:\n\n👉 ${publicUrl}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleCopyMsg() {
    navigator.clipboard.writeText(shareText);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressAndConvertImage(file);
      setLogoUrl(base64);
    } catch (err) {
      console.error('Erro ao carregar imagem:', err);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
      
      const updated = await DataService.updateOrganization({
        id: organization.id,
        name: name.trim(),
        slug: sanitizedSlug || 'barbearia',
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
      });

      onUpdateOrg(updated);
      setSlug(updated.slug);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (e: any) {
      console.error('Erro ao salvar configurações:', e);
      setErrorMsg(e?.message || 'Ocorreu um erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  }

  const supabaseConnected = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Configurações da Barbearia</h2>
        <p className="text-xs text-zinc-400">
          Personalize a identidade da sua barbearia e gerencie o link exclusivo compartilhado com seus clientes.
        </p>
      </div>

      {/* Card do Link de Agendamento Oficial */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-emerald-400" /> Seu Link Oficial de Agendamento
          </h3>
          <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">
            Link Ativo
          </span>
        </div>

        <p className="text-xs text-zinc-400">
          Envie este link para os seus clientes no WhatsApp, na bio do Instagram ou cole no seu material de divulgação.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-400 overflow-hidden font-mono">
            <span className="text-zinc-500 truncate">{originUrl}/#/</span>
            <span className="text-white font-bold ml-0.5">{slug}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleCopyLink}
              className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copiado!' : 'Copiar Link'}
            </button>

            <button 
              onClick={handleCopyMsg}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {copiedMsg ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedMsg ? 'Mensagem Copiada!' : 'Copiar p/ WhatsApp'}
            </button>

            <button 
              onClick={() => onViewPublicPage(slug)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Abrir como cliente"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ver Vitrine
            </button>
          </div>
        </div>
      </div>

      {/* Formulário de Dados da Barbearia */}
      <form onSubmit={handleSave} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-zinc-400" /> Informações do Estabelecimento (White-Label)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Nome da Barbearia *</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Barbearia Estilo & Arte"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Link Personalizado (Slug da URL) *</label>
            <input 
              type="text" 
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ex: barbearia-estilo"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Seu link será: <code className="text-zinc-400">{originUrl}/#/{slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-')}</code>
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 font-medium block mb-1">Endereço Completo</label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input 
              type="text" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Av. Paulista, 1500 - Sala 4 - São Paulo, SP"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Telefone / WhatsApp da Barbearia</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {/* Upload Direto da Logomarca (PC e Celular) */}
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Logomarca da Barbearia</label>
            
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="relative group">
                  <img 
                    src={logoUrl} 
                    alt="Logo da Barbearia" 
                    className="w-14 h-14 rounded-2xl object-cover border border-zinc-700 shadow-md aspect-square"
                  />
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    title="Remover logo"
                    className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 shadow-lg transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-dashed border-zinc-800 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-6 h-6 text-zinc-600" />
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-400" />
                {logoUrl ? 'Trocar Logomarca' : 'Enviar do Computador / Celular'}
              </button>
            </div>
          </div>
        </div>

        {/* Mensagens de Erro ou Sucesso */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80 mt-4">
          <div>
            {supabaseConnected ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" /> Conectado ao Supabase
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
                <AlertCircle className="w-4 h-4" /> Modo Local (Offline)
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Informações salvas com sucesso!
              </span>
            )}

            <button 
              type="submit"
              disabled={isSaving}
              className="bg-white text-zinc-950 hover:bg-zinc-200 px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> Salvar Alterações</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
