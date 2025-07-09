import { useEffect, useState, useRef } from "react";
import Select from "react-select";

const CLIENT_ID = "100877140149-62dkjnovin2gmlhppj5hqfupamu29r2a.apps.googleusercontent.com";
const SHEET_ID = "1dJLyUn5ZhOCjCmxu8Ev0wocUaZaMcpKr4VMBlQlKQ8g";

export default function AcreditacionApp() {
  const [correoUsuario, setCorreoUsuario] = useState("");
  const [token, setToken] = useState("");
  const [nombres, setNombres] = useState([]);
  const [seleccionado, setSeleccionado] = useState("");
  const [datos, setDatos] = useState({});
  const [campos, setCampos] = useState({ acreditado: "No", credencial: "No", llegada: "", observaciones: "" });
  const [mensajeExito, setMensajeExito] = useState(false);
  const [iglesias, setIglesias] = useState([]);
  const [iglesiaSeleccionada, setIglesiaSeleccionada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const tokenClientRef = useRef(null);



useEffect(() => {
  // 1. Verifica si hay un token guardado en localStorage al cargar la app
  const savedToken = localStorage.getItem("accessToken");
  if (savedToken) {
    setToken(savedToken);

    // Intenta recuperar el correo asociado al token guardado
    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${savedToken}` }
    })
      .then(res => res.json())
      .then(data => setCorreoUsuario(data.email))
      .catch(() => {
        // Si falla, puede que el token esté expirado o inválido
        localStorage.removeItem("accessToken");
        setToken("");
        setCorreoUsuario("");
      });
  }

  // 2. Configura el cliente OAuth clásico
  tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email",
    prompt: "", // puedes usar "consent" si quieres forzar el diálogo
    callback: (resp) => {
      if (resp.access_token) {
        setToken(resp.access_token);
        localStorage.setItem("accessToken", resp.access_token);

        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${resp.access_token}` }
        })
          .then(res => res.json())
          .then(data => setCorreoUsuario(data.email));
      } else {
        alert("No se pudo iniciar sesión correctamente.");
      }
    }
  });
}, []);








useEffect(() => {
  if (token) {
    cargarNombres();
  }
}, [token]);




function cargarNombres() {
  if (!token) return alert("Debes iniciar sesión");

  setCargando(true);

  fetchConAutenticacion(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:Q`)
    .then(res => res.json())
    .then(data => {
      const nombresFiltrados = data.values?.map(f => f[0]) || [];
      const iglesiasFiltradas = [...new Set(data.values?.map(f => f[2]))];
      setNombres(nombresFiltrados);
      setIglesias(iglesiasFiltradas);
    })
    .catch(err => console.error("Error cargando nombres:", err))
    .finally(() => setCargando(false));
}



function cargarDatos(nombre) {
  fetchConAutenticacion(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:Q`)
    .then((res) => res.json())
    .then((data) => {
      const fila = data.values?.find((f) => f[0] === nombre);
      if (fila) {
        setDatos(fila);
        setCampos({
          acreditado: fila[13] || "No",
          credencial: fila[14] || "No",
          llegada: fila[15] || "",
          observaciones: fila[16] || "",
        });
      }
    });
}



function guardarCambios() {
  if (!token || !seleccionado?.value) return;

  setGuardando(true);
  console.time("guardarCambios");

  fetchConAutenticacion(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:A`)
    .then(res => res.json())
    .then(data => {
      const index = data.values?.findIndex(f => f[0] === seleccionado.value);
      if (index >= 0) {
        const fila = index + 2;
        return fetchConAutenticacion(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!N${fila}:R${fila}?valueInputOption=RAW`,
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
]],
            }),
          }
        );
      }
    })
    .then(() => {
      console.timeEnd("guardarCambios");
      setMensajeExito(true);
      setTimeout(() => setMensajeExito(false), 3000);
    })
    .finally(() => setGuardando(false));
}








  function handleAcreditadoChange(valor) {
    const fechaHora = valor === "Si" ? new Date().toLocaleString() : "";
    setCampos({ ...campos, acreditado: valor, llegada: fechaHora });
  }

function cerrarSesion() {
  localStorage.removeItem("accessToken");
  setToken("");
  setCorreoUsuario("");
}

function iniciarSesion() {
  if (window.google && window.google.accounts && tokenClientRef.current) {
    tokenClientRef.current.requestAccessToken();
  }
}

