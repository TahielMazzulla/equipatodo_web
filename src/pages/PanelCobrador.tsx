// src/pages/PanelCobrador.tsx
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
// import "jspdf-autotable"; // (esto solo se descomenta si más adelante querés tablas)

interface Cliente {
  id: string;
  nombre: string;
  comercio: string;
  dni: string;
  telefono: string;
  email: string;
  redesocial: string;
  direccion: string;
  localidad: string;
  cobrador?: string;
}

interface Venta {
  id: string;
  producto: string;
  dias: number;
  valorDiario: number;
  fechaInicio: string;
  fechaFin: string;
  frecuencia?: string;
  vendedor?: string;
}
// Helper para obtener la fecha local de Argentina en formato YYYY-MM-DD
function getArgentinaDateStr(date = new Date()) {
  const offset = -3; // GMT-3
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const argTime = new Date(utc + 3600000 * offset);
  return argTime.toISOString().split("T")[0];
}

export default function PanelCobrador() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<any>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventasPorCliente, setVentasPorCliente] = useState<Record<string, Venta[]>>({});
  const [busqueda, setBusqueda] = useState("");
  const [montoMixto, setMontoMixto] = useState<Record<string, { efectivo: number; transferencia: number }>>({});
const [pagosPorVenta, setPagosPorVenta] = useState<Record<string, any[]>>({});
const [resumenDiario, setResumenDiario] = useState({
  efectivo: 0,
  transferencia: 0,
  total: 0,
});
  const [porcentajeCobranza, setPorcentajeCobranza] = useState(0);
const [totalCobrarHoy, setTotalCobrarHoy] = useState(0);
const hoy = new Date();
const igualDia = (a: Date, b: Date) =>
  a.getDate() === b.getDate() &&
  a.getMonth() === b.getMonth() &&
  a.getFullYear() === b.getFullYear();
  const [mostrarHistorial, setMostrarHistorial] = useState<Record<string, boolean>>({});
  const [pagosCobrador, setPagosCobrador] = useState<any[]>([]);

