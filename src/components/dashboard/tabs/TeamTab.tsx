import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Phone, 
  Mail, 
  Loader2,
  Upload,
  Image as ImageIcon,
  KeyRound,
  MessageCircle,
  Check
} from 'lucide-react';
import { DataService } from '@/src/lib/data-service';
import type { Organization, UserProfile } from '@/src/types/database';

interface TeamTabProps {
  organization: Organization;
}

function compressAndConvertImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
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

export function TeamTab({ organization }: TeamTabProps) {
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'barber' | 'admin'>('barber');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Credenciais geradas para envio fácil via WhatsApp
  const [justCreatedCreds, setJustCreatedCreds] = useState<{
    name: string;
    email: string;
    phone?: string;
    password?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setPassword('');
    setRole('barber');
    setAvatarUrl('');
    setIsModalOpen(true);
  }

  function handleOpenEdit(member: UserProfile) {
    setEditingMember(member);
    setFullName(member.full_name);
    setEmail(member.email || '');
    setPhone(member.phone || '');
    setPassword('');
    setRole(member.role);
    setAvatarUrl(member.avatar_url || '');
    setIsModalOpen(true);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressAndConvertImage(file);
      setAvatarUrl(base64);
    } catch (err) {
      console.error('Erro ao carregar foto:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsSaving(true);
    try {
      if (editingMember) {
        const updated = await DataService.updateTeamMember(editingMember.id, {
          full_name: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          avatar_url: avatarUrl.trim() || undefined,
        }, organization.id);
        setTeam(prev => prev.map(m => m.id === editingMember.id ? updated : m));
      } else {
        const created = await DataService.createTeamMember({
          organization_id: organization.id,
          full_name: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          password: password.trim() || undefined,
          role,
          avatar_url: avatarUrl.trim() || undefined,
          active: true,
        });
        setTeam(prev => [created, ...prev.filter(m => m.id !== created.id)]);

        if (password.trim() && email.trim()) {
          setJustCreatedCreds({
            name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
            password: password.trim(),
          });
        }
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error('Erro ao salvar profissional:', e);
      alert('Não foi possível salvar o profissional. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente remover este membro da equipe?')) return;
    setTeam(prev => prev.filter(m => m.id !== id));
    await DataService.deleteTeamMember(id, organization.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-400" /> Equipe de Profissionais
          </h2>
          <p className="text-xs text-zinc-400">Gerencie os barbeiros e cabeleireiros disponíveis para os clientes escolherem.</p>
        </div>

        <button 
          onClick={handleOpenCreate}
          className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Adicionar Profissional
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
          <p className="text-xs">Carregando equipe...</p>
        </div>
      ) : team.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-3xl p-8 text-center bg-zinc-900/20">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-zinc-500" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Nenhum profissional cadastrado</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5">
            Se você atende sozinho ou tem outros barbeiros na sua equipe, cadastre os nomes para aparecerem na escolha do cliente.
          </p>
          <button 
            onClick={handleOpenCreate}
            className="bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Cadastrar Primeiro Profissional
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {team.map((member) => (
            <div 
              key={member.id}
              className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-all flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                {member.avatar_url ? (
                  <img 
                    src={member.avatar_url} 
                    alt={member.full_name} 
                    className="w-12 h-12 rounded-xl object-cover border border-zinc-700 aspect-square shrink-0" 
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-sm text-zinc-300 shrink-0">
                    {member.full_name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">{member.full_name}</h3>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-medium capitalize">
                      {member.role === 'owner' ? 'Proprietário' : 'Barbeiro'}
                    </span>
                  </div>

                  {member.phone && (
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3 text-zinc-500" /> {member.phone}
                    </p>
                  )}

                  {member.email && (
                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-zinc-600" /> {member.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {member.phone && (
                  <a
                    href={`https://wa.me/55${member.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Fala ${member.full_name}! 💈✂️\n\nSeu acesso ao painel da barbearia ${organization.name} está liberado:\n\n🔗 Link: ${typeof window !== 'undefined' ? window.location.origin : 'https://razorcloud.vercel.app'}\n📧 Seu E-mail: ${member.email || 'Informe seu e-mail cadastrado'}\n\nAcesse pelo seu celular para ver sua agenda e configurar seus horários de trabalho!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-950/40 transition-colors"
                    title="Enviar dados de acesso via WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                <button 
                  onClick={() => handleOpenEdit(member)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Editar"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(member.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar Membro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {editingMember ? 'Editar Profissional' : 'Novo Profissional'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nome Completo *</label>
                <input 
                  type="text" 
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Matheus Oliveira"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Cargo / Função</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="owner">Dono / Administrador</option>
                    <option value="barber">Barbeiro / Especialista</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">Telefone / WhatsApp</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Seção de Acesso ao Painel do Barbeiro */}
              <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">Acesso ao Painel do Barbeiro</h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Defina um e-mail e senha para o profissional fazer login pelo celular e acessar a própria agenda e horários.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">E-mail de Login</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="barbeiro@email.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">
                      {editingMember ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
                    </label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingMember ? 'Deixe vazio p/ manter' : 'Mínimo 6 dígitos'}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                </div>
              </div>

              {/* Upload da Foto do Barbeiro */}
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1.5">Foto do Barbeiro</label>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <div className="relative group">
                      <img 
                        src={avatarUrl} 
                        alt="Foto do Barbeiro" 
                        className="w-12 h-12 rounded-xl object-cover border border-zinc-700 shadow-md aspect-square"
                      />
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        title="Remover foto"
                        className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 shadow-lg transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-dashed border-zinc-800 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-zinc-400" />
                    {avatarUrl ? 'Trocar Foto' : 'Escolher Foto (PC / Celular)'}
                  </button>
                </div>
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
                  className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Profissional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Sucesso com Compartilhamento das Credenciais via WhatsApp */}
      {justCreatedCreds && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <Check className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Barbeiro Criado com Sucesso!</h3>
              <p className="text-xs text-zinc-400 mt-1">
                A conta de acesso para <strong>{justCreatedCreds.name}</strong> foi registrada no sistema.
              </p>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 text-left text-xs space-y-1.5 font-mono">
              <p className="text-zinc-400">📧 E-mail: <span className="text-white font-sans">{justCreatedCreds.email}</span></p>
              <p className="text-zinc-400">🔑 Senha: <span className="text-emerald-400 font-sans">{justCreatedCreds.password}</span></p>
            </div>

            <div className="space-y-2 pt-1">
              {justCreatedCreds.phone && (
                <a
                  href={`https://wa.me/55${justCreatedCreds.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Fala ${justCreatedCreds.name}! 💈✂️\n\nSeu acesso ao painel da ${organization.name} já foi criado:\n\n🔗 Link: ${typeof window !== 'undefined' ? window.location.origin : 'https://razorcloud.vercel.app'}\n📧 E-mail: ${justCreatedCreds.email}\n🔑 Senha: ${justCreatedCreds.password}\n\nAcesse pelo seu celular para ver sua agenda e configurar seus horários de atendimento!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setJustCreatedCreds(null)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" /> Enviar Dados pelo WhatsApp
                </a>
              )}

              <button
                type="button"
                onClick={() => setJustCreatedCreds(null)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs py-2.5 rounded-xl transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
