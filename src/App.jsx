// src/App.jsx
import { useState } from "react";
import AcreditacionForm from "./components/AcreditacionForm";
import HospedadoresForm from "./components/HospedadoresForm";
import AcreditacionServidumbreForm from "./components/AcreditacionServidumbreForm";

import "./acreditacion.css";

export default function App() {
  const [vistaActual, setVistaActual] = useState("acreditacion");

  return (
    <div className="main-center">
      {/* Añadimos 'servidumbre-mode' solo en esa vista */}
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

      {/* Logo inferior fuera del cuadro blanco */}
      <img
        src="https://i.ibb.co/3yNB4h8K/logo-CEIP-2025-04.png"
        alt="Logo inferior"
        className="footer-logo"
      />
    </div>
  );
}
