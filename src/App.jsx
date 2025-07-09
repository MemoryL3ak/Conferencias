// src/App.jsx
import { useState } from "react";
import AcreditacionForm from "./components/AcreditacionForm";
import HospedadoresForm from "./components/HospedadoresForm";
import "./acreditacion.css";

export default function App() {
  const [vistaActual, setVistaActual] = useState("acreditacion");

  return (
    <div className="main-center">
      <div className="form-layout">
        {/* Pestañas verticales */}
        <div className="tab-vertical">
          <button
            className={vistaActual === "acreditacion" ? "tab-btn activo" : "tab-btn"}
            onClick={() => setVistaActual("acreditacion")}
          >
            Acreditación
          </button>
          <button
            className={vistaActual === "hospedadores" ? "tab-btn activo" : "tab-btn"}
            onClick={() => setVistaActual("hospedadores")}
          >
            Hospedadores
          </button>
        </div>

        {/* Contenedor de formularios */}
        <div className="form-content">
          {vistaActual === "acreditacion" && <AcreditacionForm />}
          {vistaActual === "hospedadores" && <HospedadoresForm />}
        </div>
      </div>
    </div>
  );
}
