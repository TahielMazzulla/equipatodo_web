import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

interface Cliente {
  id: string;
  nombre: string;
  comercio?: string;
  direccion?: string;
  localidad?: string
  dni: string;
  telefono: string;
  email?: string;
  redesocial?: string;
  cobrador?: string;
  creadoEn: any;
}

interface Venta {
  id: string;
  producto: string;
  dias: number;
  valorDiario: number;
  fechaInicio: string;
  fechaFin: string;
  frecuencia?: string
  vendedor?: string
  creadoEn: any;
}

interface Pago {
  id: string;
  fecha: string;
  hora?: string;
  monto: number;
  formaPago: string;
  creadoEn: any;
}

export default function ClienteDetalle() {
  function editarVenta(id: string) {
    console.log("Editar venta con ID:", id);
    // Acá podés implementar la lógica para editar
  }
  
  const { id } = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [pagosPorVenta, setPagosPorVenta] = useState<Record<string, Pago[]>>({});
  const [montoIngresado, setMontoIngresado] = useState<Record<string, number>>({});
  const [formaPago, setFormaPago] = useState<Record<string, string>>({});
  const [montoMixto, setMontoMixto] = useState<Record<string, { efectivo: number; transferencia: number }>>({});
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([]);
  const [mostrarHistorial, setMostrarHistorial] = useState<Record<string, boolean>>({});
  const [ventaEditando, setVentaEditando] = useState<string | null>(null);
  const [valoresEditados, setValoresEditados] = useState<any>({});
  const [agregandoVenta, setAgregandoVenta] = useState(false);
  const [producto, setProducto] = useState("");
  const [dias, setDias] = useState(0);
  const [valorDiario, setValorDiario] = useState(0);
  const [fechaInicio, setFechaInicio] = useState("");
  const [frecuencia, setFrecuencia] = useState("");
  const [vendedor, setVendedor] = useState("");

  useEffect(() => {
    if (!id) return;

    async function fetchCliente() {
      const ref = doc(db, "clientes", id!);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const raw = snap.data();
        setCliente({ id: snap.id, ...(raw as Omit<Cliente, "id">) });
      }
    }

    async function fetchVentas() {
      const ventasRef = collection(db, "clientes", id!, "ventas");
      const snapV = await getDocs(ventasRef);
      const lista = snapV.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<Venta, "id">) }));
      setVentas(lista);

      const nuevosPagos: Record<string, Pago[]> = {};
      for (const venta of lista) {
        const pagosRef = collection(db, "clientes", id!, "ventas", venta.id, "pagos");
        const snapPagos = await getDocs(pagosRef);
        nuevosPagos[venta.id] = snapPagos.docs
          .map((p: any) => ({ id: p.id, ...(p.data() as Omit<Pago, "id">) }))
          .sort((a, b) => (b.creadoEn?.seconds ?? 0) - (a.creadoEn?.seconds ?? 0));
      }
      setPagosPorVenta(nuevosPagos);
    }

    async function fetchUsuarios() {
      const usuariosRef = collection(db, "usuarios");
      const snap = await getDocs(usuariosRef);
      const lista = snap.docs
        .map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }))
        .filter((user: any) => user.rol === "cobrador");
      setUsuarios(lista);
    }

    fetchCliente();
    fetchVentas();
    fetchUsuarios();
  }, [id]);

  function calcularFechaFin(start: string, totalDias: number): string {
    let count = 0;
    let d = new Date(start);
    while (count < totalDias) {
      if (d.getDay() !== 0) count++;
      if (count < totalDias) d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split("T")[0];
  }

  async function handleConfirmarVenta() {
    if (!id || !producto || !dias || !valorDiario || !fechaInicio) {
      alert("Completa todos los campos de la venta.");
      return;
    }

    const fechaFin = calcularFechaFin(fechaInicio, dias);
    const ventasRef = collection(db, "clientes", id, "ventas");
    await addDoc(ventasRef, {
      producto,
      dias,
      valorDiario,
      fechaInicio,
      fechaFin,
      vendedor,
      frecuencia,
      creadoEn: serverTimestamp(),
    });

    setAgregandoVenta(false);
    setProducto("");
    setDias(0);
    setValorDiario(0);
    setFechaInicio("");
  }
  // Helper para obtener la fecha local de Argentina en formato YYYY-MM-DD
function getArgentinaDateStr(date = new Date()) {
  const offset = -3; // GMT-3
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const argTime = new Date(utc + 3600000 * offset);
  return argTime.toISOString().split("T")[0];
}

  async function registrarPago(ventaId: string, _: number) {
    if (!id) return;
    const { efectivo = 0, transferencia = 0 } = montoMixto[ventaId] || {};
    const monto = efectivo + transferencia;
    if (monto <= 0) return;
  
    const pagosRef = collection(db, "clientes", id, "ventas", ventaId, "pagos");
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
    // ---- NUEVO: Guardar también en la colección global 'pagos' ----
  await addDoc(collection(db, "pagos"), {
    clienteId: id,
    ventaId,
    cobrador: cliente?.cobrador || "Sin asignar",
    fecha: getArgentinaDateStr(ahora),
    hora,
    monto,
    efectivo,
    transferencia,
    formaPago: `efectivo: $${efectivo}, transf: $${transferencia}`,
    creadoEn: serverTimestamp(),
  });
  
    const snapPagos = await getDocs(pagosRef);
    const nuevosPagos = snapPagos.docs
      .map((p: any) => ({ id: p.id, ...(p.data() as Omit<Pago, "id">) }))
      .sort((a, b) => (b.creadoEn?.seconds ?? 0) - (a.creadoEn?.seconds ?? 0));
  
    setPagosPorVenta((prev) => ({ ...prev, [ventaId]: nuevosPagos }));
    setMontoMixto((prev) => ({
      ...prev,
      [ventaId]: { efectivo: 0, transferencia: 0 },
    }));
  }

  async function asignarCobrador(nombreCobrador: string) {
    if (!id) return;
    const clienteRef = doc(db, "clientes", id);
    await updateDoc(clienteRef, { cobrador: nombreCobrador });
    setCliente((prev) => (prev ? { ...prev, cobrador: nombreCobrador } : null));
  }
  async function guardarCambiosVenta() {
  if (!id || !ventaEditando) return;

  const ventaRef = doc(db, "clientes", id, "ventas", ventaEditando);
  await updateDoc(ventaRef, {
    ...valoresEditados,
  });

  setVentas((prev) =>
    prev.map((v) =>
      v.id === ventaEditando ? { ...v, ...valoresEditados } : v
    )
  );
  setVentaEditando(null);
}
  async function eliminarVenta(ventaId: string) {
  if (!id) return;

  const confirmar = window.confirm("¿Estás seguro de que querés eliminar esta venta?");
  if (!confirmar) return;

  try {
    const ventaRef = doc(db, "clientes", id, "ventas", ventaId);
    await deleteDoc(ventaRef);

    // Actualizar lista de ventas en pantalla
    setVentas((prev) => prev.filter((v) => v.id !== ventaId));
    setPagosPorVenta((prev) => {
      const actualizado = { ...prev };
      delete actualizado[ventaId];
      return actualizado;
    });
  } catch (error) {
    console.error("Error al eliminar la venta:", error);
    alert("Ocurrió un error al intentar eliminar la venta.");
  }
}

  if (!cliente) return <div style={{ padding: 20 }}>Cargando cliente...</div>;

  return (
  <div style={{ minHeight: "100vh", background: "#f5f7fa", padding: "30px 10px" }}>
    <div style={{
  background: "#f9f9f9",
  padding: 24,
  borderRadius: 12,
  marginBottom: 30,
  border: "1px solid #ddd",
  fontFamily: "Montserrat, sans-serif"
}}>
  <h2 style={{
    fontSize: 18,
    marginBottom: 16,
    color: "#294899"
  }}>
    Detalle del Cliente
  </h2>

  <p style={{ marginBottom: 8 }}><strong>Nombre:</strong> {cliente.nombre}</p>
  <p style={{ marginBottom: 8 }}><strong>Comercio:</strong> {cliente.comercio || "—"}</p>
  <p style={{ marginBottom: 8 }}><strong>Dirección:</strong> {cliente.direccion || "—"}</p>
  <p style={{ marginBottom: 8 }}><strong>Localidad:</strong> {cliente.localidad || "—"}</p>
  <p style={{ marginBottom: 8 }}><strong>DNI:</strong> {cliente.dni}</p>
  <p style={{ marginBottom: 8 }}><strong>Teléfono:</strong> {cliente.telefono}</p>
  {cliente.email && <p style={{ marginBottom: 8 }}><strong>Email:</strong> {cliente.email}</p>}
  {cliente.redesocial && <p style={{ marginBottom: 8 }}><strong>Red Social:</strong> {cliente.redesocial}</p>}
  <p style={{ marginBottom: 8 }}><strong>Cobrador asignado:</strong> {cliente.cobrador || "—"}</p>

  <select
    value={cliente.cobrador || ""}
    onChange={(e) => asignarCobrador(e.target.value)}
    style={{
      marginTop: 10,
      padding: "8px 12px",
      borderRadius: 8,
      border: "1px solid #ccc",
      width: "100%",
      maxWidth: 300,
      fontFamily: "Montserrat, sans-serif",
      fontSize: 14
    }}
  >
    <option value="">— Seleccionar cobrador —</option>
    {usuarios.map((user) => (
      <option key={user.id} value={user.nombre}>{user.nombre}</option>
    ))}
  </select>
</div>

      <h3>Ventas</h3>
      {ventas.length > 0 ? (
        <table
  style={{
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 20,
    background: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 0 8px rgba(0, 0, 0, 0.1)",
  }}
>
          <thead style={{ background: "#294899", color: "white", textAlign: "left" }}>
  <tr>
    <th style={{ padding: 10 }}>Producto</th>
    <th style={{ padding: 10 }}>Frecuencia</th>
    <th style={{ padding: 10 }}>Cuota</th>
    <th style={{ padding: 10 }}>Valor de la cuota</th>
    <th style={{ padding: 10 }}>Inicio</th>
    <th style={{ padding: 10 }}>Fin</th>
    <th style={{ padding: 10 }}>Vendedor</th>
    <th style={{ padding: 10 }}>Pagos</th>
    <th style={{ padding: 10 }}>Nuevo Pago</th>
    <th style={{ padding: 10 }}>Acciones</th>
  </tr>
</thead>
          <tbody>
            {ventas.map((v) => {
              const pagos = pagosPorVenta[v.id] || [];
              const totalPagado = pagos.reduce((a, p) => a + p.monto, 0);
              const cuotasPagadas = totalPagado / v.valorDiario;
              const mostrar = mostrarHistorial[v.id] || false;

              return (
                <tr key={v.id}>
<td style={{ padding: "8px 10px", borderBottom: "1px solid #eee" }}>
  {ventaEditando === v.id ? (
    <input
      value={valoresEditados.producto || ""}
      onChange={(e) =>
        setValoresEditados((prev: any) => ({ ...prev, producto: e.target.value }))
      }
    />
  ) : (
    v.producto
  )}
</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eee" }}>
  {ventaEditando === v.id ? (
    <select
      value={valoresEditados.frecuencia || ""}
      onChange={(e) =>
        setValoresEditados((prev: any) => ({ ...prev, frecuencia: e.target.value }))
      }
    >
      <option value="diaria">Diaria</option>
      <option value="semanal">Semanal</option>
      <option value="quincenal">Quincenal</option>
      <option value="mensual">Mensual</option>
    </select>
  ) : (
    v.frecuencia || "diaria"
  )}
</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eee" }}>
  {ventaEditando === v.id ? (
    <input
      type="number"
      value={valoresEditados.dias || ""}
      onChange={(e) =>
        setValoresEditados((prev: any) => ({ ...prev, dias: +e.target.value }))
      }
    />
  ) : (
    v.dias
  )}
</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eee" }}>
  {ventaEditando === v.id ? (
    <input
      type="number"
      value={valoresEditados.valorDiario || ""}
      onChange={(e) =>
        setValoresEditados((prev: any) => ({ ...prev, valorDiario: +e.target.value }))
      }
    />
  ) : (
    `$${v.valorDiario}`
  )}
</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eee" }}>
  {ventaEditando === v.id ? (
    <input
      type="date"
      value={valoresEditados.fechaInicio || ""}
      onChange={(e) =>
        setValoresEditados((prev: any) => ({ ...prev, fechaInicio: e.target.value }))
      }
    />
  ) : (
    v.fechaInicio
  )}
</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eee" }}>{v.fechaFin}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eee" }}>
  {ventaEditando === v.id ? (
    <input
      value={valoresEditados.vendedor || ""}
      onChange={(e) =>
        setValoresEditados((prev: any) => ({ ...prev, vendedor: e.target.value }))
      }
    />
  ) : (
    v.vendedor || "-"
  )}
</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eee" }}>
  {ventaEditando === v.id ? (
    <>
      <button onClick={() => setVentaEditando(null)} style={{ marginRight: 5 }}>
        Cancelar
      </button>
      <button onClick={() => guardarCambiosVenta()}>
        Guardar
      </button>
    </>
  ) : (
    <button onClick={() => {
      setVentaEditando(v.id);
      setValoresEditados({
        producto: v.producto,
        dias: v.dias,
        valorDiario: v.valorDiario,
        fechaInicio: v.fechaInicio,
        frecuencia: v.frecuencia,
        vendedor: v.vendedor,
      });
    }}>
      Editar
    </button>
  )}
  <button onClick={() => eliminarVenta(v.id)}>
    Eliminar
  </button>
</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eee" }}>
  {cuotasPagadas.toFixed(2)} / {v.dias} cuotas<br />
  Total: ${totalPagado.toLocaleString()}<br />
  Faltan: {(v.dias - cuotasPagadas).toFixed(2)} cuotas<br />
  <button onClick={() => setMostrarHistorial((prev) => ({ ...prev, [v.id]: !mostrar }))}>
    {mostrar ? "Ocultar" : "Ver más"}
  </button>
  {mostrar && (
    <ul style={{ paddingLeft: 16 }}>
      {pagos.map((p) => (
        <li key={p.id}>
          {p.fecha} {p.hora || ""} — ${p.monto.toLocaleString()} ({p.formaPago})
        </li>
      ))}
    </ul>
  )}
</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eee" }}>
  <input
    type="number"
    placeholder="Efectivo"
    value={montoMixto[v.id]?.efectivo || ""}
    onChange={(e) =>
      setMontoMixto((prev) => ({
        ...prev,
        [v.id]: {
          ...(prev[v.id] || {}),
          efectivo: +e.target.value,
          transferencia: prev[v.id]?.transferencia || 0,
        },
      }))
    }
    style={{ width: 80, marginBottom: 5 }}
  />
  <input
    type="number"
    placeholder="Transferencia"
    value={montoMixto[v.id]?.transferencia || ""}
    onChange={(e) =>
      setMontoMixto((prev) => ({
        ...prev,
        [v.id]: {
          ...(prev[v.id] || {}),
          transferencia: +e.target.value,
          efectivo: prev[v.id]?.efectivo || 0,
        },
      }))
    }
    style={{ width: 80, marginBottom: 5 }}
  />
  <button onClick={() => registrarPago(v.id, 0)}>
    Confirmar pago
  </button>
</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p>No hay ventas registradas.</p>
      )}

      {agregandoVenta ? (
        <div style={{ marginTop: 20 }}>
          <h4>Agregar Venta</h4>
          <input
            placeholder="Producto"
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            style={{ display: "block", marginBottom: 10, width: "100%" }}
          />
          <input
  placeholder="Vendedor"
  value={vendedor}
  onChange={(e) => setVendedor(e.target.value)}
  style={{ display: "block", marginBottom: 10, width: "100%" }}
/>
          <select
  value={frecuencia}
  onChange={(e) => setFrecuencia(e.target.value)}
  style={{ display: "block", marginBottom: 10, width: "100%" }}
>
  <option value="">Frecuencia de pago</option>
  <option value="diaria">Diaria</option>
  <option value="semanal">Semanal</option>
  <option value="quincenal">Quincenal</option>
  <option value="mensual">Mensual</option>
</select>
          <label style={{ marginBottom: 4, fontWeight: 500 }}>
  {frecuencia === "diaria"
    ? "Cantidad de días"
    : frecuencia === "semanal"
    ? "Cantidad de semanas"
    : frecuencia === "quincenal"
    ? "Cantidad de quincenas"
    : frecuencia === "mensual"
    ? "Cantidad de meses"
    : "Cantidad de cuotas"}
</label>
<input
  type="number"
  min={1}
  placeholder={
    frecuencia === "diaria"
      ? "Ej: 210"
      : frecuencia === "semanal"
      ? "Ej: 30"
      : frecuencia === "quincenal"
      ? "Ej: 15"
      : frecuencia === "mensual"
      ? "Ej: 7"
      : ""
  }
  value={dias}
  onChange={(e) => setDias(+e.target.value)}
  style={{ display: "block", marginBottom: 10, width: "100%" }}
/>

<label style={{ marginBottom: 4, fontWeight: 500 }}>
  {frecuencia === "diaria"
    ? "Valor de la cuota diaria"
    : frecuencia === "semanal"
    ? "Valor de la cuota semanal"
    : frecuencia === "quincenal"
    ? "Valor de la cuota quincenal"
    : frecuencia === "mensual"
    ? "Valor de la cuota mensual"
    : "Valor de la cuota"}
</label>
<input
  type="number"
  min={1}
  placeholder={
    frecuencia === "diaria"
      ? "Monto por día"
      : frecuencia === "semanal"
      ? "Monto por semana"
      : frecuencia === "quincenal"
      ? "Monto por quincena"
      : frecuencia === "mensual"
      ? "Monto por mes"
      : ""
  }
  value={valorDiario}
  onChange={(e) => setValorDiario(+e.target.value)}
  style={{ display: "block", marginBottom: 10, width: "100%" }}
/>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            style={{ display: "block", marginBottom: 10, width: "100%" }}
          />
          {frecuencia && (
  <div style={{ marginBottom: 10, color: "#2548B1" }}>
    <b>Recordá:</b>{" "}
    {frecuencia === "diaria"
      ? "Ingresá la cantidad de días y el valor de la cuota diaria."
      : frecuencia === "semanal"
      ? "Ingresá la cantidad de semanas y el valor de la cuota semanal (toda la semana, NO un solo día)."
      : frecuencia === "quincenal"
      ? "Ingresá la cantidad de quincenas y el valor de la cuota quincenal (dos semanas, NO un solo día)."
      : frecuencia === "mensual"
      ? "Ingresá la cantidad de meses y el valor de la cuota mensual (todo el mes, NO un solo día)."
      : ""}
  </div>
)}
          <button onClick={handleConfirmarVenta}>Confirmar Venta</button>{" "}
          <button onClick={() => setAgregandoVenta(false)}>Cancelar</button>
        </div>
      ) : (
        <button onClick={() => setAgregandoVenta(true)} style={{ marginTop: 20 }}>
          Agregar Venta
        </button>
      )}
    </div>
  );
}