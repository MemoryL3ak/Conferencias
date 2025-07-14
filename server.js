// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import XLSX from "xlsx";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 1) Cold-start: carga y parseo del Excel
const excelPath = path.resolve(process.cwd(), "data", "InfoConferencias.xlsx");
console.log("Leyendo Excel en:", excelPath);
let workbook;
try {
  workbook = XLSX.readFile(excelPath);
  console.log("Hojas disponibles:", workbook.SheetNames);
} catch (err) {
  console.error("No se pudo leer el Excel:", err.message);
  process.exit(1);
}
const sheetAcred = workbook.Sheets["Acreditación"];
const sheetHosp  = workbook.Sheets["Hospedadores"];
const sheetServ  = workbook.Sheets["AcreditaciónServidumbre"];
const dataAcred  = XLSX.utils.sheet_to_json(sheetAcred  || {});
const dataHosp   = XLSX.utils.sheet_to_json(sheetHosp   || {});
const dataServ   = XLSX.utils.sheet_to_json(sheetServ   || {});
console.log(`Filas en Acreditación: ${dataAcred.length}`);
console.log(`Filas en Hospedadores: ${dataHosp.length}`);
console.log(`Filas en Servidumbre: ${dataServ.length}`);

// 2) Configuración de OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper: filtra rows por múltiples campos
function filterRows(rows, keys, text) {
  return rows.filter(r =>
    keys.some(k => (r[k] || "").toString().toLowerCase().includes(text))
  );
}

app.post("/api/chat", async (req, res) => {
  console.log("[Chat API] Body recibido:", req.body);
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Falta el campo message" });

  const text = message.toLowerCase();

  // 3) Filtrado específico: busca coincidencias en Nombre o Iglesia
  const acredMatches = filterRows(dataAcred, ["Nombre", "Iglesia"], text);
  const hospMatches  = filterRows(dataHosp,  ["Nombre", "Iglesia"], text);
  const servMatches  = filterRows(dataServ,  ["Nombre", "Iglesia"], text);
  console.log("Matches Acreditación:", acredMatches.length, "Hospedadores:", hospMatches.length, "Servidumbre:", servMatches.length);

  // 4) Construcción de contexto
  let context = "";
  if (acredMatches.length || hospMatches.length || servMatches.length) {
    if (acredMatches.length) {
      context += "Datos de Acreditación:\n";
      acredMatches.forEach(r => {
        context += `- ${r.Nombre}: Iglesia ${r.Iglesia}, Zona ${r.Zona}, Celular ${r.Celular}\n`;
      });
    }
    if (hospMatches.length) {
      context += "\nDatos de Hospedadores:\n";
      hospMatches.forEach(r => {
        context += `- ${r.Nombre}: Dirección ${r.Dirección}, Contacto ${r["N° Contacto"]}\n`;
      });
    }
    if (servMatches.length) {
      context += "\nDatos de Servidumbre:\n";
      servMatches.forEach(r => {
        context += `- ${r.Nombre}: Sección ${r.Sección}, Iglesia ${r.Iglesia}\n`;
      });
    }
  } else if (text.includes("pastor")) {
    // Resumen genérico de pastores
    const nombresPastores = dataAcred.map(r => r.Nombre).slice(0, 5);
    context = `Hay ${dataAcred.length} pastores registrados. Algunos ejemplos: ${nombresPastores.join(", ")}`;
  } else {
    context = "No se encontró información relevante.";
  }

  // 5) Llamada a OpenAI
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres IsaIAs, asistente virtual del proyecto de conferencias de la Iglesia Evangélica Pentecostal de Chile. Responde con saludo cristiano y utiliza la siguiente información precargada:\n${context}`
        },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const reply = response.choices[0].message.content;
    console.log("[Chat API] Respuesta IA:", reply);
    res.json({ reply });
  } catch (err) {
    console.error("[Chat API] ERROR al llamar a OpenAI:", err);
    res.status(500).json({ error: "Error interno", details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));
