// src/components/AcreditacionForm.jsx
import { useEffect, useState, useRef } from "react";
import Select from "react-select";

const CLIENT_ID =
  "100877140149-62dkjnovin2gmlhppj5hqfupamu29r2a.apps.googleusercontent.com";
const SHEET_ID =
  "1dJLyUn5ZhOCjCmxu8Ev0wocUaZaMcpKr4VMBlQlKQ8g";

export default function AcreditacionForm() {
  const [correoUsuario, setCorreoUsuario] = useState("");
  const [token, setToken] = useState("");
  const [nombres, setNombres] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [datos, setDatos] = useState([]);
  const [campos, setCampos] = useState({
    acreditado: "No",
    credencial: "No",
    llegada: "",
    observaciones: ""
  });
  const [fotoUrl, setFotoUrl] = useState("");
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

  // Load names & churches
  useEffect(() => {
    if (!token) return;
    setCargando(true);
    fetchConAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:Q`
    )
      .then(r => r.json())
      .then(data => {
        const vals = data.values || [];
        setNombres(vals.map(f => f[0]));
        setIglesias([...new Set(vals.map(f => f[2]))]);
      })
      .finally(() => setCargando(false));
  }, [token]);

  // Load data + photo
  function cargarDatos(nombre) {
    fetchConAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:S`
    )
      .then(r => r.json())
      .then(data => {
        const fila = (data.values || []).find(f => f[0] === nombre);
        if (!fila) return;
        setDatos(fila);
        setCampos({
          acreditado: fila[13] || "No",
          credencial: fila[14] || "No",
          llegada: fila[15] || "",
          observaciones: fila[16] || ""
        });

        const rawUrl = fila[18] || "";
        let fileId = null;
        const m = rawUrl.match(/\/d\/([^/]+)/);
        if (m) fileId = m[1];
        else {
          try {
            fileId = new URL(rawUrl).searchParams.get("id");
          } catch {}
        }
        const directUrl = fileId
          ? `https://drive.google.com/thumbnail?authuser=0&sz=w200&id=${fileId}`
          : rawUrl;
        setFotoUrl(directUrl);
      })
      .catch(err => {
        console.error("Error en cargarDatos:", err);
        setFotoUrl("");
      });
  }

  function guardarCambios() {
    if (!token) {
      setMostrarAvisoLogin(true);
      setTimeout(() => setMostrarAvisoLogin(false), 3000);
      return;
    }
    if (!seleccionado?.value) return;
    setGuardando(true);
    fetchConAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:A`
    )
      .then(r => r.json())
      .then(data => {
        const idx = (data.values || []).findIndex(f => f[0] === seleccionado.value);
        if (idx < 0) return;
        const row = idx + 2;
        return fetchConAuth(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!N${row}:R${row}?valueInputOption=RAW`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              values: [[
                campos.acreditado,
                campos.credencial,
                campos.llegada,
                campos.observaciones,
                campos.acreditado === "Si" ? correoUsuario : ""
              ]]
            })
          }
        );
      })
      .then(() => {
        setMensajeExito(true);
        setTimeout(() => setMensajeExito(false), 3000);
      })
      .finally(() => setGuardando(false));
  }

  function handleAcreditadoChange(v) {
    setCampos({
      ...campos,
      acreditado: v,
      llegada: v === "Si" ? new Date().toLocaleString() : ""
    });
  }

  function cerrarSesion() {
    localStorage.removeItem("accessToken");
    setToken("");
    setCorreoUsuario("");
  }
  function iniciarSesion() {
    tokenClientRef.current.requestAccessToken();
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

  return (
    <div className="acreditacion-section">
      <img
        src="https://i.ibb.co/TqRmH5F8/logo-CEIP-2025-08.png"
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
                  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:Q`
                )
                  .then(r => r.json())
                  .then(data => {
                    const f = data.values?.find(x => x[2] === opt.value);
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
                  width: '250px',
                  height: '250px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #03304b',
                  marginBottom: '1rem'
                }}
              />
            )}
            {/* Campos */}
            {[
              { label: 'Nombre', value: datos[0] },
              { label: 'País', value: datos[1] },
              { label: 'Iglesia', value: datos[2] },
              { label: 'Zona', value: datos[3] },
              { label: 'Grado', value: datos[4] },
              { label: 'Celular', value: datos[5] },
               { label: 'Tipo de Movilización', value: datos[6] }
            ].map((c, i) => (
              <div className="form-group" key={i}>
                <label className="form-label">{c.label}</label>
                <input
                  className="form-input read-only"
                  value={c.value || ''}
                  readOnly
                />
              </div>
            ))}
          </div>

          {/* Columna derecha */}
          <div className="form-col">
            <div className="form-group">
              <label className="form-label">Tipo de Movilización</label>
              <input
                className="form-input read-only"
                value={datos[6] || ''}
                readOnly
              />
            </div>
            <div className="form-group">
              <label className="form-label">Patente</label>
              <input
                className="form-input read-only"
                value={datos[7] || ''}
                readOnly
              />
            </div>
            {['Nombre Hospedador','Dirección Hospedador','Iglesia Hospedador','Teléfono Hospedador'].map((l,i)=>(
              <div className="form-group" key={i}>
                <label className="form-label">{l}</label>
                <input
                  className="form-input read-only"
                  value={datos[[9,11,12,10][i]]||''}
                  readOnly
                />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">¿Se acredita Pastor?</label>
              <select
                className="form-select"
                value={campos.acreditado}
                onChange={e=>{ if(!token){ setMostrarAvisoLogin(true); setTimeout(()=>setMostrarAvisoLogin(false),3000); return;} handleAcreditadoChange(e.target.value); }}
              >
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">¿Se entregó credencial?</label>
              <select
                className="form-select"
                value={campos.credencial}
                onChange={e=>{ if(!token){ setMostrarAvisoLogin(true); setTimeout(()=>setMostrarAvisoLogin(false),3000); return;} setCampos({...campos,credencial:e.target.value}); }}
              >
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha y Hora de Llegada</label>
              <input
                className="form-input read-only"
                value={campos.llegada||''}
                readOnly
              />
            </div>
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <input
                className="form-input"
                value={campos.observaciones||''}
                onChange={e=>{ if(!token){ setMostrarAvisoLogin(true); setTimeout(()=>setMostrarAvisoLogin(false),3000); return;} setCampos({...campos,observaciones:e.target.value}); }}
              />
            </div>
            <div className="form-group">
              <button
                className="form-btn guardar-btn"
                onClick={guardarCambios}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
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
        <div className="mensaje-exito">
          ✅ Datos actualizados correctamente
        </div>
      )}
    </div>
  );
}
