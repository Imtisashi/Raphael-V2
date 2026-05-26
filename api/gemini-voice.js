const emergencyTerms = [
  'severe chest pain',
  'trouble breathing',
  'cannot breathe',
  'fainting',
  'stroke',
  'seizure',
  'heavy bleeding',
  'unconscious',
  'suicidal',
];

const getEnv = (name) => globalThis['process']?.env?.[name] || '';

const parseJsonText = (text) => {
  if (!text) return null;
  const cleaned = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const fallbackGuidance = (transcript = '') => {
  const query = String(transcript || '').toLowerCase();
  if (emergencyTerms.some(term => query.includes(term))) {
    return {
      transcript,
      response: 'This could be urgent. Please contact local emergency services or go to the nearest emergency department now.',
      specialty: 'Emergency Care',
      shouldSearch: false,
      searchQuery: '',
      provider: 'gemini',
    };
  }

  return {
    transcript,
    response: transcript
      ? 'I heard you. I need one more detail to guide you well: how long has this been happening, and is it mild, moderate, or severe?'
      : 'I could not confidently transcribe that audio. Please try again with the phone close to you, or type the symptom.',
    specialty: null,
    shouldSearch: false,
    searchQuery: '',
    provider: 'gemini',
  };
};

const promptForVoice = ({ doctors }) => `
You are Rapha'l Assist, a warm healthcare voice assistant for a booking app in India.
Listen to the attached audio and return only valid JSON:
{
  "transcript": "exact short transcript of the user's speech",
  "response": "natural spoken response, friendly and concise",
  "specialty": "General Physician, Cardiologist, Neurologist, Dermatologist, Orthopedic, Ophthalmologist, Emergency Care, or null",
  "shouldSearch": true or false,
  "searchQuery": "specialty or useful search phrase"
}

Rules:
- Do not diagnose.
- Do not prescribe medicine.
- If the audio suggests severe chest pain, trouble breathing, stroke symptoms, heavy bleeding, unconsciousness, seizure, or suicidal thoughts, urge emergency care immediately.
- Otherwise ask one useful follow-up question or route to the best specialty.
- Speak like a calm person, not a form.

Available doctors:
${JSON.stringify(doctors || [])}
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = getEnv('GEMINI_API_KEY');
  if (!apiKey) {
    return res.status(501).json({ error: 'GEMINI_API_KEY is not configured for Gemini voice.' });
  }

  const audioBase64 = req.body?.audioBase64;
  const mimeType = req.body?.mimeType || 'audio/webm';
  const doctors = Array.isArray(req.body?.doctors) ? req.body.doctors : [];

  if (!audioBase64) {
    return res.status(400).json({ error: 'Missing audio data.' });
  }

  try {
    const model = getEnv('GEMINI_VOICE_MODEL') || getEnv('GEMINI_MODEL') || 'gemini-2.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: promptForVoice({ doctors }) },
            {
              inline_data: {
                mime_type: mimeType,
                data: audioBase64,
              },
            },
          ],
        }],
        generationConfig: {
          response_mime_type: 'application/json',
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini voice request failed.' });
    }

    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text).filter(Boolean).join('\n');
    const parsed = parseJsonText(text);
    if (!parsed?.response) {
      return res.status(200).json(fallbackGuidance(parsed?.transcript || ''));
    }

    return res.status(200).json({
      transcript: parsed.transcript || '',
      response: parsed.response,
      specialty: parsed.specialty || null,
      shouldSearch: Boolean(parsed.shouldSearch),
      searchQuery: parsed.searchQuery || parsed.specialty || '',
      provider: 'gemini',
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Unable to process Gemini voice.' });
  }
}
