import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, eventSummary } = await req.json();
    const ollamaUrl = Deno.env.get("OLLAMA_URL");

    if (!ollamaUrl) {
      return new Response(JSON.stringify({ error: "A variável de ambiente OLLAMA_URL não está configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instructions = `Você é um assistente de IA para o TatamiPro. Sua tarefa é responder perguntas sobre um campeonato de Jiu-Jitsu usando APENAS o resumo fornecido. Seja direto e conciso. Se a informação não estiver no resumo, responda: "Não consigo encontrar essa informação nos dados do evento."`;

    const prompt = `
      ${instructions}

      ### Resumo do Evento ###
      ${eventSummary}
      ######################

      Pergunta do usuário: "${query}"
      Sua resposta:
    `;

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-oss:20b",
        messages: [{ role: "user", content: prompt }],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(JSON.stringify({ error: `Erro da API do Ollama (${response.status}): ${errorBody}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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