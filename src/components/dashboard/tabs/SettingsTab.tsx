import React, { useState } from 'react';
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
  Database
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization } from '@/src/types/database';

interface SettingsTabProps {
  organization: Organization;
  onUpdateOrg: (org: Organization) => void;
  onViewPublicPage: (slug: string) => void;
}

export function SettingsTab({ organization, onUpdateOrg, onViewPublicPage }: SettingsTabProps) {
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [address, setAddress] = useState(organization.address || '');
  const [phone, setPhone] = useState(organization.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/#/${slug}` 
    : `agendamento.app/${slug}`;

  function handleCopy() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSaving(true);
    try {
      const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const updated = await DataService.updateOrganization({
        id: organization.id,
        name: name.trim(),
        slug: sanitizedSlug,
        address: address.trim(),
        phone: phone.trim(),
      });
      onUpdateOrg(updated);
      setSlug(sanitizedSlug);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Configurações da Barbearia</h2>
        <p className="text-xs text-zinc-400">Personalize os dados da sua empresa e o link de agendamento compartilhado com os clientes.</p>
      </div>

      {/* Card do Link de Agendamento */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-emerald-400" /> Seu Link Único de Agendamento
        </h3>
        <p className="text-xs text-zinc-400">
          Envie este link para os clientes no WhatsApp, Instagram ou no balcão do seu salão.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <div className="flex-1 flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-400 overflow-hidden">
            <span className="text-zinc-500 truncate">{window.location.origin}/#/</span>
            <span className="text-white font-bold font-mono ml-0.5">{slug}</span>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleCopy}
              className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Link'}
            </button>

            <button 
              onClick={() => onViewPublicPage(slug)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Testar Vitrine
            </button>
          </div>
        </div>
      </div>

      {/* Formulário de Dados Cadastrais */}
      <form onSubmit={handleSave} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-zinc-400" /> Informações do Estabelecimento
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Nome da Barbearia</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Slug da URL (Link)</label>
            <input 
              type="text" 
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ex: navalha-de-ouro"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 font-medium block mb-1">Endereço Completo</label>
          <input 
            type="text" 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex: Av. Paulista, 1500 - Bela Vista, São Paulo - SP"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 font-medium block mb-1">Telefone / WhatsApp Comercial</label>
          <input 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-8888"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-zinc-800/50 mt-4">
          {savedSuccess ? (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Informações salvas com sucesso!
            </span>
          ) : <span />}

          <button 
            type="submit"
            disabled={isSaving}
            className="bg-white text-zinc-950 hover:bg-zinc-200 px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Salvar Alterações</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
