/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

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

    // Constrói o prompt para o LLM, fornecendo os dados do evento como contexto (RAG)
    const prompt = `
      Você é um assistente prestativo para um aplicativo de gerenciamento de campeonatos de Jiu-Jitsu chamado TatamiPro.
      Sua tarefa é responder às perguntas do usuário usando APENAS as informações fornecidas no seguinte JSON de dados do evento.
      Se a resposta não estiver nos dados, diga "Não consigo encontrar essa informação nos dados do evento."

      Aqui estão os dados do evento:
      ${JSON.stringify(eventData, null, 2)}

      Pergunta do usuário: "${query}"
    `;

    // Chama a API do Ollama com streaming
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3", // Você pode alterar para o modelo que estiver usando
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