// Tu función para cerrar sesión:
  function handleLogout() {
    localStorage.removeItem("usuario");
    navigate("/login");
    }

    function exportarPDF() {
  const doc = new jsPDF();

  // Armá la fecha de hoy
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  const fechaStr = `${yyyy}-${mm}-${dd}`;

  doc.setFontSize(16);
  doc.text(`Panel del Cobrador — ${usuario?.nombre || ""}`, 10, 18);

  doc.setFontSize(13);
  doc.text(`Resumen del día (${fechaStr}):`, 10, 32);

  doc.setFontSize(11);
  doc.text([
    `Total cobrado: $${resumenDiario.total.toLocaleString()}`,
    `Efectivo: $${resumenDiario.efectivo.toLocaleString()}`,
    `Transferencia: $${resumenDiario.transferencia.toLocaleString()}`,
    "",
    `Porcentaje de cobranza diaria: ${
      totalCobrarHoy === 0
        ? "No hay cuotas para cobrar hoy."
        : `${porcentajeCobranza}% (${
            resumenDiario.total.toLocaleString()
          } / ${totalCobrarHoy.toLocaleString()})`
    }`
  ], 10, 45);

  doc.save(`resumen-del-${fechaStr}.pdf`);
}

  useEffect(() => {
    const userStr = localStorage.getItem("usuario");
    if (userStr) setUsuario(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    if (!usuario?.nombre) return;

    async function fetchClientes() {
      // Buscar solo los clientes de ese cobrador
      const q = query(collection(db, "clientes"), where("cobrador", "==", usuario.nombre));
      const snap = await getDocs(q);
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cliente[];
      setClientes(lista);

      // Ventas de cada cliente
      const ventasPorCliente: Record<string, Venta[]> = {};
      for (const cliente of lista) {
        const ventasSnap = await getDocs(collection(db, "clientes", cliente.id, "ventas"));
        ventasPorCliente[cliente.id] = ventasSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Venta[];
      }
      setVentasPorCliente(ventasPorCliente);
    }

    fetchClientes();
  }, [usuario]);
  useEffect(() => {
  if (!usuario?.nombre) return;

  // Obtené la fecha local de Argentina (usando tu función)
  const fechaHoy = getArgentinaDateStr();

  // Armá la query para traer solo los pagos de este cobrador y de hoy
  async function fetchPagosCobrador() {
    const q = query(
      collection(db, "pagos"),
      where("cobrador", "==", usuario.nombre),
      where("fecha", "==", fechaHoy)
    );
    const snap = await getDocs(q);
    setPagosCobrador(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }

  fetchPagosCobrador();
}, [usuario]);
  useEffect(() => {
  async function fetchPagos() {
    const pagosMap: Record<string, any[]> = {};
    for (const cliente of clientes) {
      for (const venta of ventasPorCliente[cliente.id] || []) {
        const pagosSnap = await getDocs(collection(db, "clientes", cliente.id, "ventas", venta.id, "pagos"));
        pagosMap[venta.id] = pagosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    }
    
    setPagosPorVenta(pagosMap);
  }
  if (clientes.length > 0) fetchPagos();
}, [clientes, ventasPorCliente]);
async function registrarPago(clienteId: string, ventaId: string) {
  const { efectivo = 0, transferencia = 0 } = montoMixto[ventaId] || {};
  const monto = efectivo + transferencia;
  if (monto <= 0) return;

  const pagosRef = collection(db, "clientes", clienteId, "ventas", ventaId, "pagos");
  const ahora = new Date();
  const hora = ahora.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await addDoc(pagosRef, {
  fecha: getArgentinaDateStr(ahora),
  hora,
  monto,
  formaPago: `efectivo: $${efectivo}, transf: $${transferencia}`,
  efectivo,
  transferencia,
  creadoEn: serverTimestamp(),
});

  // Refrescar pagos
  const pagosSnap = await getDocs(pagosRef);
  setPagosPorVenta(prev => ({
    ...prev,
    [ventaId]: pagosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }));
  // Limpiar inputs
  setMontoMixto(prev => ({
    ...prev,
    [ventaId]: { efectivo: 0, transferencia: 0 }
  }));
}
useEffect(() => {
  const hoy = new Date();
  const hoyStr = getArgentinaDateStr(hoy);
  let totalEfectivo = 0;
  let totalTransferencia = 0;
  let totalCobrar = 0;

  // Sumá lo que cobró hoy
  // Sumá lo que cobró hoy
for (const pagos of Object.values(pagosPorVenta)) {
  for (const pago of pagos) {
    if (pago.fecha === hoyStr) {
      totalEfectivo += pago.efectivo || 0;
      totalTransferencia += pago.transferencia || 0;
    }
  }
}

for (const ventas of Object.values(ventasPorCliente)) {
  for (const venta of ventas) {
    if (!venta.frecuencia || !venta.fechaInicio) continue;

    const partes = venta.fechaInicio.split("-");
const fechaInicio = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    const fechaFin = venta.fechaFin ? new Date(venta.fechaFin) : null;

    // Solo ventas activas
    if (hoy < fechaInicio) continue;
    if (fechaFin && hoy > fechaFin) continue;

    // ------ DIARIA ------
    if ((venta.frecuencia === "diaria" || venta.frecuencia === "diario") && hoy.getDay() !== 0) {
      totalCobrar += venta.valorDiario;
    }

    // ------ SEMANAL ------
    else if (venta.frecuencia === "semanal") {
      // El día de la semana debe ser igual al de la fecha de inicio,
      // Y la cantidad de semanas transcurridas debe ser un múltiplo de 7 días.
      const diffDays = Math.floor((hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
      if (
        hoy.getDay() === fechaInicio.getDay() &&
        diffDays % 7 === 0
      ) {
        totalCobrar += venta.valorDiario;
      }
    }

    // ------ QUINCENAL ------
    else if (venta.frecuencia === "quincenal") {
      const diffDays = Math.floor((hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
      if (
        hoy.getDay() === fechaInicio.getDay() &&
        diffDays % 14 === 0
      ) {
        totalCobrar += venta.valorDiario;
      }
    }

    // ------ MENSUAL ------
    else if (venta.frecuencia === "mensual") {
      if (hoy.getDate() === fechaInicio.getDate()) {
        totalCobrar += venta.valorDiario;
      }
    }
  }
}

  const totalCobrado = totalEfectivo + totalTransferencia;
  setResumenDiario({
    efectivo: totalEfectivo,
    transferencia: totalTransferencia,
    total: totalCobrado,
  });

  setTotalCobrarHoy(totalCobrar);

  if (totalCobrar > 0) {
    setPorcentajeCobranza(Math.round((totalCobrado / totalCobrar) * 100));
  } else {
    setPorcentajeCobranza(0);
  }
}, [pagosPorVenta, ventasPorCliente]);
// --- Calcular resumen rápido usando pagosCobrador ---
let totalEfectivoCobrador = 0;
let totalTransferenciaCobrador = 0;
let totalGeneralCobrador = 0;

for (const pago of pagosCobrador) {
  totalEfectivoCobrador += pago.efectivo || 0;
  totalTransferenciaCobrador += pago.transferencia || 0;
}
totalGeneralCobrador = totalEfectivoCobrador + totalTransferenciaCobrador;

  return (
  <div style={{ padding: 20 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h1>
  Panel del Cobrador — {usuario?.nombre || ""}
</h1>
      <button
  onClick={handleLogout}
  className="boton-principal"
>
  Cerrar sesión
</button>
      <button
  onClick={exportarPDF}
  className="boton-principal success"
>
  Exportar a PDF
</button>
    </div>
    <div className="tarjeta">
  <h3>Resumen del día (hoy)</h3>
  <p><strong>Total cobrado:</strong> ${totalGeneralCobrador.toLocaleString()}</p>
  <p><strong>Efectivo:</strong> ${totalEfectivoCobrador.toLocaleString()}</p>
  <p><strong>Transferencia:</strong> ${totalTransferenciaCobrador.toLocaleString()}</p>
</div>
<p>
  <strong>Porcentaje de cobranza diaria:</strong>
  {totalCobrarHoy === 0
    ? " No hay cuotas para cobrar hoy."
    : ` ${porcentajeCobranza}% (${resumenDiario.total.toLocaleString()} / ${totalCobrarHoy.toLocaleString()})`}
</p>

<div style={{
  margin: "30px auto 22px auto",
  maxWidth: 420,
  display: "flex",
  justifyContent: "center"
}}>
  <input
    type="text"
    value={busqueda}
    onChange={e => setBusqueda(e.target.value)}
    placeholder="Buscar cliente por nombre..."
    style={{
      width: "100%",
      padding: "12px 18px",
      borderRadius: 8,
      border: "1.5px solid #29489999",
      outline: "none",
      fontSize: 17,
      fontFamily: "'League Spartan', Arial, sans-serif",
      color: "#294899",
      background: "#f8faff",
      boxShadow: "0 2px 8px #29489918",
      marginBottom: 0
    }}
  />
</div>

    {/* Resto de tu contenido: lista de clientes, etc */}
      {clientes.length === 0 ? (
        <p>No tienes clientes asignados.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {clientes
            .filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))
            .map(cliente => (
              <li key={cliente.id} className="tarjeta" style={{ marginBottom: 18 }}>
                <strong>{cliente.nombre}</strong> — {cliente.comercio}
                <div>
                  <b>Tel:</b> {cliente.telefono} — <b>Dirección:</b> {cliente.direccion}
                </div>
                <div>
                  <b>Ventas:</b>
                  <ul>
                    {(ventasPorCliente[cliente.id] || []).map(venta => (
  <li key={venta.id}>
    Producto: <b>{venta.producto}</b> — {venta.frecuencia || "diaria"}
    <br />
<strong>Monto de la cuota:</strong> ${venta.valorDiario}
    <div>
      <input
        type="number"
        placeholder="Efectivo"
        value={montoMixto[venta.id]?.efectivo || ""}
        onChange={e =>
          setMontoMixto(prev => ({
            ...prev,
            [venta.id]: {
              ...(prev[venta.id] || {}),
              efectivo: +e.target.value,
              transferencia: prev[venta.id]?.transferencia || 0,
            },
          }))
        }
        style={{ width: 80, marginRight: 8 }}
      />
      <input
        type="number"
        placeholder="Transferencia"
        value={montoMixto[venta.id]?.transferencia || ""}
        onChange={e =>
          setMontoMixto(prev => ({
            ...prev,
            [venta.id]: {
              ...(prev[venta.id] || {}),
              transferencia: +e.target.value,
              efectivo: prev[venta.id]?.efectivo || 0,
            },
          }))
        }
        style={{ width: 100, marginRight: 8 }}
      />
      <button
  onClick={() => registrarPago(cliente.id, venta.id)}
  className="boton-principal"
>
  Registrar pago
</button>
    </div>
    <button
  onClick={() =>
    setMostrarHistorial((prev) => ({
      ...prev,
      [venta.id]: !prev[venta.id],
    }))
  }
  className="boton-secundario"
>
  {mostrarHistorial[venta.id] ? "Ocultar historial" : "Ver historial"}
</button>
{mostrarHistorial[venta.id] && (
  <div>
    <strong>Historial de pagos:</strong>
    <ul>
      {(pagosPorVenta[venta.id] || []).map((p) => (
        <li key={p.id}>
          {p.fecha} - ${p.monto} ({p.formaPago})
        </li>
      ))}
    </ul>
  </div>
)}
  </li>
))}
                  </ul>.
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}