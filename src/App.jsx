import { useEffect, useState } from "react";
import Select from "react-select";

const CLIENT_ID = "100877140149-62dkjnovin2gmlhppj5hqfupamu29r2a.apps.googleusercontent.com";
const SHEET_ID = "1dJLyUn5ZhOCjCmxu8Ev0wocUaZaMcpKr4VMBlQlKQ8g";

export default function AcreditacionApp() {
  const [token, setToken] = useState("");
  const [nombres, setNombres] = useState([]);
  const [seleccionado, setSeleccionado] = useState("");
  const [datos, setDatos] = useState({});
  const [campos, setCampos] = useState({ acreditado: "No", credencial: "No", llegada: "", observaciones: "" });
  const [mensajeExito, setMensajeExito] = useState(false);

  useEffect(() => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      prompt: "",
      callback: (resp) => {
        if (resp.access_token) setToken(resp.access_token);
      },
    });

    document.getElementById("loginBtn").onclick = () => {
      client.requestAccessToken();
    };
  }, []);

  function cargarNombres() {
    if (!token) return alert("Debes iniciar sesión");

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:Q`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        const nombresFiltrados = data.values?.map(f => f[0]) || [];
        setNombres(nombresFiltrados);
      })
      .catch(err => console.error("Error cargando nombres:", err));
  }

  function cargarDatos(nombre) {
    setSeleccionado(nombre);
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:Q`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        const fila = data.values?.find(f => f[0] === nombre);
        if (fila) {
          setDatos(fila);
          setCampos({
            acreditado: fila[13] || "No",
            credencial: fila[14] || "No",
            llegada: fila[15] || "",
            observaciones: fila[16] || "",
          });
        }
      })
      .catch(err => console.error("Error cargando datos:", err));
  }

  function guardarCambios() {
    if (!token || !seleccionado) return;

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!A2:A`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        const index = data.values?.findIndex(f => f[0] === seleccionado);
        if (index >= 0) {
          const fila = index + 2;
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Acreditación!N${fila}:Q${fila}?valueInputOption=RAW`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              values: [[campos.acreditado, campos.credencial, campos.llegada, campos.observaciones]]
            }),
          }).then(() => {
            setMensajeExito(true);
            setTimeout(() => setMensajeExito(false), 3000);
          });
        }
      });
  }

  function handleAcreditadoChange(valor) {
    const fechaHora = valor === "Si" ? new Date().toLocaleString() : "";
    setCampos({ ...campos, acreditado: valor, llegada: fechaHora });
  }

  return (
    <div className="main-center">
      <div className="form-container">
        <img src="https://i.ibb.co/d4CJ7Y94/Made-with-ins-Mind-Captura-de-pantalla-2025-07-07-121211-1.png" alt="" className="form-img" />

        <h2 className="form-title">Acreditación Pastoral</h2>
        <p className="form-desc">Complete o actualice la información de acreditación pastoral</p>

        <button className="form-btn" id="loginBtn">Iniciar sesión con Google</button>
        <button className="form-btn" onClick={cargarNombres}>Cargar Nombres</button>

        <label className="form-label">Seleccione un nombre</label>
        <Select
          options={nombres.map(n => ({ value: n, label: n }))}
          onChange={opt => cargarDatos(opt.value)}
          placeholder="Buscar nombre..."
          classNamePrefix="react-select"
        />

        {seleccionado && (
          <div className="form-grid">
            <div className="form-col">
              {[{ label: "País", value: datos[1] }, { label: "Iglesia", value: datos[2] }, { label: "Zona", value: datos[3] }, { label: "Grado", value: datos[4] }, { label: "Celular", value: datos[5] }, { label: "Tipo de Movilización", value: datos[6] }, { label: "Patente", value: datos[7] }, { label: "Nombre Hospedador", value: datos[9] }].map((campo, idx) => (
                <div className="form-group" key={idx}>
                  <label className="form-label">{campo.label}</label>
                  <input className="form-input read-only" value={campo.value} readOnly />
                </div>
              ))}
            </div>

            <div className="form-col">
              <div className="form-group">
                <label className="form-label">Dirección Hospedador</label>
                <input className="form-input read-only" value={datos[11]} readOnly />
              </div>

              <div className="form-group">
                <label className="form-label">Iglesia Hospedador</label>
                <input className="form-input read-only" value={datos[12]} readOnly />
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
                <label className="form-label">Teléfono Hospedador</label>
                <input className="form-input read-only" value={datos[10]} readOnly />
              </div>

              <button className="form-btn" onClick={guardarCambios}>Guardar Cambios</button>
            </div>
          </div>
        )}
      </div>

      {mensajeExito && (
        <div className="mensaje-exito">✅ Datos actualizados correctamente</div>
      )}

      <style>{`
        body { font-family: Inter, sans-serif; background: #f3f4f6; margin: 0; }
        .main-center { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
        .form-container { max-width: 900px; width: 100%; background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .form-img { display: block; margin: 0 auto 2rem; max-width: 200px; }
        .form-title { text-align: center; font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; }
        .form-desc { text-align: center; color: #6b7280; margin-bottom: 2rem; font-size: 0.875rem; }
        .form-label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #374151; }
        .form-input, .form-select { width: 100%; padding: 0.875rem 1.25rem; border: 1px solid #d1d5db; border-radius: 8px; background: white; font-size: 1rem; margin-bottom: 1rem; }
        .form-input.read-only { background: #e5e7eb; color: #6b7280; }
        .form-input:focus, .form-select:focus { border-color: #6a64f1; box-shadow: 0 0 0 3px rgba(106, 100, 241, 0.2); }
        .form-btn { width: 100%; padding: 0.875rem 1.5rem; background: #6a64f1; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 1rem; }
        .form-btn:hover { background: #5a54d1; }
        .form-grid { display: flex; gap: 2rem; flex-wrap: wrap; justify-content: space-between; }
        .form-col { flex: 1; min-width: 250px; max-width: 400px; }
        .form-group { margin-bottom: 1.25rem; }
        .mensaje-exito { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #4ade80; color: #065f46; padding: 12px 24px; border-radius: 8px; font-weight: 600; box-shadow: 0 0 10px rgba(0,0,0,0.15); z-index: 9999; animation: fadeInOut 3s forwards; }
        @keyframes fadeInOut { 0% { opacity: 0; transform: translateX(-50%) translateY(-10px); } 10% { opacity: 1; transform: translateX(-50%) translateY(0); } 90% { opacity: 1; transform: translateX(-50%) translateY(0); } 100% { opacity: 0; transform: translateX(-50%) translateY(-10px); } }

        .react-select__control { width: 100%; padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 8px; background: white; font-size: 1rem; margin-bottom: 1.25rem; box-shadow: none; }
        .react-select__control--is-focused { border-color: #6a64f1; box-shadow: 0 0 0 3px rgba(106, 100, 241, 0.2); }
        .react-select__menu { z-index: 10; }
      `}</style>
    </div>
  );
}
