const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export default {
  async fetch(request, env, ctx) {
    console.log('RESEND_API_KEY exists:', !!env.RESEND_API_KEY);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return jsonResponse(405, { success: false, message: 'Method not allowed' });
    }

    try {
      let data;
      try {
        data = await request.json();
      } catch {
        return jsonResponse(400, { success: false, message: 'Requête invalide.' });
      }

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return jsonResponse(400, { success: false, message: 'Requête invalide.' });
      }

      // Honeypot : un champ caché que seuls les robots remplissent -> rejet silencieux.
      if (data.website || data._honey) {
        console.log('Honeypot triggered, ignoring.');
        return jsonResponse(200, { success: true, message: 'Message envoyé avec succès.' });
      }

      const name = String(data.name || '').trim();
      const email = String(data.email || '').trim();
      const phone = String(data.phone || '').trim();
      const city = String(data.city || '').trim();
      const type = String(data.type || '').trim();
      const message = String(data.message || '').trim();

      // Anti-bot : rejeter les soumissions vides ou incomplètes.
      if (!name || !email || !message) {
        console.log('Rejected: missing required fields.');
        return jsonResponse(400, { success: false, message: 'Champs obligatoires manquants.' });
      }

      if (!isValidEmail(email)) {
        return jsonResponse(400, { success: false, message: 'Adresse email invalide.' });
      }

      if (name.length > 200 || email.length > 200 || message.length > 5000) {
        return jsonResponse(400, { success: false, message: 'Contenu trop long.' });
      }

      if (message.length < 5) {
        console.log('Rejected: message too short.');
        return jsonResponse(400, { success: false, message: 'Message trop court.' });
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c48b3f;">Nouvelle candidature R-Holding</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Type</td><td style="padding: 8px 0;">${escapeHtml(type) || 'Non spécifié'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Nom</td><td style="padding: 8px 0;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Email</td><td style="padding: 8px 0;">${escapeHtml(email)}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Téléphone</td><td style="padding: 8px 0;">${escapeHtml(phone) || '-'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Ville</td><td style="padding: 8px 0;">${escapeHtml(city) || '-'}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Message</td><td style="padding: 8px 0;">${escapeHtml(message).replace(/\n/g, '<br>')}</td></tr>
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
          from: 'R-Holding <info@r-holding.ml>',
          to: ['intersidibe2@gmail.com'],
          subject: type ? `Candidature R-Holding — ${type}` : 'Nouvelle candidature R-Holding',
          html: html,
          reply_to: email,
        }),
      });

      const result = await resendResponse.json();
      console.log('Resend status:', resendResponse.status);

      if (resendResponse.ok) {
        return jsonResponse(200, { success: true, message: 'Message envoyé avec succès.' });
      }
      return jsonResponse(502, { success: false, message: result.message || 'Erreur Resend' });
    } catch (err) {
      console.log('Catch error:', err.message);
      return jsonResponse(500, { success: false, message: err.message || 'Erreur serveur' });
    }
  },
};