function fetchConAutenticacion(url, opciones = {}) {
  return fetch(url, {
    ...opciones,
    headers: {
      ...(opciones.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
    .then(async (res) => {
      if (res.status === 401) {
        alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
        cerrarSesion();
        throw new Error("Sesión expirada");
      }
      return res;
    });
}




  return (
    <div className="main-center">
      <div className="form-container">
        <img src="https://i.ibb.co/d4CJ7Y94/Made-with-ins-Mind-Captura-de-pantalla-2025-07-07-121211-1.png" alt="Logo" className="form-img" />
        <h2 className="form-title">Acreditación Pastoral</h2>
        <p className="form-desc">Complete o actualice la información de acreditación pastoral</p>


<div className="sesion-container">
  {!token ? (
    <button className="btn-google" onClick={iniciarSesion}>
      <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" />
      Continuar con Google
    </button>
  ) : (
    <>
      <p className="mensaje-sesion activa">Sesión iniciada como: {correoUsuario}</p>
      <button className="form-btn cerrar-sesion-btn" onClick={cerrarSesion}>Cerrar sesión</button>
    </>
  )}
</div>






{cargando && (
  <div className="mensaje-cargando">
    <span className="spinner" />
    Cargando datos...
  </div>
)}
<div className="form-selectores">

  <div style={{ flex: 1 }}>
    <label className="form-label">Buscar por Nombre</label>


   <Select
  options={nombres.map((n) => ({ value: n, label: n }))}
  value={seleccionado}
  onChange={(opt) => {
    setSeleccionado(opt);
    setIglesiaSeleccionada(null);
    if (opt?.value) cargarDatos(opt.value);
  }}
  placeholder="Buscar nombre..."
  isClearable
  classNamePrefix="react-select"
/>


    
  </div>
  <div style={{ flex: 1 }}>
    <label className="form-label">Buscar por Iglesia</label>


    <Select
  options={iglesias.map((i) => ({ value: i, label: i }))}
  value={iglesiaSeleccionada}

onChange={(opt) => {
  setIglesiaSeleccionada(opt);
  if (opt?.value) {
    fetchConAutenticacion(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:Q`)
      .then((res) => res.json())
      .then((data) => {
        const fila = data.values?.find((f) => f[2] === opt.value);
        if (fila) {
          const nombre = fila[0];
          setSeleccionado({ value: nombre, label: nombre });
          cargarDatos(nombre);
        }
      });
  }
}}




  placeholder="Buscar iglesia..."
  isClearable
  classNamePrefix="react-select"
  styles={{ container: (base) => ({ ...base, flex: 1 }) }}
/>




  </div>
</div>

        

        {seleccionado && (
          <div className="form-grid">
            <div className="form-col">
              {[{ label: "Nombre", value: datos[0] }, { label: "País", value: datos[1] }, { label: "Iglesia", value: datos[2] }, { label: "Zona", value: datos[3] }, { label: "Grado", value: datos[4] }, { label: "Celular", value: datos[5] }, { label: "Tipo de Movilización", value: datos[6] }, { label: "Patente", value: datos[7] }].map((campo, idx) => (
                <div className="form-group" key={idx}>
                  <label className="form-label">{campo.label}</label>
                  <input className="form-input read-only" value={campo.value} readOnly />
                </div>
              ))}
            </div>
            <div className="form-col">
              <div className="form-group">
                <label className="form-label">Nombre Hospedador</label>
                <input className="form-input read-only" value={datos[9]} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Dirección Hospedador</label>
                <input className="form-input read-only" value={datos[11]} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Iglesia Hospedador</label>
                <input className="form-input read-only" value={datos[12]} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono Hospedador</label>
                <input className="form-input read-only" value={datos[10]} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">¿Se acredita Pastor?</label>
                <select className="form-select" value={campos.acreditado} onChange={e => handleAcreditadoChange(e.target.value)}>
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">¿Se entregó credencial?</label>
                <select className="form-select" value={campos.credencial} onChange={e => setCampos({ ...campos, credencial: e.target.value })}>
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha y Hora de Llegada</label>
                <input className="form-input read-only" value={campos.llegada} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Modificaciones y Observaciones</label>
                <input className="form-input" value={campos.observaciones} onChange={e => setCampos({ ...campos, observaciones: e.target.value })} />
              </div>
<div className="form-group">
<button className="form-btn guardar-btn" onClick={guardarCambios} disabled={guardando}>
  {guardando ? <><span className="spinner" />Guardando...</> : "Guardar Cambios"}
</button>
</div>

            </div>
          </div>
        )}
      </div>
      {mensajeExito && (
        <div className="mensaje-exito">✅ Datos actualizados correctamente</div>
      )}

    <style>{`
  body {
    font-family: 'DM Sans', sans-serif;
    background: #f5f0ec;
    margin: 0;
  }

  .main-center {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
  }

  .form-container {
    max-width: 900px;
    width: 100%;
    background: white;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  }

  .form-img {
    display: block;
    margin: 0 auto 2rem;
    max-width: 200px;
  }

  .form-title {
    text-align: center;
    font-size: 1.875rem;
    font-weight: 700;
    color: #511C24;
    margin-bottom: 0.5rem;
  }

  .form-desc {
    text-align: center;
    color: #6b7280;
    margin-bottom: 2rem;
    font-size: 0.875rem;
  }

  .form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #511C24;
  }

  .form-input,
  .form-select {
    width: 100%;
    padding: 0.875rem 1.25rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: white;
    font-size: 1rem;
    margin-bottom: 1rem;
    box-sizing: border-box;
  }

  .form-input.read-only {
    background: #eee;
    color: #333;
  }

 .form-btn {
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: #511C24;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 1rem;
  font-family: 'DM Sans', sans-serif; /* 👈 aseguramos la fuente */
  cursor: pointer;
  margin-top: 1rem;
  box-sizing: border-box;
  transition: background 0.2s ease;
}

  .form-btn:hover {
  background: #3e151c;
}

  .form-grid {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    justify-content: space-between;
    padding: 0 1rem;
    box-sizing: border-box;
  }

  .form-col {
    flex: 1;
    min-width: 250px;
    max-width: 400px;
    padding-inline: 0.75rem;
    box-sizing: border-box;
  }

  .form-group {
    width: 100%;
    box-sizing: border-box;
  }

  .mensaje-exito {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #d1fae5; /* fondo verde suave */
    color: #065f46;       /* texto verde más profundo */
    font-family: 'DM Sans', sans-serif;
    padding: 12px 24px;
    font-size: 0.95rem;
    font-weight: 500;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    animation: fadeInOut 3s ease forwards;
  }

  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    10% { opacity: 1; transform: translateX(-50%) translateY(0); }
    90% { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  }

  .react-select__control {
    width: 100%;
    padding: 0.25rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: white;
    font-size: 1rem;
    margin-bottom: 1.25rem;
    box-shadow: none;
  }

  .react-select__control--is-focused {
    border-color: #511C24;
    box-shadow: 0 0 0 3px rgba(81, 28, 36, 0.2);
  }

  .react-select__menu {
    z-index: 10;
  }
    .form-selectores {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 1rem;
}

@media (max-width: 600px) {
  .form-selectores {
    flex-direction: column;
    align-items: stretch;
  }

  .form-selectores .react-select__control {
    margin-bottom: 0.5rem;
  }

  .form-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

/* ✅ esto va FUERA del media query */
.guardar-btn {
  background-color: #0f766e;
}

.guardar-btn:hover {
  background-color: #0d5e58;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 3px solid rgba(0, 0, 0, 0.2);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.mensaje-sesion {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  text-align: center;
  font-weight: 500;
  font-size: 0.95rem;
  margin-top: 0.75rem;
  animation: fadeIn 0.4s ease-in;
}

.mensaje-sesion.activa {
  background-color: #d1fae5;
  color: #065f46;
}

.mensaje-sesion.inactiva {
  background-color: #fee2e2;
  color: #991b1b;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.sesion-container {
  text-align: center;
  margin-bottom: 1rem;
}

.cerrar-sesion-btn {
  background-color: #991b1b;
  margin-top: 0.5rem;
}

.cerrar-sesion-btn:hover {
  background-color: #7f1d1d;
}

.mensaje-cargando {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #e0f2fe;
  color: #0369a1;
  font-family: 'DM Sans', sans-serif;
  padding: 12px 24px;
  font-size: 0.95rem;
  font-weight: 500;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  animation: fadeInOut 3s ease forwards;
}

.btn-google {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: white;
  color: #444;
  font-weight: 500;
  padding: 0.75rem 1.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  width: 100%;
  margin-top: 1rem;
  transition: background 0.2s ease;
   flex-direction: row;
  flex-wrap: nowrap;
}
    @media (max-width: 400px) {
  .btn-google {
    font-size: 0.85rem;
    padding: 0.5rem 1rem;
  }
}



.btn-google:hover {
  background: #f2f2f2;
}

.btn-google img {
  width: 20px;
  height: 20px;
}




`}</style>

    </div>

  );
}
