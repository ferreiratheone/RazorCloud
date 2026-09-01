import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Star, 
  Phone, 
  Mail, 
  Loader2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization, UserProfile } from '@/src/types/database';

interface TeamTabProps {
  organization: Organization;
}

export function TeamTab({ organization }: TeamTabProps) {
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'owner' | 'barber' | 'admin'>('barber');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function loadTeam() {
    setLoading(true);
    try {
      const list = await DataService.getTeam(organization.id);
      setTeam(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, [organization.id]);

  function handleOpenCreate() {
    setEditingMember(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('barber');
    setAvatarUrl('');
    setIsModalOpen(true);
  }

  function handleOpenEdit(member: UserProfile) {
    setEditingMember(member);
    setFullName(member.full_name);
    setEmail(member.email || '');
    setPhone(member.phone || '');
    setRole(member.role);
    setAvatarUrl(member.avatar_url || '');
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsSaving(true);
    try {
      if (editingMember) {
        await DataService.updateTeamMember(editingMember.id, {
          full_name: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          avatar_url: avatarUrl.trim() || undefined,
        });
      } else {
        await DataService.createTeamMember({
          organization_id: organization.id,
          full_name: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          avatar_url: avatarUrl.trim() || `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random()*1000)}?w=150&auto=format&fit=crop&q=80`,
          active: true,
        });
      }
      setIsModalOpen(false);
      await loadTeam();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja remover este membro da equipe?')) {
      await DataService.deleteTeamMember(id);
      setTeam(prev => prev.filter(t => t.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Sua Equipe de Profissionais</h2>
          <p className="text-xs text-zinc-400">Cadastre os barbeiros que atendem no salão para receberem agendamentos.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Adicionar Barbeiro
        </button>
      </div>

      {/* Grid de Barbeiros */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
          Carregando equipe...
        </div>
      ) : team.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-800/60 rounded-2xl p-12 text-center bg-zinc-900/20">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-zinc-300">Nenhum barbeiro cadastrado</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Cadastre os profissionais para que os clientes possam selecioná-los no momento do agendamento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {team.map((member) => (
            <div 
              key={member.id}
              className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  {member.avatar_url ? (
                    <img 
                      src={member.avatar_url} 
                      alt={member.full_name} 
                      width={48}
                      height={48}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover border border-zinc-700 shrink-0 aspect-square" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 text-sm shrink-0">
                      {member.full_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{member.full_name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/50">
                        {member.role === 'owner' ? 'Dono' : member.role === 'admin' ? 'Gerente' : 'Barbeiro'}
                      </span>
                      <span className="text-xs text-amber-400 flex items-center gap-0.5 font-medium">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {member.rating || 5.0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800/50 pt-3">
                  {member.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" /> {member.phone}
                    </p>
                  )}
                  {member.email && (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" /> {member.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-4 mt-3 border-t border-zinc-800/40">
                <button 
                  onClick={() => handleOpenEdit(member)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(member.id)}
                  className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Membro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white">
              {editingMember ? 'Editar Profissional' : 'Novo Barbeiro'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Matheus Santos"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Função / Cargo</label>
                  <select 
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="barber">Barbeiro</option>
                    <option value="owner">Dono / Sócio</option>
                    <option value="admin">Gerente</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Telefone / WhatsApp</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="barbeiro@exemplo.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">URL da Foto de Perfil (Opcional)</label>
                <input 
                  type="url" 
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Barbeiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
