import type { Service } from '@/src/types/database';

export interface ServiceCategoryDef {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  aliases?: string[];
  keywords: string[];
}

export const APP_SERVICE_CATEGORIES: ServiceCategoryDef[] = [
  { 
    id: 'Cabelo', 
    label: 'Cabelo & Cortes', 
    shortLabel: '✂️ Cabelo', 
    icon: '✂️',
    aliases: ['cabelo', 'cortes', 'corte'],
    keywords: ['corte', 'cabelo', 'degrade', 'degradê', 'social', 'navalhado', 'tesoura', 'infantil', 'careca', 'maquina', 'máquina', 'fade']
  },
  { 
    id: 'Barba', 
    label: 'Barba & Cuidados', 
    shortLabel: '🪒 Barba', 
    icon: '🪒',
    aliases: ['barba', 'barba & cuidados', 'barbas'],
    keywords: ['barba', 'barboterapia', 'bigode', 'cavanhaque', 'barbeado', 'toalha quente']
  },
  { 
    id: 'Sobrancelha', 
    label: 'Sobrancelha & Pezinho', 
    shortLabel: '✨ Sobrancelha', 
    icon: '✨',
    aliases: ['Sobrancelha & Opcionais', 'sobrancelha', 'sobrancelhas', 'opcionais', 'pezinho'],
    keywords: ['sobrancelha', 'sobrancelhas', 'pezinho', 'perfil', 'acabamento', 'pinça', 'navalha sobrancelha']
  },
  { 
    id: 'Coloração', 
    label: 'Coloração & Luzes', 
    shortLabel: '🎨 Coloração', 
    icon: '🎨',
    aliases: ['Coloração & Luzes', 'coloracao', 'coloração', 'luzes', 'tintura', 'pigmentacao', 'pigmentação'],
    keywords: ['coloração', 'coloracao', 'luzes', 'pigmentação', 'pigmentacao', 'platinado', 'nevou', 'tintura', 'matização', 'descoloração', 'descoloracao', 'reflexo']
  },
  { 
    id: 'Combos', 
    label: 'Combos & Promoções', 
    shortLabel: '🔥 Combos & Promo', 
    icon: '🔥',
    aliases: ['Promoções & Combos', 'combos', 'promocoes', 'promoções', 'combo', 'promocao', 'promoção', 'pacote', 'pacotes'],
    keywords: ['combo', 'promoção', 'promocao', 'pacote', 'especial', '+', ' e ']
  },
  { 
    id: 'Outros', 
    label: 'Outros Serviços', 
    shortLabel: '💈 Outros', 
    icon: '💈',
    aliases: ['Geral', 'outros', 'geral', 'adicionais', 'outros serviços', 'outros servicos'],
    keywords: ['hidratação', 'hidratacao', 'lavagem', 'massagem', 'limpeza', 'esfoliação', 'esfoliacao', 'outros', 'geral', 'adicional']
  }
];

/**
 * Normaliza e deduz a categoria correta de um serviço.
 * Suporta correspondência direta, apelidos e dedução inteligente pelo título/descrição.
 */
export function getNormalizedCategory(service: Partial<Service> | null | undefined): string {
  if (!service) return 'Cabelo';

  const rawCat = (service.category || '').trim();

  // 1. Verificação direta de id ou aliases
  if (rawCat) {
    for (const catDef of APP_SERVICE_CATEGORIES) {
      if (rawCat.toLowerCase() === catDef.id.toLowerCase()) {
        return catDef.id;
      }
      if (catDef.aliases && catDef.aliases.some(a => a.toLowerCase() === rawCat.toLowerCase())) {
        return catDef.id;
      }
    }
  }

  // 2. Se o serviço tem flag promocional ativada e nenhuma categoria específica de barba/sobrancelha, pode ser combo
  if (service.is_promotional && !rawCat) {
    const textLower = `${service.name || ''} ${service.description || ''}`.toLowerCase();
    if (textLower.includes('+') || textLower.includes('combo')) {
      return 'Combos';
    }
  }

  // 3. Dedução inteligente por palavras-chave no nome e na descrição
  const text = `${service.name || ''} ${service.description || ''}`.toLowerCase();

  // Combos têm prioridade quando possuem '+' ou 'combo' (ex: "Corte + Barba")
  if (text.includes('combo') || text.includes(' + ') || (text.includes('+') && !text.includes('anos+'))) {
    return 'Combos';
  }

  // Sobrancelha / Pezinho
  if (text.includes('sobrancelha') || text.includes('pezinho') || text.includes('perfil')) {
    return 'Sobrancelha';
  }

  // Barba
  if (text.includes('barba') || text.includes('barboterapia') || text.includes('bigode') || text.includes('cavanhaque')) {
    return 'Barba';
  }

  // Coloração
  if (
    text.includes('coloração') || 
    text.includes('coloracao') || 
    text.includes('luzes') || 
    text.includes('pigmentação') || 
    text.includes('pigmentacao') || 
    text.includes('platinado') || 
    text.includes('nevou') ||
    text.includes('tintura') ||
    text.includes('descolor')
  ) {
    return 'Coloração';
  }

  // Cabelo / Cortes
  if (
    text.includes('corte') || 
    text.includes('cabelo') || 
    text.includes('degrade') || 
    text.includes('degradê') || 
    text.includes('social') || 
    text.includes('navalhado') || 
    text.includes('tesoura') || 
    text.includes('infantil') || 
    text.includes('careca') ||
    text.includes('fade')
  ) {
    return 'Cabelo';
  }

  // Se o usuário digitou uma categoria livre, tentar aproximar
  if (rawCat) {
    const lower = rawCat.toLowerCase();
    if (lower.includes('barba')) return 'Barba';
    if (lower.includes('sobrancelha') || lower.includes('pezinho')) return 'Sobrancelha';
    if (lower.includes('color') || lower.includes('luz')) return 'Coloração';
    if (lower.includes('combo') || lower.includes('promo')) return 'Combos';
    if (lower.includes('corte') || lower.includes('cabelo')) return 'Cabelo';
    return 'Outros';
  }

  // Default padrão
  return 'Cabelo';
}

/**
 * Retorna o rótulo legível e ícone da categoria
 */
export function getCategoryBadge(categoryId: string): { label: string; icon: string } {
  const found = APP_SERVICE_CATEGORIES.find(c => c.id.toLowerCase() === categoryId.toLowerCase());
  if (found) {
    return { label: found.label, icon: found.icon };
  }
  return { label: categoryId, icon: '💈' };
}
