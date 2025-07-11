// src/components/AcreditacionServidumbreForm.jsx
import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";

const CLIENT_ID = "100877140149-62dkjnovin2gmlhppj5hqfupamu29r2a.apps.googleusercontent.com";
const SHEET_ID  = "1dJLyUn5ZhOCjCmxu8Ev0wocUaZaMcpKr4VMBlQlKQ8g";

export default function AcreditacionServidumbreForm() {
  const [token, setToken] = useState("");
  const [correoUsuario, setCorreoUsuario] = useState("");
  const [filas, setFilas] = useState([]);
  const [filtroNombre, setFiltroNombre] = useState(null);
  const [filtroSeccion, setFiltroSeccion] = useState(null);
  const [filtroIglesia, setFiltroIglesia] = useState(null);

  const tokenClientRef = useRef(null);
  const scrollRef     = useRef(null);

  // Inicializar OAuth
  useEffect(() => {
    const saved = localStorage.getItem("accessToken");
    if (saved) initFromToken(saved);

    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email",
      callback: resp => {
        if (resp.access_token) initFromToken(resp.access_token);
        else alert("No se pudo iniciar sesión.");
      }
    });
  }, []);

  // Al obtener token, cargar datos
  useEffect(() => {
    if (token) cargarFilas();
  }, [token]);

  // Cada vez que cambian las filas, resetear scroll horizontal
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [filas]);

  function initFromToken(tkn) {
    setToken(tkn);
    localStorage.setItem("accessToken", tkn);
    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tkn}` }
    })
      .then(r => r.json())
      .then(d => setCorreoUsuario(d.email));
  }

  function cargarFilas() {
    const range = "AcreditaciónServidumbre!A2:Z";
    fetchConAuth(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`)
      .then(r => r.json())
      .then(d => setFilas(d.values || []));
  }

  function fetchConAuth(url, opts = {}) {
    return fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` }
    }).then(res => {
      if (res.status === 401) {
        alert("Sesión expirada");
        localStorage.removeItem("accessToken");
        setToken("");
        throw new Error("401");
      }
      return res;
    });
  }

  // Encabezados e índices de las columnas
  const headers = [
    "Nombre",
    "Sección",
    "Iglesia",
    "N° Contacto",
    "¿Se Acredita?",
    "¿Se Entrega Credencial?",
    "Fecha Acreditación",
    "Observaciones"
  ];
  const indices = [0, 2, 3, 4, 5, 6, 7, 8];

  // Filtrado en memoria
  const filasFiltradas = filas.filter(f => {
    if (filtroNombre)  return f[0] === filtroNombre.value;
    if (filtroSeccion) return f[2] === filtroSeccion.value;
    if (filtroIglesia)  return f[3] === filtroIglesia.value;
    return true;
  });

  return (
    <div className="acreditacion-servidumbre-section">
      {/* Logo y título */}
      <img
        src="https://i.ibb.co/TqRmH5F8/logo-CEIP-2025-08.png"
        alt="Logo EBIP & IEP 2024 San Bernardo"
        className="form-img"
      />
      <h2 className="form-title">Acreditación Servidumbre</h2>
      <p className="form-desc">Complete o actualice la información de servidumbre.</p>

      {/* Sesión */}
      <div className="sesion-container">
        {!token ? (
          <button
            className="btn-google"
            onClick={() => tokenClientRef.current.requestAccessToken()}
          >
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google"
            />
            Continuar con Google
          </button>
        ) : (
          <>
            <p className="mensaje-sesion activa">Sesión iniciada como: {correoUsuario}</p>
            <button
              className="form-btn cerrar-sesion-btn"
              onClick={() => {
                localStorage.removeItem("accessToken");
                setToken("");
                setCorreoUsuario("");
              }}
            >
              Cerrar sesión
            </button>
          </>
        )}
      </div>

      {/* Filtros */}
      <div className="form-selectores">
        <div style={{ flex: 1 }}>
          <label className="form-label">Nombre</label>
          <Select
            options={[...new Set(filas.map(f => f[0]))].map(n => ({ value: n, label: n }))}
            value={filtroNombre}
            onChange={opt => { setFiltroNombre(opt); setFiltroSeccion(null); setFiltroIglesia(null); }}
            isClearable
            placeholder="Filtrar por nombre"
            classNamePrefix="react-select"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label">Sección</label>
          <Select
            options={[...new Set(filas.map(f => f[2]))].map(s => ({ value: s, label: s }))}
            value={filtroSeccion}
            onChange={opt => { setFiltroSeccion(opt); setFiltroNombre(null); setFiltroIglesia(null); }}
            isClearable
            placeholder="Filtrar por sección"
            classNamePrefix="react-select"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label">Iglesia</label>
          <Select
            options={[...new Set(filas.map(f => f[3]))].map(i => ({ value: i, label: i }))}
            value={filtroIglesia}
            onChange={opt => { setFiltroIglesia(opt); setFiltroNombre(null); setFiltroSeccion(null); }}
            isClearable
            placeholder="Filtrar por iglesia"
            classNamePrefix="react-select"
          />
        </div>
      </div>

      {/* Tabla scrollable */}
      <div className="tabla-scroll" ref={scrollRef}>
        <table className="tabla-hospedadores">
          <thead>
            <tr>
              {headers.map((titulo, i) => (
                <th key={i}>{titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((fila, idx) => (
              <tr key={idx}>
                {indices.map((col, j) => (
                  <td key={j}>{fila[col] || ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
