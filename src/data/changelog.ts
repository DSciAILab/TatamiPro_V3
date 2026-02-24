export interface ChangelogEntry {
  version: string;
  date: string;
  features?: string[];
  fixes?: string[];
  improvements?: string[];
}

export const changelog: ChangelogEntry[] = [
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
