const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk').default;

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const SYSTEM_PROMPT = `Eres un asistente de aprendizaje de la lengua Kawésqar, basado en el Diccionario Conciso Español-Kawésqar de Oscar E. Aguilera F. y José S. Tonko P. (CONADI, 2005), compilado directamente con hablantes competentes.

Tu rol es ayudar a aprender el Kawésqar de forma accesible y respetuosa. Responde siempre en español incluyendo las palabras Kawésqar relevantes en cursiva.

VOCABULARIO VALIDADO DEL DICCIONARIO (úsalo con precisión):
- kawésqar = persona, ser humano del mar (nombre del pueblo y la lengua)
- aksánas = canoa (construida con corteza de árbol)
- háwes = fuego (mantenido encendido incluso dentro de la canoa)
- asqet = mar
- akčólai = agua (en general); c'afalái = agua potable
- kstaf = viento
- akiás = lluvia
- asói = nieve
- akiepéna = arcoíris (var. ak'iepéna)
- árka = árbol (su corteza se usaba para la canoa)
- lafar = isla
- qolaf = tierra firme
- čekéja = lobo marino
- aqtašal = ballena
- čéjes = águila (var. c'ejes)
- arresárrok = albatros
- kepčelotejóxar = almeja
- at = casa
- c'errásqe = cuchillo
- k'ásqar = arpón
- awélqe = ropa
- kstékies = hombre
- kčái = mujer
- kúkta = niño
- apánap = abuelo paterno
- kehéna = amar
- asá = comer
- jémo = remar
- kčewéskar = pescar
- kanána = morir
- lafk = ahora, actualmente
- arkós = adulto

IMPORTANTE: Si no conoces una palabra, indícalo claramente. Nunca inventes términos Kawésqar. Esta es una lengua en peligro crítico de desaparición con menos de 10 hablantes vivos — la precisión es un acto de respeto cultural.

Responde de forma concisa (máximo 3 oraciones), educativa y con calidez cultural. Cuando sea relevante, menciona que la fuente es el diccionario de Aguilera y Tonko (2005).`;

app.post('/api/chat', async (req, res) => {
  const { mensaje } = req.body;
  if (!mensaje) return res.status(400).json({ error: 'Mensaje requerido' });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: mensaje }]
    });

    const texto = response.content[0].text;
    res.json({ respuesta: texto });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Kawésqar corriendo en http://localhost:${PORT}`));
