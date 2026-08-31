const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

export default {
  async fetch(request, env, ctx) {
    console.log('RESEND_API_KEY exists:', !!env.RESEND_API_KEY);
    console.log('RESEND_API_KEY length:', env.RESEND_API_KEY ? env.RESEND_API_KEY.length : 0);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    try {
      const data = await request.json();
      console.log('Form data received:', data.name, data.email, data.type);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c48b3f;">Nouvelle candidature R-Holding</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Type</td><td style="padding: 8px 0;">${data.type || 'Non spécifié'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Nom</td><td style="padding: 8px 0;">${data.name || '-'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Email</td><td style="padding: 8px 0;">${data.email || '-'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Téléphone</td><td style="padding: 8px 0;">${data.phone || '-'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Ville</td><td style="padding: 8px 0;">${data.city || '-'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Message</td><td style="padding: 8px 0;">${data.message || '-'}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;">
          <p style="font-size: 12px; color: #999;">Envoyé depuis le site r-holding.ml</p>
        </div>
      `;

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'R-Holding <contact@r-holding.ml>',
          to: ['intersidibe2@gmail.com'],
          subject: data.subject || 'Nouvelle candidature R-Holding',
          html: html,
          reply_to: data.email || undefined,
        }),
      });

      const result = await resendResponse.json();
      console.log('Resend status:', resendResponse.status);
      console.log('Resend result:', JSON.stringify(result));

      if (resendResponse.ok) {
        return new Response(JSON.stringify({ success: true, message: 'Message envoyé avec succès.' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } else {
        return new Response(JSON.stringify({ success: false, message: result.message || 'Erreur Resend' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    } catch (err) {
      console.log('Catch error:', err.message);
      return new Response(JSON.stringify({ success: false, message: err.message || 'Erreur serveur' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  },
};
