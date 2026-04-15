const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default;

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Cargar diccionario completo
const DICCIONARIO = fs.readFileSync(path.join(__dirname, 'diccionario.txt'), 'utf8');

// RAG simple: buscar entradas relevantes por palabra clave
function buscarEnDiccionario(consulta) {
  const palabras = consulta.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 3);

  const lineas = DICCIONARIO.split('\n');
  const resultados = new Set();
  let buffer = [];

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    buffer.push(linea);
    if (buffer.length > 12) buffer.shift();

    const lineaNorm = linea.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const palabra of palabras) {
      if (lineaNorm.includes(palabra)) {
        const contexto = buffer.slice(-4).join('\n') +
          '\n' + lineas.slice(i + 1, i + 8).join('\n');
        resultados.add(contexto.trim());
        break;
      }
    }
  }

  return [...resultados].slice(0, 8).join('\n\n---\n\n');
}

const SYSTEM_BASE = `Eres un asistente de aprendizaje de la lengua Kawésqar, basado en el Diccionario Conciso Español-Kawésqar de Oscar E. Aguilera F. y José S. Tonko P. (CONADI, 2005), compilado directamente con hablantes competentes.

Tu rol es ayudar a aprender el Kawésqar de forma accesible y respetuosa. Responde siempre en español incluyendo las palabras Kawésqar en cursiva con asteriscos (*palabra*).

IMPORTANTE: Usa SOLO la información del diccionario que se te provee. Si la palabra no aparece en los extractos, indícalo claramente. Nunca inventes términos Kawésqar. Esta es una lengua en peligro crítico con menos de 10 hablantes vivos — la precisión es un acto de respeto cultural.

Responde de forma concisa (máximo 4 oraciones), educativa y con calidez cultural. Menciona que la fuente es el diccionario de Aguilera y Tonko (CONADI, 2005).`;

app.post('/api/kawesqar', async (req, res) => {
  const { mensaje } = req.body;
  if (!mensaje) return res.status(400).json({ error: 'Mensaje requerido' });

  try {
    const extractos = buscarEnDiccionario(mensaje);
    const systemPrompt = SYSTEM_BASE + (extractos
      ? `\n\nEXTRACTOS RELEVANTES DEL DICCIONARIO:\n${extractos}`
      : '\n\nNo se encontraron entradas relevantes en el diccionario para esta consulta.');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: mensaje }]
    });

    const texto = response.content[0].text;
    res.json({ reply: texto });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Kawésqar corriendo en http://localhost:${PORT}`));
