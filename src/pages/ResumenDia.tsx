import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";
const AZUL_EQUIPATODO = "#294899";
const GRIS_EQUIPATODO = "#9D9D9C";
const FUENTE_EQUIPATODO = "'League Spartan', Arial, sans-serif";

interface Pago {
  monto: number;
  formaPago: string;
  fecha: string;
  efectivo?: number;
  transferencia?: number;
  creadoEn: any;
  cobrador?: string;
}

interface Cliente {
  cobrador?: string;
}

export default function ResumenDia() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const hoy = new Date().toISOString().split("T")[0];
    return hoy;
  });

  const resumenRef = useRef<HTMLDivElement>(null);

  // el resto del componente sigue acá...

async function exportarPDF() {
  if (resumenRef.current) {
    const canvas = await html2canvas(resumenRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    const fechaHoy = new Date().toISOString().split("T")[0];
pdf.save(`resumen_del_dia_${fechaHoy}.pdf`);
  }
}
// Obtener fecha de hoy
const hoy = new Date();

// Calcular inicio y fin de la semana actual (lunes a sábado)
const dia = hoy.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
const diferenciaALunes = dia === 0 ? -6 : 1 - dia;
const lunes = new Date(hoy);
lunes.setDate(hoy.getDate() + diferenciaALunes);

const sabado = new Date(lunes);
sabado.setDate(lunes.getDate() + 5);

// Formato YYYY-MM-DD
const semanaInicio = lunes.toISOString().split("T")[0];
const semanaFin = sabado.toISOString().split("T")[0];

// Calcular inicio y fin del mes actual
const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

const mesInicio = inicioMes.toISOString().split("T")[0];
const mesFin = finMes.toISOString().split("T")[0];

  useEffect(() => {
  async function fetchPagosPorFecha() {
    const clientesSnap = await getDocs(collection(db, "clientes"));
    const todosLosPagos: Pago[] = [];

    for (const clienteDoc of clientesSnap.docs) {
      const clienteId = clienteDoc.id;
      const cobrador = (clienteDoc.data() as Cliente).cobrador || "Sin asignar";

      const ventasSnap = await getDocs(collection(db, "clientes", clienteId, "ventas"));
      for (const ventaDoc of ventasSnap.docs) {
        const pagosSnap = await getDocs(collection(db, "clientes", clienteId, "ventas", ventaDoc.id, "pagos"));
        for (const pagoDoc of pagosSnap.docs) {
          const pago = pagoDoc.data() as Pago;
          if (pago.fecha === fechaSeleccionada) {
  todosLosPagos.push({ ...pago, cobrador });
}
        }
      }
    }

    setPagos(todosLosPagos);
  }

  fetchPagosPorFecha();
}, [fechaSeleccionada]);

  const resumen: Record<string, { total: number; efectivo: number; transferencia: number }> = {};
  let totalGeneral = 0;
  let totalEfectivo = 0;
  let totalTransferencia = 0;

  for (const pago of pagos) {
    const cobrador = pago.cobrador || "Sin asignar";

    if (!resumen[cobrador]) {
      resumen[cobrador] = { total: 0, efectivo: 0, transferencia: 0 };
    }

    // NUEVA LÓGICA: se priorizan los campos explícitos de efectivo y transferencia
    const efectivo = typeof pago.efectivo === "number" ? pago.efectivo : (pago.formaPago === "efectivo" ? pago.monto : 0);
const transferencia = typeof pago.transferencia === "number" ? pago.transferencia : (pago.formaPago === "transferencia" ? pago.monto : 0);
    const total = efectivo + transferencia;

    resumen[cobrador].efectivo += efectivo;
    resumen[cobrador].transferencia += transferencia;
    resumen[cobrador].total += total;

    totalEfectivo += efectivo;
    totalTransferencia += transferencia;
    totalGeneral += total;
  }
  return (
    <div
  style={{
    padding: 32,
    minHeight: "100vh",
    background: "#f8faff", // fondo clarito
    fontFamily: FUENTE_EQUIPATODO,
  }}
>
    <h1
  style={{
    fontSize: 32,
    color: AZUL_EQUIPATODO,
    marginBottom: 14,
    fontWeight: 700,
    letterSpacing: 1.2,
    fontFamily: FUENTE_EQUIPATODO,
  }}
>
  Resumen del día: {fechaSeleccionada}
</h1>
      <button
  onClick={exportarPDF}
  style={{
    marginBottom: 22,
    background: AZUL_EQUIPATODO,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 26px",
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: 1,
    fontFamily: FUENTE_EQUIPATODO,
    cursor: "pointer",
    boxShadow: "0 3px 12px 0 #29489936"
  }}
>
  Exportar a PDF
</button>
      <div
  ref={resumenRef}
  style={{
    background: "#fff",
    borderRadius: 18,
    padding: 32,
    boxShadow: "0 6px 32px 0 #2948991a",
    marginBottom: 22,
    maxWidth: 650,
    margin: "auto"
  }}
>
      
        <h2 style={{ color: AZUL_EQUIPATODO, fontWeight: 700, fontSize: 23, marginTop: 0 }}>
  Resumen General
</h2>
<p style={{ color: "#555", fontWeight: 500, fontSize: 18 }}>
  <strong>Fecha:</strong> {fechaSeleccionada || new Date().toISOString().split("T")[0]}
</p>
<p style={{ color: AZUL_EQUIPATODO, fontWeight: 700, fontSize: 22 }}>
  <strong>Total General:</strong> ${totalGeneral.toLocaleString()}
</p>
<p style={{ color: AZUL_EQUIPATODO, fontWeight: 600 }}>
  <strong>Total en Efectivo:</strong> ${totalEfectivo.toLocaleString()}
</p>
<p style={{ color: GRIS_EQUIPATODO, fontWeight: 600 }}>
  <strong>Total en Transferencias:</strong> ${totalTransferencia.toLocaleString()}
</p>
  
        <h3
  style={{
    marginTop: 22,
    marginBottom: 8,
    color: AZUL_EQUIPATODO,
    fontSize: 19,
    fontWeight: 700,
    letterSpacing: 1
  }}
>
  Por Cobrador
</h3>
        <table style={{
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 20,
  background: "#f9f9fa",
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 2px 12px #29489912"
}}>
  <thead>
    <tr style={{ background: AZUL_EQUIPATODO }}>
      <th style={{ color: "#fff", padding: 13, fontWeight: 700, letterSpacing: 0.7 }}>Cobrador</th>
      <th style={{ color: "#fff", padding: 13, fontWeight: 700 }}>Total</th>
      <th style={{ color: "#fff", padding: 13, fontWeight: 700 }}>Efectivo</th>
      <th style={{ color: "#fff", padding: 13, fontWeight: 700 }}>Transferencia</th>
    </tr>
  </thead>
  <tbody>
    {Object.entries(resumen).map(([cobrador, data]) => (
      <tr key={cobrador} style={{ borderBottom: `1px solid ${GRIS_EQUIPATODO}22` }}>
        <td style={{ padding: 13, fontWeight: 500 }}>{cobrador}</td>
        <td style={{ padding: 13, fontWeight: 700, color: AZUL_EQUIPATODO }}>${data.total.toLocaleString()}</td>
        <td style={{ padding: 13, color: AZUL_EQUIPATODO, fontWeight: 600 }}>${data.efectivo.toLocaleString()}</td>
        <td style={{ padding: 13, color: GRIS_EQUIPATODO, fontWeight: 600 }}>${data.transferencia.toLocaleString()}</td>
      </tr>
    ))}
  </tbody>
</table>
      </div>
    </div>
  );
}