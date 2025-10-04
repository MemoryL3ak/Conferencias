// src/components/AcreditacionServidumbreForm.jsx
import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";

const CLIENT_ID = "100877140149-62dkjnovin2gmlhppj5hqfupamu29r2a.apps.googleusercontent.com";
const SHEET_ID  = "1dJLyUn5ZhOCjCmxu8Ev0wocUaZaMcpKr4VMBlQlKQ8g";

export default function AcreditacionServidumbreForm() {
  const [token, setToken]               = useState("");
  const [correoUsuario, setCorreoUsuario] = useState("");
  const [filas, setFilas]               = useState([]);
  const [editedRows, setEditedRows]     = useState({});
  const [filtroNombre, setFiltroNombre] = useState(null);
  const [filtroSeccion, setFiltroSeccion] = useState(null);
  const [filtroIglesia, setFiltroIglesia] = useState(null);
  // ── NUEVO: estado para mostrar aviso de inicio de sesión
  const [mostrarAvisoLogin, setMostrarAvisoLogin] = useState(false);

  const tokenClientRef = useRef(null);
  const scrollRef = useRef(null);

  // Inicializa OAuth2
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

  // Carga la data tras obtener token
  useEffect(() => { if (token) cargarFilas(); }, [token]);
  // Resetea scroll al actualizar filas
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollLeft = 0; }, [filas]);

  function initFromToken(tkn) {
    setToken(tkn);
    localStorage.setItem("accessToken", tkn);
    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tkn}` }
    })
      .then(r => r.json())
      .then(d => setCorreoUsuario(d.email));
  }

  function fetchConAuth(url, opts = {}) {
    return fetch(url, {
      ...opts,
      headers: { ...(opts.headers||{}), Authorization: `Bearer ${token}` }
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

  function updateSheet(range, value) {
    fetchConAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/AcreditaciónServidumbre!${range}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [[ value ]] })
      }
    ).catch(console.error);
  }

  function cargarFilas() {
    fetchConAuth(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/AcreditaciónServidumbre!A2:Z`)
      .then(r => r.json())
      .then(d => {
        const rows = d.values || [];
        setFilas(rows);
        // Layout actual (0-based):
        // 0 Nombre, 2 Sección, 3 Iglesia, 4 Mesa/Turno
        // 5 ¿Se Acredita? (F) | 6 ¿Se entrega credencial? (G) | 7 Patente (H)
        // 8 Observaciones (I) | 9 Fecha (J, OCULTA) | 10 Correo acreditador (K)
        const initial = {};
        rows.forEach((row, i) => {
          initial[i] = {
            acredita:          row[5]  || "No",
            entregaCredencial: row[6]  || "No",
            patente:           row[7]  || "",
            observaciones:     row[8]  || "",
            fecha:             row[9]  || "",
            correoAcreditador: row[10] || ""
          };
        });
        setEditedRows(initial);
      });
  }

  // Cabeceras (sin mostrar la Fecha/Hora oculta)
  const headers = [
    "Nombre","Sección","Iglesia","Mesa/Turno",
    "¿Se Acredita?","¿Se entrega credencial?","Patente","Observaciones"
  ];

  // Aplica filtros
  const rowsWithIndex = filas.map((row, idx) => ({ row, idx }));
  const filasFiltradas = rowsWithIndex.filter(({ row }) => {
    if (filtroNombre)  return row[0] === filtroNombre.value;
    if (filtroSeccion) return row[2] === filtroSeccion.value;
    if (filtroIglesia) return row[3] === filtroIglesia.value;
    return true;
  });

  return (
    <div className="acreditacion-servidumbre-section">
      {/* Logo, título, descripción */}
      <img
        src="https://i.ibb.co/Y49Gn8wW/logo-CEIP-2025-07.png" 
        alt="Logo Servidumbre"
        className="form-img"
      />
      <h2 className="form-title">Acreditación Servidumbre</h2>
      <p className="form-desc">Complete o actualice la información de servidumbre.</p>

      {/* Sesión */}
      <div className="sesion-container">
        {!token ? (
          <button className="btn-google" onClick={() => tokenClientRef.current.requestAccessToken()}>
            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
            Continuar con Google
          </button>
        ) : (
          <>
            <p className="mensaje-sesion activa">Sesión iniciada como: {correoUsuario}</p>
            <button
              className="form-btn cerrar-sesion-btn"
              onClick={() => { localStorage.removeItem("accessToken"); setToken(""); setCorreoUsuario(""); }}
            >
              Cerrar sesión
            </button>
          </>
        )}
      </div>

      {/* Mensaje de aviso si intenta editar sin sesión */}
      {mostrarAvisoLogin && !token && (
        <p className="mensaje-sesion inactiva">
          ⚠️ Debe iniciar sesión para realizar esta acción.
        </p>
      )}

      {/* Filtros con portal para evitar solapamiento */}
      <div className="form-selectores">
        {[
          { label: "Nombre",    state: filtroNombre,   setState: setFiltroNombre,  opts: [...new Set(filas.map(f=>f[0]))]   },
          { label: "Sección",   state: filtroSeccion,  setState: setFiltroSeccion, opts: [...new Set(filas.map(f=>f[2]))]   },
          { label: "Iglesia",   state: filtroIglesia,  setState: setFiltroIglesia, opts: [...new Set(filas.map(f=>f[3]))]   }
        ].map((f, i) => (
          <div key={i} style={{ flex: 1 }}>
            <label className="form-label">{f.label}</label>
            <Select
              options={f.opts.map(v => ({ value: v, label: v }))}
              value={f.state}
              onChange={opt => {
                f.setState(opt);
                if (f.label === "Nombre")  setFiltroSeccion(null), setFiltroIglesia(null);
                if (f.label === "Sección") setFiltroNombre(null), setFiltroIglesia(null);
                if (f.label === "Iglesia") setFiltroNombre(null), setFiltroSeccion(null);
              }}
              placeholder={`Filtrar por ${f.label.toLowerCase()}`}
              isClearable
              classNamePrefix="react-select"
              menuPortalTarget={document.body}
              menuPosition="fixed"
              styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
            />
          </div>
        ))}
      </div>

      {/* Tabla con scroll interno */}
      <div className="tabla-scroll" ref={scrollRef}>
        <table className="tabla-hospedadores">
          <thead>
            <tr>
              {headers.map((t, i) => <th key={i}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map(({ row, idx }) => {
              const { acredita, entregaCredencial, patente, fecha, observaciones } = editedRows[idx] || {};
              const filaNum = idx + 2;
              return (
                <tr key={idx}>
                  <td>{row[0]||""}</td>
                  <td>{row[2]||""}</td>
                  <td>{row[3]||""}</td>
  <td style={{ textAlign: "center" }}>{row[4]||""}</td>

                  {/* ¿Se Acredita? (F) */}
                  <td>
                    <select
                      className="form-select"
                      value={acredita}
                      onChange={e => {
                        // ── Bloqueo y aviso si no hay sesión
                        if (!token) {
                          setMostrarAvisoLogin(true);
                          setTimeout(() => setMostrarAvisoLogin(false), 3000);
                          return;
                        }
                        const val = e.target.value;
                        const newFecha = val === "Si" ? new Date().toLocaleString() : "";
                        setEditedRows(prev => ({
                          ...prev,
                          [idx]: { 
                            ...prev[idx],
                            acredita: val, 
                            fecha: newFecha 
                          }
                        }));
                        // F: ¿Se Acredita?
                        updateSheet(`F${filaNum}:F${filaNum}`, val);
                        // J: Fecha/Hora (OCULTA ahora en columna 10)
                        updateSheet(`J${filaNum}:J${filaNum}`, newFecha);
                        // K: Correo acreditador (guarda al poner "Si", limpia al poner "No")
                        updateSheet(`K${filaNum}:K${filaNum}`, val === "Si" ? correoUsuario : "");
                      }}
                    >
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                  </td>

                  {/* ¿Se entrega credencial? (G) */}
                  <td>
                    <select
                      className="form-select"
                      value={entregaCredencial}
                      onChange={e => {
                        if (!token) {
                          setMostrarAvisoLogin(true);
                          setTimeout(() => setMostrarAvisoLogin(false), 3000);
                          return;
                        }
                        const val = e.target.value;
                        setEditedRows(prev => ({
                          ...prev,
                          [idx]: { 
                            ...prev[idx],
                            entregaCredencial: val
                          }
                        }));
                        // G: ¿Se entrega credencial?
                        updateSheet(`G${filaNum}:G${filaNum}`, val);
                      }}
                    >
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                  </td>

                  {/* Patente (H) */}
                  <td>
                    <input
                      className="form-input"
                      value={patente || ""}
                      style={{ width: "80px" }}
                      onChange={e => {
                        if (!token) {
                          setMostrarAvisoLogin(true);
                          setTimeout(() => setMostrarAvisoLogin(false), 3000);
                          return;
                        }
                        const val = e.target.value;
                        setEditedRows(prev => ({
                          ...prev,
                          [idx]: { 
                            ...prev[idx],
                            patente: val
                          }
                        }));
                        // H: Patente
                        updateSheet(`H${filaNum}:H${filaNum}`, val);
                      }}
                    />
                  </td>

                  {/* Observaciones (I) */}
                  <td>
                    <input
                      className="form-input"
                      value={observaciones || ""}
                      onChange={e => {
                        if (!token) {
                          setMostrarAvisoLogin(true);
                          setTimeout(() => setMostrarAvisoLogin(false), 3000);
                          return;
                        }
                        const val = e.target.value;
                        setEditedRows(prev => ({
                          ...prev,
                          [idx]: { 
                            ...prev[idx],
                            observaciones: val 
                          }
                        }));
                        // I: Observaciones (columna 9)
                        updateSheet(`I${filaNum}:I${filaNum}`, val);
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
