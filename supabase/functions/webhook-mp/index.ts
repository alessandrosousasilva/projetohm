import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    
    // O Mercado Pago envia o ID da transação na URL ou no corpo da requisição
    let paymentId = url.searchParams.get('data.id')
    if (!paymentId) {
      const body = await req.json().catch(() => ({}))
      paymentId = body?.data?.id
    }

    if (!paymentId) return new Response("Nenhum ID recebido", { status: 400 })

    // 1. Consulta o status real no Mercado Pago por segurança
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
    })
    const mpData = await mpRes.json()

    // 2. Se o PIX caiu, atualiza o status no Supabase
    if (mpData.status === 'approved') {
      // Usamos a SERVICE_ROLE_KEY para ter poder de admin no banco
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      await supabase
        .from('transacoes')
        .update({ status_pagamento: 'aprovado' })
        .eq('id_mercado_pago', String(paymentId))
    }

    return new Response("OK", { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})