// src/App.jsx
import { useState } from "react";
import AcreditacionForm from "./components/AcreditacionForm";
import HospedadoresForm from "./components/HospedadoresForm";
import AcreditacionServidumbreForm from "./components/AcreditacionServidumbreForm";
import "./acreditacion.css";
import ChatWidget from "./components/ChatWidget";          // ← Import del widget
import "./acreditacion.css";
import "./components/chatWidget.css"; 

export default function App() {
  const [vistaActual, setVistaActual] = useState("acreditacion");

  return (
    <>
      {/* Layout principal */}
      <div className="main-center">
        <div className={`form-layout ${vistaActual === "servidumbre" ? "servidumbre-mode" : ""}`}>
          
 {/* Pestañas verticales */}
          <div className="tab-vertical">
          <button
              className={vistaActual === "acreditacion" ? "tab-btn activo" : "tab-btn"}
              onClick={() => setVistaActual("acreditacion")}
           >
            Acreditación Pastoral
            </button>
            <button
              className={vistaActual === "hospedadores" ? "tab-btn activo" : "tab-btn"}
             onClick={() => setVistaActual("hospedadores")}
        >
              Hospedadores
            </button>
            <button
              className={vistaActual === "servidumbre" ? "tab-btn activo" : "tab-btn"}
             onClick={() => setVistaActual("servidumbre")}
           >
           Acreditación Servidumbre
           </button>
       </div>

          {/* Contenedor de formularios */}
          <div className="form-content">
            {vistaActual === "acreditacion" && <AcreditacionForm />}
            {vistaActual === "hospedadores" && <HospedadoresForm />}
            {vistaActual === "servidumbre" && <AcreditacionServidumbreForm />}
          </div>
        </div>
      </div>

      {/* Chat IsaIAs, fijo en esquina inferior derecha 
      <div className="chat-widget-container">
        <ChatWidget />
      </div>*/}
    </>
  );
}
