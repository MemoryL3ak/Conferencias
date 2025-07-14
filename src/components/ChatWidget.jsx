// src/components/ChatWidget.jsx
import React, { useState, useRef, useEffect } from "react";
import "./chatWidget.css";

export default function ChatWidget() {
  // 1️⃣ Estados y ref
  const [messages, setMessages] = useState([]);   // aquí van los mensajes
  const [input, setInput] = useState("");         // texto del input
  const endRef = useRef(null);                    // para hacer scroll automático

  // 2️⃣ Auto‐scroll cada vez que cambian los mensajes
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3️⃣ Lógica para enviar un mensaje
  async function sendMessage() {
    if (!input.trim()) return;
    const userMsg = { from: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { reply } = await res.json();
      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      // opcional: setMessages(prev => [...prev, { from: "bot", text: "Lo siento, ha ocurrido un error." }]);
    }
  }

  return (
    <div className="chat-widget">
      {/* 1. Área de mensajes */}
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-message ${m.from}`}>
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* 2. Zona de input */}
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Escribe un mensaje…"
        />
        <button onClick={sendMessage}>Enviar</button>
      </div>
    </div>
  );
}
