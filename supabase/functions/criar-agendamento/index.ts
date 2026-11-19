// ==============================================================================
// SUPABASE EDGE FUNCTION: criar-agendamento
// Arquitetura Blindada contra Bots, Scraping, Double-Booking e Injeção
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Headers de CORS seguros
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-turnstile-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Sanitização estrita contra XSS e HTML Injection
function sanitizeText(input?: string): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>?/gm, "") // Remove qualquer tag HTML/script
    .replace(/['";\\]/g, "")    // Remove aspas ou caracteres perigosos
    .trim();
}

// Validação de UUID v4
function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Verificação de desafio Cloudflare Turnstile (Anti-Bot / Anti-DDoS)
async function verifyTurnstileToken(token?: string, clientIp?: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY");

  // Se a chave secreta ainda não foi cadastrada no painel do Supabase Secrets,
  // permitimos passar logando o aviso para não travar o ambiente em homologação.
  if (!secretKey) {
    console.warn("[SEGURANÇA] TURNSTILE_SECRET_KEY não definida nos Secrets do Supabase. Pulando validação de CAPTCHA.");
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "Token de verificação anti-robô não fornecido." };
  }

  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (clientIp) formData.append("remoteip", clientIp);

    const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const result = await turnstileRes.json();
    if (!result.success) {
      console.warn("[TURNSTILE] Falha na validação do robô:", result["error-codes"]);
      return { success: false, error: "Falha na validação anti-robô. Por favor recarregue e tente novamente." };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[TURNSTILE ERROR]", err);
    return { success: false, error: "Erro de comunicação ao validar proteção contra bots." };
  }
}

serve(async (req) => {
  // Tratar requisição preflight de CORS (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Método HTTP não permitido." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configuração do servidor Supabase incompleta (URL ou Service Role Key ausente).");
    }

    // Inicializa o cliente com Service Role (apenas dentro da Edge Function, nunca exposto no front-end)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const {
      organization_id,
      service_id,
      user_id,
      client_name,
      client_phone,
      client_email,
      start_time,
      end_time,
      price,
      is_subscription,
      products,
      products_total,
      additional_services,
      notes,
      turnstile_token,
    } = body;

    const clientIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;

    // 1. Validação do Cloudflare Turnstile (Anti-Spam / Anti-Robô)
    const botCheck = await verifyTurnstileToken(turnstile_token, clientIp);
    if (!botCheck.success) {
      return new Response(JSON.stringify({ success: false, error: botCheck.error }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Sanitização & Validação dos Dados do Cliente (LGPD & Prevenção de Injeção)
    const sanitizedName = sanitizeText(client_name);
    if (!sanitizedName || sanitizedName.length < 2 || sanitizedName.length > 100) {
      return new Response(JSON.stringify({ success: false, error: "Nome do cliente inválido (mínimo 2 e máximo 100 caracteres)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = (client_phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return new Response(JSON.stringify({ success: false, error: "Número de telefone/WhatsApp inválido (deve conter DDD + 8 ou 9 dígitos)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedEmail = client_email ? sanitizeText(client_email).toLowerCase() : null;
    if (sanitizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return new Response(JSON.stringify({ success: false, error: "Formato de e-mail inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Validação dos IDs de Organização, Serviço e Barbeiro
    if (!isValidUuid(organization_id) || !isValidUuid(service_id) || !isValidUuid(user_id)) {
      return new Response(JSON.stringify({ success: false, error: "Identificadores de estabelecimento, serviço ou profissional inválidos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Validação das Datas & Horários
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      return new Response(JSON.stringify({ success: false, error: "Horário de início e término inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Impede agendamento em datas passadas (com tolerância de 15 minutos para compensar clock skew)
    const now = new Date(Date.now() - 15 * 60 * 1000);
    if (startDate < now) {
      return new Response(JSON.stringify({ success: false, error: "Não é permitido agendar em horários passados." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Prevenção de Conflito de Agendamento (Double-Booking / Race Condition)
    // Verifica se o barbeiro já possui algum agendamento no mesmo intervalo que não esteja cancelado
    const { data: conflicts, error: conflictErr } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", user_id)
      .neq("status", "cancelled")
      .lt("start_time", endDate.toISOString())
      .gt("end_time", startDate.toISOString());

    if (conflictErr) {
      console.error("[EDGE FUNCTION] Erro ao verificar conflito de agenda:", conflictErr);
      throw conflictErr;
    }

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Este horário acabou de ser reservado por outro cliente. Por favor, escolha outro horário disponível na agenda.",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6. Inserção Segura no Banco com Service Role Key
    const payload = {
      organization_id,
      service_id,
      user_id,
      client_name: sanitizedName,
      client_phone: cleanPhone,
      client_email: sanitizedEmail,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      status: "confirmed",
      price: Number(price) || 0,
      is_subscription: Boolean(is_subscription),
      products: products || null,
      products_total: Number(products_total) || 0,
      additional_services: additional_services || null,
      notes: notes ? sanitizeText(notes) : null,
    };

    const { data: createdAppointment, error: insertError } = await supabaseAdmin
      .from("appointments")
      .insert([payload])
      .select(`
        id,
        organization_id,
        service_id,
        user_id,
        client_name,
        client_phone,
        client_email,
        start_time,
        end_time,
        status,
        price,
        notes,
        is_subscription,
        products,
        products_total,
        additional_services,
        created_at
      `)
      .single();

    if (insertError) {
      console.error("[EDGE FUNCTION] Erro ao inserir agendamento:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível registrar o agendamento no banco de dados." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Retorno de Sucesso com Resposta Blindada
    return new Response(
      JSON.stringify({
        success: true,
        message: "Agendamento confirmado com sucesso!",
        appointment: createdAppointment,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[EDGE FUNCTION FATAL]", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Erro interno ao processar agendamento." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
