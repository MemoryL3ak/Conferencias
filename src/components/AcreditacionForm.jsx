// src/components/AcreditacionForm.jsx
import { useEffect, useState, useRef } from "react";
import Select from "react-select";

const CLIENT_ID =
  "100877140149-62dkjnovin2gmlhppj5hqfupamu29r2a.apps.googleusercontent.com";
const SHEET_ID = "1dJLyUn5ZhOCjCmxu8Ev0wocUaZaMcpKr4VMBlQlKQ8g";

export default function AcreditacionForm() {
  const [correoUsuario, setCorreoUsuario] = useState("");
  const [token, setToken] = useState("");
  const [nombres, setNombres] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [datos, setDatos] = useState([]);

  // Estado de campos (según nuevas columnas A:X)
  const [campos, setCampos] = useState({
    // Logística H:M (7..12)
    patente: "",
    vieneConEsposa: "No",
    nombreEsposa: "",
    vieneConAcompanante: "No",
    nombreAcompanante: "",
    mesa: "",

    // Acreditación R:W (17..22)
    acreditadoPastor: "No",
    acreditadoEsposa: "No",
    acreditadoAcompanante: "No",
    llegada: "",
    observaciones: "",
  });

  const [fotoUrl, setFotoUrl] = useState(""); // X (23) URL Foto
  const [mostrarAvisoLogin, setMostrarAvisoLogin] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);
  const [iglesias, setIglesias] = useState([]);
  const [iglesiaSeleccionada, setIglesiaSeleccionada] = useState(null);
  const tokenClientRef = useRef(null);

  // OAuth init
  useEffect(() => {
    const saved = localStorage.getItem("accessToken");
    if (saved) initFromToken(saved);
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/drive.readonly"
      ].join(" "),
      callback: resp => {
        if (resp.access_token) initFromToken(resp.access_token);
        else alert("No se pudo iniciar sesión");
      }
    });
  }, []);

  function initFromToken(tkn) {
    setToken(tkn);
    localStorage.setItem("accessToken", tkn);
    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tkn}` }
    })
      .then(r => r.json())
      .then(d => setCorreoUsuario(d.email))
      .catch(() => {});
  }

  function fetchConAuth(url, opts = {}) {
    return fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` }
    }).then(res => {
      if (res.status === 401) {
        cerrarSesion();
        throw new Error("Sesión expirada");
      }
      return res;
    });
  }

  // Load names & churches
  useEffect(() => {
    if (!token) return;
    setCargando(true);
    fetchConAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:X`
    )
      .then(r => r.json())
      .then(data => {
        const vals = data.values || [];
        setNombres(vals.map(f => f[0])); // A: Nombre Completo
        setIglesias([...new Set(vals.map(f => f[2]))]); // C: Iglesia
      })
      .finally(() => setCargando(false));
  }, [token]);

  // Load data for selected name
  function cargarDatos(nombre) {
    fetchConAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:X`
    )
      .then(r => r.json())
      .then(data => {
        const fila = (data.values || []).find(f => f[0] === nombre);
        if (!fila) return;
        setDatos(fila);

        // Mapear campos según índice 0-based
        setCampos({
          // logística (H..M => 7..12)
          patente: fila[7] || "",
          vieneConEsposa: fila[8] || "No",
          nombreEsposa: fila[9] || "",
          vieneConAcompanante: fila[10] || "No",
          nombreAcompanante: fila[11] || "",
          mesa: fila[12] || "",

          // acreditación (R..W => 17..22)
          acreditadoPastor: fila[17] || "No",
          acreditadoEsposa: fila[18] || "No",
          acreditadoAcompanante: fila[19] || "No",
          llegada: fila[20] || "",
          observaciones: fila[21] || ""
        });

        // Foto (X => índice 23)
        const rawUrl = fila[23] || "";
        let fileId = null;
        const match = rawUrl.match(/\/d\/([^/]+)/);
        if (match) fileId = match[1];
        else {
          try {
            fileId = new URL(rawUrl).searchParams.get("id");
          } catch {}
        }
        const directUrl = fileId
          ? `https://drive.google.com/thumbnail?authuser=0&sz=w250&id=${fileId}`
          : rawUrl;
        setFotoUrl(directUrl);
      })
      .catch(err => {
        console.error("Error en cargarDatos:", err);
        setFotoUrl("");
      });
  }

  // Bloquea y fuerza "No" si no vienen con esposa/acompañante
  useEffect(() => {
    setCampos(prev => {
      const next = { ...prev };
      if (prev.vieneConEsposa !== "Si") next.acreditadoEsposa = "No";
      if (prev.vieneConAcompanante !== "Si") next.acreditadoAcompanante = "No";
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campos.vieneConEsposa, campos.vieneConAcompanante]);

  function guardarCambios() {
    if (!token) {
      setMostrarAvisoLogin(true);
      setTimeout(() => setMostrarAvisoLogin(false), 3000);
      return;
    }
    if (!seleccionado?.value) return;
    setGuardando(true);

    // localizar fila por nombre
    fetchConAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:A`
    )
      .then(r => r.json())
      .then(data => {
        const idx = (data.values || []).findIndex(f => f[0] === seleccionado.value);
        if (idx < 0) return;
        const row = idx + 2;

        // Timestamp llegada si se acredita al pastor
        const llegada =
          campos.acreditadoPastor === "Si"
            ? (campos.llegada || new Date().toLocaleString())
            : (campos.acreditadoPastor === "No" ? "" : (campos.llegada || ""));

        // 1) PUT logística H:M (7..12)
        const putLogistica = fetchConAuth(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!H${row}:M${row}?valueInputOption=RAW`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              values: [[
                campos.patente || "",
                campos.vieneConEsposa || "No",
                campos.nombreEsposa || "",
                campos.vieneConAcompanante || "No",
                campos.nombreAcompanante || "",
                campos.mesa || ""
              ]]
            })
          }
        );

        // 2) PUT acreditación R:W (17..22) — incluye acreditador (W)
        const acreditador = (
          campos.acreditadoPastor === "Si" ||
          campos.acreditadoEsposa === "Si" ||
          campos.acreditadoAcompanante === "Si"
        ) ? correoUsuario : "";

        const putAcreditacion = fetchConAuth(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!R${row}:W${row}?valueInputOption=RAW`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              values: [[
                campos.acreditadoPastor || "No",
                campos.acreditadoEsposa || "No",
                campos.acreditadoAcompanante || "No",
                llegada || "",
                campos.observaciones || "",
                acreditador
              ]]
            })
          }
        );

        return Promise.all([putLogistica, putAcreditacion]);
      })
      .then(() => {
        setMensajeExito(true);
        setTimeout(() => setMensajeExito(false), 3000);
      })
      .finally(() => setGuardando(false));
  }

  function cerrarSesion() {
    localStorage.removeItem("accessToken");
    setToken("");
    setCorreoUsuario("");
  }
  function iniciarSesion() {
    tokenClientRef.current.requestAccessToken();
  }

  return (
    <div className="acreditacion-section">
      <img
        src="https://i.ibb.co/Y49Gn8wW/logo-CEIP-2025-07.png"
        alt="Logo"
        className="form-img"
      />
      <h2 className="form-title">Acreditación Pastoral</h2>
      <p className="form-desc">Complete o actualice la información...</p>

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
      {mostrarAvisoLogin && (
        <p className="mensaje-sesion inactiva">
          ⚠️ Debe iniciar sesión para realizar esta acción.
        </p>
      )}

      {/* Filtros */}
      <div className="form-selectores">
        <div style={{ flex: 1 }}>
          <label className="form-label">Buscar por Nombre</label>
          <Select
            options={nombres.map(n => ({ value: n, label: n }))}
            value={seleccionado}
            onChange={opt => {
              setSeleccionado(opt);
              setIglesiaSeleccionada(null);
              opt?.value && cargarDatos(opt.value);
            }}
            placeholder="Buscar nombre..."
            isClearable
            classNamePrefix="react-select"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label">Buscar por Iglesia</label>
          <Select
            options={iglesias.map(i => ({ value: i, label: i }))}
            value={iglesiaSeleccionada}
            onChange={opt => {
              setIglesiaSeleccionada(opt);
              if (opt?.value) {
                fetchConAuth(
                  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:X`
                )
                  .then(r => r.json())
                  .then(data => {
                    const f = data.values?.find(x => x[2] === opt.value); // C: Iglesia
                    if (f) {
                      setSeleccionado({ value: f[0], label: f[0] });
                      cargarDatos(f[0]);
                    }
                  });
              }
            }}
            placeholder="Buscar iglesia..."
            isClearable
            classNamePrefix="react-select"
            styles={{ container: base => ({ ...base, flex: 1 }) }}
          />
        </div>
      </div>

      {/* Formulario */}
      {seleccionado && (
        <div className="form-grid">
          {/* Columna izquierda */}
          <div className="form-col">
            {/* FOTO encima del Nombre */}
            {fotoUrl && (
              <img
                src={fotoUrl}
                alt={`Foto de ${seleccionado.label}`}
                style={{
                  width: "250px",
                  height: "250px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #03304b",
                  marginBottom: "1rem"
                }}
              />
            )}
            {/* Campos base A..G (0..6) */}
            {[
              { label: "Nombre Completo", value: datos[0] },
              { label: "País", value: datos[1] },
              { label: "Iglesia", value: datos[2] },
              { label: "Zona", value: datos[3] },
              { label: "Grado", value: datos[4] },
              { label: "Celular", value: datos[5] },
              { label: "Tipo de Movilización", value: datos[6] }
            ].map((c, i) => (
              <div className="form-group" key={i}>
                <label className="form-label">{c.label}</label>
                <input
                  className="form-input read-only"
                  value={c.value || ""}
                  readOnly
                />
              </div>
            ))}
            {/* Logística adicional (solo lectura) */}
            <div className="form-group">
              <label className="form-label">Patente</label>
              <input className="form-input read-only" value={campos.patente || ""} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">¿Viene con Esposa?</label>
              <input className="form-input read-only" value={campos.vieneConEsposa || "No"} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre Esposa</label>
              <input className="form-input read-only" value={campos.nombreEsposa || ""} readOnly />
            </div>
          </div>

          {/* Columna derecha */}
          <div className="form-col">
            {/* Acompañante (solo lectura) */}
            <div className="form-group">
              <label className="form-label">¿Viene con Acompañante?</label>
              <input className="form-input read-only" value={campos.vieneConAcompanante || "No"} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre Acompañante</label>
              <input className="form-input read-only" value={campos.nombreAcompanante || ""} readOnly />
            </div>

            {/* MESA (solo lectura) */}
            <div className="form-group">
              <label className="form-label">MESA</label>
              <input className="form-input read-only" value={campos.mesa || ""} readOnly />
            </div>

            {/* Hospedaje N..Q (13..16) read-only */}
            {["Hospedador", "N°Contacto", "Dirección", "Iglesia Hospedador"].map((l, i) => (
              <div className="form-group" key={i}>
                <label className="form-label">{l}</label>
                <input
                  className="form-input read-only"
                  value={datos[[13, 14, 15, 16][i]] || ""}
                  readOnly
                />
              </div>
            ))}

            {/* Acreditación */}
            <div className="form-group">
              <label className="form-label">¿Se Acredita Pastor?</label>
              <select
                className="form-select"
                value={campos.acreditadoPastor}
                onChange={e => {
                  if (!token) {
                    setMostrarAvisoLogin(true);
                    setTimeout(() => setMostrarAvisoLogin(false), 3000);
                    return;
                  }
                  const v = e.target.value;
                  setCampos({
                    ...campos,
                    acreditadoPastor: v,
                    llegada: v === "Si" ? (campos.llegada || new Date().toLocaleString()) : ""
                  });
                }}
              >
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">¿Se Acredita Esposa?</label>
              <select
                className="form-select"
                value={campos.acreditadoEsposa}
                onChange={e => setCampos({ ...campos, acreditadoEsposa: e.target.value })}
                disabled={campos.vieneConEsposa !== "Si"}
                title={campos.vieneConEsposa !== "Si" ? "No viene con esposa" : ""}
              >
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">¿Se Acredita Acompañante?</label>
              <select
                className="form-select"
                value={campos.acreditadoAcompanante}
                onChange={e => setCampos({ ...campos, acreditadoAcompanante: e.target.value })}
                disabled={campos.vieneConAcompanante !== "Si"}
                title={campos.vieneConAcompanante !== "Si" ? "No viene con acompañante" : ""}
              >
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Fecha y Hora Acreditación</label>
              <input className="form-input read-only" value={campos.llegada || ""} readOnly />
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones y/o Modificaciones</label>
              <input
                className="form-input"
                value={campos.observaciones || ""}
                onChange={e => setCampos({ ...campos, observaciones: e.target.value })}
              />
            </div>

{/* Botón: 100% ancho, +alto y subido 8px */}
<div className="form-group" style={{ marginTop: "16px" }}>
  <button
    className="form-btn guardar-btn"
    style={{
      width: "100%",
      height: "52px",          // antes 44px (+8)
      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
      transform: "translateY(-8px)" // lo sube 8px → crece hacia arriba
    }}
    onClick={guardarCambios}
    disabled={guardando}
  >
    {guardando ? "Guardando..." : "Guardar Cambios"}
  </button>
</div>




          </div>
        </div>
      )}

      {cargando && (
        <div className="mensaje-cargando">
          <span className="spinner" /> Cargando datos...
        </div>
      )}
      {mensajeExito && (
        <div className="mensaje-exito">✅ Datos actualizados correctamente</div>
      )}
    </div>
  );
}
