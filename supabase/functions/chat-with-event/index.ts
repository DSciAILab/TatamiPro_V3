import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Cabeçalhos CORS para permitir que o app frontend chame esta função
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para criar um resumo legível dos dados do evento
const createEventSummary = (eventData: any): string => {
  const summary = [];
  summary.push(`- Nome do Evento: ${eventData.name}`);
  summary.push(`- Data: ${eventData.date}`);
  summary.push(`- Status: ${eventData.status}`);
  summary.push(`- Descrição: ${eventData.description}`);

  if (eventData.athletes && eventData.athletes.length > 0) {
    const totalAthletes = eventData.athletes.length;
    const approved = eventData.athletes.filter((a: any) => a.registrationStatus === 'approved').length;
    const pending = eventData.athletes.filter((a: any) => a.registrationStatus === 'under_approval').length;
    const checkedIn = eventData.athletes.filter((a: any) => a.checkInStatus === 'checked_in').length;
    summary.push(`- Atletas: ${totalAthletes} inscritos (${approved} aprovados, ${pending} pendentes, ${checkedIn} com check-in OK).`);
  } else {
    summary.push("- Atletas: Nenhum atleta inscrito.");
  }

  if (eventData.divisions && eventData.divisions.length > 0) {
    summary.push(`- Divisões: ${eventData.divisions.length} divisões configuradas.`);
    summary.push(`  - Nomes das Divisões: ${eventData.divisions.map((d: any) => d.name).join(', ')}`);
  } else {
    summary.push("- Divisões: Nenhuma divisão configurada.");
  }

  if (eventData.brackets && Object.keys(eventData.brackets).length > 0) {
    const bracketedDivisions = Object.keys(eventData.brackets);
    summary.push(`- Brackets: Gerados para ${bracketedDivisions.length} divisões: ${bracketedDivisions.join(', ')}.`);
  } else {
    summary.push("- Brackets: Nenhum bracket gerado ainda.");
  }

  return summary.join('\n');
};

serve(async (req: Request) => {
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

    // Gera o resumo do evento
    const eventSummary = createEventSummary(eventData);

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