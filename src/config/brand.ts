/**
 * Configuração institucional e metadados de marca do JurisFlow.
 *
 * REGRA ARQUITETURAL:
 * Qualquer menção textual ao nome da plataforma, mantenedora, e-mails de suporte,
 * dados da LGPD/DPO ou links institucionais DEVE ser importada deste arquivo.
 * É estritamente proibido escrever o nome da marca ou dados de contato diretamente nos componentes.
 */

/**
 * Congela recursivamente um objeto em tempo de execução (deep freeze).
 * O modificador TypeScript 'as const' atua apenas na checagem estática de tipos
 * do compilador, sendo eliminado na transpilação para JavaScript. O deepFreeze garante
 * a imutabilidade real em runtime via Object.freeze em todos os níveis do objeto.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Congela primeiro as propriedades filhas recursivamente
  Object.keys(obj).forEach((prop) => {
    const value = (obj as Record<string, unknown>)[prop];
    if (
      value !== null &&
      (typeof value === "object" || typeof value === "function")
    ) {
      deepFreeze(value);
    }
  });

  return Object.freeze(obj);
}

export const brand = deepFreeze({
  /**
   * Identificação da Plataforma
   */
  name: "JurisFlow",
  shortName: "JurisFlow",
  slug: "jurisflow",
  tagline: "Gestão Jurídica Inteligente e Segura",
  description:
    "Plataforma SaaS multi-tenant para escritórios de advocacia e departamentos jurídicos.",

  /**
   * Mantenedora / Razão Social
   */
  company: {
    name: "Triforce System",
    legalName: "Triforce System (TODO: Definir Razão Social)",
    cnpj: "00.000.000/0000-00", // TODO: Inserir CNPJ oficial
    address: "TODO: Definir endereço institucional",
  },

  /**
   * Contatos e Canais Institucionais (Placeholders explícitos)
   */
  contact: {
    generalEmail: "contato@exemplo.com.br",
    supportEmail: "suporte@exemplo.com.br",
    // Canal obrigatório do Encarregado de Dados (DPO / LGPD art. 41)
    privacyEmail: "privacidade@exemplo.com.br",
    phone: "TODO: +55 00 00000-0000", // TODO: Inserir telefone/WhatsApp institucional
  },

  /**
   * Rotas e URLs Institucionais
   */
  urls: {
    website: "https://exemplo.com.br",
    termsOfService: "/termos-de-uso",
    privacyPolicy: "/politica-de-privacidade",
    security: "/seguranca",
  },

  /**
   * Redes Sociais Institucionais (Placeholders sem URLs inventadas)
   */
  social: {
    linkedin: "TODO: Definir URL oficial",
    instagram: "TODO: Definir URL oficial",
  },
} as const);

export type Brand = typeof brand;
