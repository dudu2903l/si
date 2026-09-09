const LARANJINHA_BASE_URL = process.env.LARANJINHA_BASE_URL || 'https://mqvdjjbkjglaimbnpcer.supabase.co/functions/v1/api-proxy';
const UTM_FIELDS = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term'];

function laranjinhaHeaders() {
    return {
        'X-API-Key': process.env.LARANJINHA_API_KEY || '',
        'Content-Type': 'application/json',
        Accept: 'application/json'
    };
}

function pickUtmFields(input) {
    const trackingParameters = (input && typeof input.trackingParameters === 'object' && input.trackingParameters)
        ? input.trackingParameters
        : {};

    return UTM_FIELDS.reduce((acc, field) => {
        const value = String(
            input && typeof input[field] === 'string' ? input[field] :
            (trackingParameters && typeof trackingParameters[field] === 'string' ? trackingParameters[field] : '')
        ).trim();

        if (value) acc[field] = value.slice(0, 255);
        return acc;
    }, {});
}

async function sendToUtmifySale(utmData, paymentData) {
    const utmifyUrl = process.env.UTMIFY_API_URL || process.env.UTMIFY_SALES_API_URL;
    if (!utmifyUrl) return;

    try {
        await fetch(utmifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                event: 'sale',
                source: 'checkout-api',
                utm: utmData,
                sale: paymentData
            })
        });
    } catch (error) {
        // Endpoint de Utmify é opcional; o fluxo de pagamento não deve quebrar se ele estiver indisponível.
    }
}

function getPaymentData(payload) {
    const charge = payload && payload.charge ? payload.charge : payload;

    return {
        success: true,
        transaction_id: charge && charge.id,
        pixCode: charge && charge.qr_code,
        qrCodeUrl: charge && charge.qr_code_image,
        status: charge && charge.status
    };
}

module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        response.status(405).json({ success: false, message: 'Método não permitido' });
        return;
    }

    if (!process.env.LARANJINHA_API_KEY) {
        response.status(500).json({ success: false, message: 'Credencial da API PIX não configurada' });
        return;
    }

    let input = request.body || {};
    if (typeof input === 'string') {
        try {
            input = JSON.parse(input);
        } catch (error) {
            response.status(400).json({ success: false, message: 'JSON inválido' });
            return;
        }
    }

    const amount = Number(input.amount != null ? input.amount : input.valor);
    const amountCents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || !Number.isInteger(amountCents) || amountCents < 100 || amountCents > 10000000) {
        response.status(400).json({ success: false, message: 'Valor inválido' });
        return;
    }

    const utmData = pickUtmFields(input);
    const payload = {
        amount_cents: amountCents,
        description: String(input.description || input.item_title || 'Pagamento PIX').slice(0, 500),
        payer: {
            name: String(input.name || input.nome || '').slice(0, 140),
            email: String(input.email || '').slice(0, 254),
            document: String(input.document || input.cpf || '').replace(/\D/g, '')
        },
        metadata: {
            item_title: String(input.item_title || '').slice(0, 140),
            telefone: String(input.telefone || '').slice(0, 30),
            ...utmData
        }
    };

    try {
        const laranjinhaResponse = await fetch(`${LARANJINHA_BASE_URL}/charges`, {
            method: 'POST',
            headers: laranjinhaHeaders(),
            body: JSON.stringify(payload)
        });
        const text = await laranjinhaResponse.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            data = { message: text };
        }

        if (!laranjinhaResponse.ok) {
            response.status(laranjinhaResponse.status).json({
                success: false,
                message: data.message || data.error || 'A API PIX recusou a criação do pagamento'
            });
            return;
        }

        const result = getPaymentData(data);
        if (!result.transaction_id || !result.pixCode) {
            response.status(502).json({ success: false, message: 'Resposta PIX incompleta da API' });
            return;
        }

        await sendToUtmifySale(utmData, {
            transaction_id: result.transaction_id,
            amount_cents: amountCents,
            amount: amount,
            description: String(input.description || input.item_title || 'Pagamento PIX').slice(0, 500),
            item_title: String(input.item_title || '').slice(0, 140),
            payer_document: String(input.document || input.cpf || '').replace(/\D/g, ''),
            payer_email: String(input.email || '').slice(0, 254)
        });

        response.status(200).json(result);
    } catch (error) {
        response.status(502).json({ success: false, message: 'Não foi possível conectar à API PIX' });
    }
};
