// pages/api/chat.js
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sólo POST permitido" });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Falta el campo message" });
  }

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",          // o el modelo que uses
      messages: [
        {
          role: "system",
          content: `
            Eres IsaIAs, la asistente virtual del proyecto de conferencias.
            - Respondes de forma clara, breve y amable.
            - Si no sabes algo, dilo y ofrece buscarlo.
          `.trim()
        },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const reply = completion.data.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "Error interno llamando a OpenAI" });
  }
}
