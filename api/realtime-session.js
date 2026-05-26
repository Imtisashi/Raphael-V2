const readRequestBody = async (req) => {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof Buffer !== 'undefined' && Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  if (req.body?.sdp) return req.body.sdp;

  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
};

const buildDoctorContext = (doctors = []) => {
  if (!Array.isArray(doctors) || !doctors.length) return 'No live doctor list was provided for this session.';
  return doctors
    .slice(0, 12)
    .map(doctor => `${doctor.name || 'Doctor'}: ${doctor.specialty || 'General Physician'} in ${doctor.district || doctor.location || 'the care network'}, next slot ${doctor.nextSlot || 'available soon'}`)
    .join('\n');
};

const parseDoctorHeader = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return [];
  }
};

const instructions = (doctors = []) => `
You are Rapha'l Assist, a warm voice assistant for a healthcare booking app in India.
Speak like a careful, friendly person: concise, natural, and calm.
Your job is to listen to symptoms, ask useful follow-up questions, identify the best specialty, and help the patient decide what to do next inside the app.

Safety:
- Do not diagnose and do not prescribe medicine.
- If the user mentions severe chest pain, trouble breathing, stroke symptoms, heavy bleeding, unconsciousness, seizure, or suicidal thoughts, tell them to seek emergency care immediately.
- For non-emergency symptoms, recommend the most relevant specialty and explain that this is guidance, not a diagnosis.
- Ask one short follow-up question at a time when details are missing.

Available care options:
${buildDoctorContext(doctors)}
`;

const getEnv = (name) => globalThis['process']?.env?.[name] || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  const apiKey = getEnv('OPENAI_API_KEY');
  if (!apiKey) {
    return res.status(501).send('OPENAI_API_KEY is not configured for live AI voice.');
  }

  try {
    const sdp = await readRequestBody(req);
    if (!sdp?.trim()) {
      return res.status(400).send('Missing WebRTC offer SDP.');
    }
    const doctors = parseDoctorHeader(req.headers['x-raphael-doctors']);

    const session = {
      type: 'realtime',
      model: getEnv('OPENAI_REALTIME_MODEL') || 'gpt-realtime',
      instructions: instructions(doctors),
      audio: {
        input: {
          transcription: {
            model: getEnv('OPENAI_TRANSCRIBE_MODEL') || 'gpt-4o-mini-transcribe',
          },
          turn_detection: {
            type: 'server_vad',
          },
        },
        output: {
          voice: getEnv('OPENAI_REALTIME_VOICE') || 'marin',
        },
      },
    };

    const form = new FormData();
    form.set('sdp', sdp);
    form.set('session', JSON.stringify(session));

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const answer = await response.text();
    if (!response.ok) {
      return res.status(response.status).send(answer || 'OpenAI Realtime session failed.');
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/sdp');
    return res.status(200).send(answer);
  } catch (error) {
    return res.status(500).send(error?.message || 'Unable to start live AI voice.');
  }
}
