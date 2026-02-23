export interface ChangelogEntry {
  version: string;
  date: string;
  features?: string[];
  fixes?: string[];
  improvements?: string[];
}

export const changelog: ChangelogEntry[] = [
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
