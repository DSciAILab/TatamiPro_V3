export interface ChangelogEntry {
  version: string;
  date: string;
  features?: string[];
  fixes?: string[];
  improvements?: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "0.1.24",
    date: new Date().toISOString().split('T')[0],
    features: [
      "Check-in: Adição do badge contador de 'W.O.' (Walkovers) na tela de controle geral (Web e Mobile/Staff).",
      "Mat Control: Filtros de tatames (ex: 'Mat 1') agora persistem navegação mantendo o estado através do LocalStorage.",
      "Theming: A página inicial (Welcome) agora consome automaticamente e aplica o tema do evento ativo mais recente."
    ],
    fixes: [
      "Lógica de Chaves: A barra de 'Fight Order' no Mat 1 agora exibe corretamente o Título da Divisão (Division Name) para cada chave.",
      "Lógica de Chaves: Formagação visual ajustada para identificar lutas mais facilmente (ex: '1-1' em vez de 'Mat 1-M1')."
    ]
  },
  {
    version: "0.1.23",
    date: "2026-02-25",
    features: [
      "UI/UX: Cards de lutadores atualizados com highlights verde-neon ('Winner') e tipografia consistente com o restante das tabelas.",
      "Design System: Tematização global de Eventos agora engloba todos os diálogos da página de detalhes de lutas."
    ],
    fixes: [
      "Lógica de Chaves: Correção na propagação do perdedor da Luta 1 para a Luta 2 em chaves de 3 pessoas (Double Elimination).",
      "Mat Control: Fontes padronizadas para sans-serif para maior legibilidade nas telas de operação."
    ]
  },
  {
    version: "0.1.22",
    date: "2026-02-24",
    features: [
      "Página Pública: inclusão da aba 'Inscritos' com o sumário de divisões completo para visualização pública.",
    ],
    fixes: [
      "Staff Access: correção do erro 'Invalid or expired token' através da criação da tabela 'sjjp_staff_tokens'.",
      "Roteamento Vercel: melhoria no suporte a SPAs para evitar erros 404 em rotas de staff.",
    ],
    improvements: [
      "Internacionalização (i18n): labels das abas públicas (Chaves, Inscritos, etc) agora são totalmente traduzíveis.",
    ]
  },
  {
    version: "0.1.21",
    date: "2026-02-24",
    features: [
      "Login via QR Code: acesso rápido para staff através do botão de escaneamento na tela de login.",
      "Scanner de QR Code funcional integrado nas páginas Auth e Staff Access.",
    ],
    fixes: [
      "Correção de carregamento de Staff: mapeamento para a tabela 'sjjp_profiles' corrigido.",
      "Correção de Edge Functions: nomes de tabelas atualizados para usar o prefixo 'sjjp_' (admin-create-user, etc).",
    ],
    improvements: [
      "Versionamento automático refletido no perfil e nos metadados do projeto.",
    ]
  },
  {
    version: "0.1.20",
    date: "2026-02-24",
    features: [
      "Refinamento da aba Division Summary: o filtro 'All' agora oculta divisões vazias.",
      "Novo badge 'Divisions with fight' para identificar categorias com 2+ atletas.",
      "Posicionamento global de notificações (Toasts) movido para o canto superior direito (Top-Right).",
    ],
    improvements: [
      "Melhoria no fluxo de importação de divisões: reativação automática de divisões deletadas.",
      "Internationalização (i18n): Gênero e Faixa agora são traduzidos corretamente no resumo de divisões.",
    ],
    fixes: [
      "Correção de erro 'Bad Request' ao salvar evento após deletar divisões com dependências (fallback para Soft-Delete).",
      "Correção de erro de esquema na importação de divisões (campo helper 'csvRow' removido)."
    ]
  },
  {
    version: "0.1.19",
    date: "2026-02-24",
    features: [
      "Tabela de Approvals unificada com o layout da tabela de Registered Athletes.",
      "Select All + Batch Delete na aba Registered Athletes.",
      "Revert Approval Status: possibilidade de reverter atletas para 'Pending Approval'.",
      "Última URL de importação é salva e sugerida automaticamente na próxima importação.",
      "Detecção de duplicados na importação de atletas (por School ID / Emirates ID).",
      "Detecção de duplicados na importação de divisões (por nome da divisão)."
    ],
    fixes: [
      "Peso mínimo de validação corrigido de 20kg para 16kg (compatível com divisões Kids 1/Kids 2)."
    ]
  },
  {
    version: "0.1.18",
    date: "2026-02-23",
    improvements: [
      "Refinamento de contraste e acessibilidade visual em cards e temas.",
      "Melhoria na legibilidade de textos secundários (muted text) em estados ativos."
    ]
  },
  {
    version: "0.1.17",
    date: "2026-02-23",
    features: [
      "Estabilização do fluxo de autenticação e carregamento."
    ],
    fixes: [
      "Correção do loop infinito de unmounting no AuthProvider.",
      "Correção de páginas em branco causadas por falhas de timeout e flapping do ConnectionManager."
    ]
  },
  {
    version: "0.1.16",
    date: "2026-02-23",
    features: [
      "Adicionada nova central de versão (Changelog) no perfil do usuário."
    ]
  },
  {
    version: "0.1.15",
    date: "2026-02-22",
    features: [
      "Sistema de temas dinâmicos para Eventos (Neon, Premium Dojo, Deep Elite, Desert Gold)."
    ],
    fixes: [
      "Correção de tela preta e dependências 3D na visualização de blocos."
    ]
  },
  {
    version: "0.1.14",
    date: "2026-02-20",
    features: [
      "Integração com Judith Chat API e fluxo de autenticação via OpenClaw."
    ]
  },
  {
    version: "0.1.13",
    date: "2026-02-19",
    features: [
      "Aprimoramentos na página de Vídeos (nova ordenação e ícones de transcrição)."
    ]
  },
  {
    version: "0.1.10",
    date: "2026-02-17",
    improvements: [
      "Redesign da interface inspirada no padrão Behance (cores neon, badges e melhor espaçamento).",
      "Integração das tabelas Kanban com os dados base do projeto."
    ]
  }
];
