// src/components/HospedadoresForm.jsx
import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";

const CLIENT_ID = "100877140149-62dkjnovin2gmlhppj5hqfupamu29r2a.apps.googleusercontent.com";
const SHEET_ID  = "1dJLyUn5ZhOCjCmxu8Ev0wocUaZaMcpKr4VMBlQlKQ8g";

export default function HospedadoresForm() {
  // --- Sesión / OAuth2 ---
  const [token, setToken]               = useState("");
  const [correoUsuario, setCorreoUsuario] = useState("");
  const tokenClientRef                 = useRef(null);

  useEffect(() => {
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email",
      callback: resp => {
        if (resp.access_token) initFromToken(resp.access_token);
        else alert("No se pudo iniciar sesión.");
      }
    });
    const t = localStorage.getItem("accessToken");
    if (t) initFromToken(t);
  }, []);

  function initFromToken(tkn) {
    setToken(tkn);
    localStorage.setItem("accessToken", tkn);
    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tkn}` }
    })
      .then(res => res.json())
      .then(data => setCorreoUsuario(data.email))
      .catch(console.error);
  }

  function iniciarSesion() {
    tokenClientRef.current.requestAccessToken();
  }

  function cerrarSesion() {
    localStorage.removeItem("accessToken");
    setToken("");
    setCorreoUsuario("");
  }

  // --- Carga de Hospedadores ---
  const [hospedadores, setHospedadores] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [filtroHospedador, setFiltroHospedador] = useState(null);
  const [filtroIglesia, setFiltroIglesia]       = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Hospedadores!A2:F`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(res => {
        if (res.status === 401) {
          alert("Sesión expirada, por favor vuelve a iniciar sesión");
          cerrarSesion();
          throw new Error("401");
        }
        return res.json();
      })
      .then(data => setHospedadores(data.values || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  // Opciones para filtros
  const opcionesNombres = Array.from(new Set(hospedadores.map(r => r[0]))).map(n => ({
    value: n, label: n
  }));
  const opcionesIglesias = Array.from(new Set(hospedadores.map(r => r[3]))).map(i => ({
    value: i, label: i
  }));

  // Filtrado en memoria
  const filasFiltradas = hospedadores.filter(f => {
    if (filtroHospedador) return f[0] === filtroHospedador.value;
    if (filtroIglesia)     return f[3] === filtroIglesia.value;
    return true;
  });

  return (
    <div className="hospedadores-section">
      {/* Cabecera */}
      <img
        src="https://i.ibb.co/d4CJ7Y94/your-logo.png"
        alt="Logo EBIP & IEP 2024 San Bernardo"
        className="form-img"
      />
      <h2 className="form-title">Listado de Hospedadores</h2>
      <p className="form-desc">Revise la información de los hospedadores...</p>

      {/* Sesión */}
      <div className="sesion-container">
        {!token ? (
          <button className="btn-google" onClick={iniciarSesion}>
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google"
            />
            Continuar con Google
          </button>
        ) : (
          <>
            <p className="mensaje-sesion activa">
              Sesión iniciada como: {correoUsuario}
            </p>
            <button
              className="form-btn cerrar-sesion-btn"
              onClick={cerrarSesion}
            >
              Cerrar sesión
            </button>
          </>
        )}
      </div>

      {/* Filtros */}
      <div className="form-selectores" style={{ marginBottom: "2rem" }}>
        <div style={{ flex: 1 }}>
          <label className="form-label">Filtrar por Nombre</label>
          <Select
            options={opcionesNombres}
            value={filtroHospedador}
            onChange={opt => {
              setFiltroHospedador(opt);
              setFiltroIglesia(null);
            }}
            isClearable
            placeholder="Seleccione un hospedador"
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999 })
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label className="form-label">Filtrar por Iglesia</label>
          <Select
            options={opcionesIglesias}
            value={filtroIglesia}
            onChange={opt => {
              setFiltroIglesia(opt);
              setFiltroHospedador(null);
            }}
            isClearable
            placeholder="Seleccione una iglesia"
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999 })
            }}
          />
        </div>
      </div>

      {/* Tabla scrollable */}
      {loading && <p>Cargando hospedadores…</p>}
      <div className="tabla-scroll">
        <table className="tabla-hospedadores">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Dirección</th>
              <th>N° Contacto</th>
              <th>Iglesia</th>
              <th>Local</th>
              <th>Pastores Asignados</th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((fila, idx) => (
              <tr key={idx}>
                {fila.map((celda, j) => {
                  if (j === 5) {
                    // Dividir la cadena en cada "n. " para salto de línea
                    const items = celda.split(/\s(?=\d+\.\s)/);
                    return (
                      <td key={j}>
                        {items.map((item, k) => (
                          <div key={k}>{item}</div>
                        ))}
                      </td>
                    );
                  }
                  return <td key={j}>{celda}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
