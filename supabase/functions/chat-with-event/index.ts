import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Cabeçalhos CORS para permitir que o app frontend chame esta função
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Lida com a requisição pre-flight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, eventData } = await req.json();
    const ollamaUrl = Deno.env.get("OLLAMA_URL");

    if (!ollamaUrl) {
      return new Response(JSON.stringify({ error: "A variável de ambiente OLLAMA_URL não está configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Novas instruções detalhadas para o chatbot
    const instructions = `Você é o assistente oficial deste campeonato de Jiu-Jitsu.
Seu papel é responder de forma clara, curta e confiável às perguntas dos usuários sobre o evento.

### Regras de comportamento:
1. Sempre responda em tom profissional, acolhedor e objetivo.
2. Se a pergunta for sobre informações do evento, use APENAS os dados fornecidos. O escopo de informações inclui:
   - Nome do campeonato, local, datas, horários.
   - Tabelas de lutas (brackets).
   - Regras principais.
   - Procedimentos de pesagem.
   - Premiação.
   - Informações de equipes e atletas.
   - Contatos de suporte.
3. Se a informação não estiver disponível nos dados fornecidos, diga claramente:
   "No momento não tenho essa informação, por favor verifique com a organização do evento."
   Nunca invente dados.
4. Resuma sempre que possível, e ofereça informações em formato de lista quando forem muitos detalhes.
5. Se a pergunta não tiver relação com o evento, redirecione educadamente:
   "Este assistente só responde perguntas relacionadas ao campeonato."

### Estilo de resposta:
- Breve, direto e com clareza.
- Use listas e bullets para organizar informações.
- Evite linguagem excessivamente técnica ou prolixa.

Você está agora pronto para responder dúvidas sobre este campeonato.`;

    const prompt = `
      ${instructions}

      Dados do Evento para sua referência:
      ${JSON.stringify(eventData, null, 2)}

      Pergunta do usuário: "${query}"
      Sua resposta:
    `;

    // Chama a API do Ollama com streaming
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-oss:20b",
        messages: [{ role: "user", content: prompt }],
        stream: true,
      }),
    });

    // Adiciona verificação para respostas de erro da API do Ollama
    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(JSON.stringify({ error: `Erro da API do Ollama (${response.status}): ${errorBody}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retorna a resposta em streaming diretamente para o cliente
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/x-ndjson",
      },
    });
  } catch (error: any) {
    console.error("Erro na Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});