// pages/api/chat.js
import { readFileSync } from "fs";
import path from "path";
import XLSX from "xlsx";
import { Configuration, OpenAIApi } from "openai";

// Cold-start: carga y parsea el Excel con todas las hojas
const workbook = XLSX.readFile(
  path.resolve(process.cwd(), "data", "InfoConferencias.xlsx")
);
const sheetAcreditacion      = workbook.Sheets["Acreditación"];
const sheetHospedadores      = workbook.Sheets["Hospedadores"];
const sheetServidumbre       = workbook.Sheets["AcreditaciónServidumbre"];
const dataAcreditacion       = XLSX.utils.sheet_to_json(sheetAcreditacion || {});
const dataHospedadores       = XLSX.utils.sheet_to_json(sheetHospedadores || {});
const dataServidumbre        = XLSX.utils.sheet_to_json(sheetServidumbre  || {});

// Configuración OpenAI
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
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
    // Genera contexto filtrando coincidencias en cada hoja
    const text = message.toLowerCase();
    const filterRows = (rows, field) =>
      rows.filter(r => (r[field] || "").toString().toLowerCase().includes(text));

    const matchesAcred = filterRows(dataAcreditacion, "Nombre");
    const matchesHosp  = filterRows(dataHospedadores, "Nombre");
    const matchesServ  = filterRows(dataServidumbre,  "Nombre");

    let context = "";
    if (matchesAcred.length) {
      context += "Datos de Acreditación relevantes:\n";
      matchesAcred.forEach(r => {
        context += `- ${r.Nombre}: Iglesia ${r.Iglesia}, Zona ${r.Zona}, Celular ${r.Celular}\n`;
      });
    }
    if (matchesHosp.length) {
      context += "\nDatos de Hospedadores relevantes:\n";
      matchesHosp.forEach(r => {
        context += `- ${r.Nombre}: Dirección ${r.Dirección}, Contacto ${r["N° Contacto"]}\n`;
      });
    }
    if (matchesServ.length) {
      context += "\nDatos de Servidumbre relevantes:\n";
      matchesServ.forEach(r => {
        context += `- ${r.Nombre}: Sección ${r.Sección}, Iglesia ${r.Iglesia}\n`;
      });
    }
    if (!context) {
      context = "No se halló información concreta en las hojas cargadas.";
    }

    // Llamada a OpenAI con contexto
    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Eres IsaIAs, la asistente virtual del proyecto de conferencias de la Iglesia Evangélica Pentecostal de Chile. Saluda con un saludo cristiano y responde basándote en la siguiente información precargada:\n${context}
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
