# Welcome to your Dyad app

This is the TatamiPro application for managing Jiu-Jitsu championships.

## Development

To run the application locally:

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:8080`.

## Deployment to Netlify

This project is configured for static site deployment with Netlify, including Netlify Functions for server-side logic.

### Build Command and Publish Directory

*   **Build Command**: `npm run build`
*   **Publish Directory**: `dist`

### Netlify Functions

Netlify Functions são funções serverless que rodam na infraestrutura do Netlify. Elas estão localizadas no diretório `netlify/functions`.

*   **Localização**: `netlify/functions/`
*   **Exemplo de Rota**: Uma função chamada `generate-brackets.ts` será acessível em `/.netlify/functions/generate-brackets`.

### Environment Variables

Variáveis sensíveis (ex: chaves de API, segredos) devem ser armazenadas como Variáveis de Ambiente no Netlify.

**Como definir Variáveis de Ambiente no Netlify:**

1.  Vá para o seu site na UI do Netlify.
2.  Navegue até **Site settings > Build & deploy > Environment**.
3.  Clique em **Add a variable** para adicionar novos pares chave-valor.
4.  Você pode definir diferentes escopos (ex: "Build settings", "Runtime"). Para Netlify Functions, as variáveis estão disponíveis em tempo de execução.

### Passo a passo para o primeiro deploy:

1.  **Conectar ao GitHub**: No Netlify, crie um novo site a partir do Git e conecte-o ao seu repositório GitHub.
2.  **Selecione seu repositório**: Escolha o repositório onde seu código TatamiPro está hospedado.
3.  **Configurar as configurações de build**:
    *   **Branch para deploy**: `main` (ou sua branch principal)
    *   **Comando de build**: `npm run build`
    *   **Diretório de publicação**: `dist`
4.  **Deploy do site**: Clique em "Deploy site". O Netlify detectará e fará o deploy automaticamente de suas funções do diretório `netlify/functions`.

## Persistência de Dados

Esta aplicação utiliza o **Supabase** como backend para persistência de dados. Todas as informações, incluindo eventos, atletas, divisões e brackets, são armazenadas em um banco de dados PostgreSQL gerenciado pelo Supabase.

A comunicação com o banco de dados é feita diretamente do cliente React usando a biblioteca `supabase-js`, com políticas de segurança de nível de linha (RLS) para garantir que os usuários só possam acessar e modificar os dados permitidos. A aplicação também utiliza as assinaturas em tempo real do Supabase para manter os dados atualizados entre múltiplos usuários.

## Dados de Demonstração (Seed Demo Data)

Para testar rapidamente a aplicação com alguns dados de demonstração, você pode registrar manualmente alguns atletas em um evento. Não há um "script de seed" dedicado para o estado do lado do cliente, pois ele é efêmero. Para um backend persistente, um script de seed seria fornecido.