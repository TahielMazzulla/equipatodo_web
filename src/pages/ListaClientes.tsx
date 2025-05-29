// src/pages/ListaClientes.tsx
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebaseConfig";

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

export default function ListaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [pagosPorCliente, setPagosPorCliente] = useState<Record<string, { estados: string[] }>>({});
  const [estadoPagoPorVenta, setEstadoPagoPorVenta] = useState<Record<string, string>>({});
  const [estadoPagos, setEstadoPagos] = useState<Record<string, string[]>>({});
  const [ventasPorCliente, setVentasPorCliente] = useState<Record<string, any[]>>({});

  useEffect(() => {
    async function fetchData() {
      const ref = collection(db, "clientes");
      const snap = await getDocs(ref);
      const lista = snap.docs.map((doc) => {
        const data = doc.data() as Omit<Cliente, "id">;
        return { id: doc.id, ...data };
      });
      setClientes(lista);
      // === Traer las ventas reales de cada cliente y guardarlas en el estado ===
const ventasPorCliente: Record<string, any[]> = {};
for (const cliente of lista) {
  const ventasSnap = await getDocs(collection(db, "clientes", cliente.id, "ventas"));
  ventasPorCliente[cliente.id] = ventasSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}
setVentasPorCliente(ventasPorCliente);
      // Calcular estado de cada venta
const calcularEstadoPagos = async () => {
  const nuevosEstados: Record<string, string> = {};

  for (const cliente of lista) {
    const ventasSnap = await getDocs(collection(db, "clientes", cliente.id, "ventas"));
    for (const ventaDoc of ventasSnap.docs) {
      const ventaId = ventaDoc.id;
      const venta = ventaDoc.data();
      const valorDiario = venta.valorDiario;

      const pagosSnap = await getDocs(collection(db, "clientes", cliente.id, "ventas", ventaId, "pagos"));
      const pagos = pagosSnap.docs.map(p => p.data());
      const hoy = new Date().toISOString().split("T")[0];
      const pagosHoy = pagos.filter(p => p.fecha === hoy);

      const montoTotalHoy = pagosHoy.reduce((acc, p) => acc + (p.monto || 0), 0);

      if (montoTotalHoy >= valorDiario) {
        nuevosEstados[ventaId] = "verde";
      } else if (montoTotalHoy > 0 && montoTotalHoy < valorDiario) {
        nuevosEstados[ventaId] = "amarillo";
      } else {
        nuevosEstados[ventaId] = "rojo";
      }
    }
  }

  setEstadoPagoPorVenta(nuevosEstados);
};

calcularEstadoPagos();
      const hoy = new Date().toISOString().split("T")[0];
const pagosCliente: Record<string, { estados: string[] }> = {};

for (const cliente of lista) {
  const ventasSnap = await getDocs(collection(db, "clientes", cliente.id, "ventas"));
  const estados: string[] = [];

  for (const venta of ventasSnap.docs) {
    const ventaData = venta.data();
    const valorDiario = ventaData.valorDiario;
    const pagosSnap = await getDocs(collection(db, "clientes", cliente.id, "ventas", venta.id, "pagos"));

    const pagosHoy = pagosSnap.docs
      .map((d) => d.data())
      .filter((p) => p.fecha === hoy);

    const totalHoy = pagosHoy.reduce((sum, p) => sum + p.monto, 0);

    if (totalHoy === 0) {
      estados.push("rojo");
    } else if (totalHoy < valorDiario) {
      estados.push("amarillo");
    } else {
      estados.push("verde");
    }
  }

  pagosCliente[cliente.id] = { estados };
}

setPagosPorCliente(pagosCliente);
    }
    fetchData();
  }, []);

  return (
    <div
  style={{
    minHeight: "100vh",
    background: "#f4f6fc",      // Un fondo muy claro, casi blanco
    padding: 32
  }}
>
      <h1 style={{
  margin: 0,
  color: "#2548B1",
  fontFamily: "Montserrat, Arial, sans-serif",
  fontWeight: 700,
  letterSpacing: "1.5px",
  fontSize: 32,
  textTransform: "uppercase",
  marginBottom: 28
}}>
  Lista de Clientes
</h1>
<div
  style={{
    background: "#29489910",
    padding: 18,
    margin: "20px 0 28px 0",
    border: "1px solid #29489955",
    borderRadius: 14,
    fontFamily: "'League Spartan', Montserrat, Arial, sans-serif",
    color: "#294899"
  }}
>
  <strong style={{ fontWeight: 700, fontSize: 18, letterSpacing: "0.5px" }}>
    Pagos programados para HOY:
  </strong>
  <ul style={{ margin: "14px 0 0 18px", fontSize: 16 }}>
    {clientes.flatMap(cliente => {
      const ventas = ventasPorCliente[cliente.id] || [];
      return ventas
        .filter((venta) => {
          if (!venta.frecuencia) return false;
          const hoy = new Date();
          const fechaInicio = new Date(venta.fechaInicio);

          // UTC: evitamos problemas de desfase horario
          const hoyDia = hoy.getUTCDate();
          const hoyMes = hoy.getUTCMonth();
          const hoyAnio = hoy.getUTCFullYear();
          const inicioDia = fechaInicio.getUTCDate();
          const inicioMes = fechaInicio.getUTCMonth();
          const inicioAnio = fechaInicio.getUTCFullYear();

          // --- Semanal ---
          if (venta.frecuencia === "semanal") {
            return hoy.getUTCDay() === fechaInicio.getUTCDay();
          }
          // --- Quincenal (día del mes y +15 días después, sin pasarse del mes) ---
          if (venta.frecuencia === "quincenal") {
            return (
              (hoyDia === inicioDia && hoyMes === inicioMes && hoyAnio === inicioAnio) ||
              (hoyDia === ((inicioDia + 15) > 28 ? (inicioDia + 15 - 28) : inicioDia + 15))
            );
          }
          // --- Mensual (mismo día del mes, cualquier mes) ---
          if (venta.frecuencia === "mensual") {
            return hoyDia === inicioDia;
          }
          return false;
        })
        .map((venta, idx) => (
          <li key={cliente.id + "-" + venta.id}>
            Cliente: <b>{cliente.nombre}</b> — Producto: <b>{venta.producto}</b>
            {venta.frecuencia ? ` (${venta.frecuencia})` : ""}
            {cliente.cobrador && <> — Cobrador: <b>{cliente.cobrador}</b></>}
          </li>
        ));
    })}
  </ul>
</div>

      <div style={{
  width: "100%",
  display: "flex",
  justifyContent: "center",
  margin: "20px 0"
}}>
  <input
    type="text"
    placeholder="Buscar cliente por nombre..."
    value={busqueda}
    onChange={(e) => setBusqueda(e.target.value)}
    style={{
      width: "100%",
      maxWidth: 350,
      padding: "13px 14px",
      borderRadius: 9,
      border: "1.8px solid #2548B1", // color azul Equipatodo
      fontSize: 17,
      outline: "none",
      boxShadow: "0 2px 10px #2548b110",
      fontFamily: "League Spartan, Montserrat, Arial, sans-serif"
    }}
  />
</div>

      {clientes.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {clientes
            .filter((cliente) =>
              (cliente.nombre || "").toLowerCase().includes(busqueda.toLowerCase())
            )
            .map((cliente) => (
              <li key={cliente.id} style={{ marginBottom: 12 }}>
                <Link to={`/cliente/${cliente.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
  background: "white",
  border: "1.5px solid #2548B1",
  borderRadius: 14,
  padding: 18,
  boxShadow: "0 3px 16px 0 #2548b129",
  transition: "box-shadow 0.2s, border 0.2s",
  marginBottom: 8,
  cursor: "pointer",
}}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <strong
  style={{
    fontFamily: "'League Spartan', Arial, sans-serif",
    fontWeight: 700,
    fontSize: 21,
    letterSpacing: "0.5px",
    color: "#2548B1",
    textTransform: "uppercase",
    marginRight: 10,
  }}
>
  {cliente.nombre}
</strong>
  <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
  {estadoPagos[cliente.id]?.map((estado, idx) => (
    <div
      key={idx}
      style={{
        width: 12,
        height: 12,
        backgroundColor:
          estado === "verde"
            ? "#4caf50"
            : estado === "amarillo"
            ? "#ffeb3b"
            : "#f44336",
        borderRadius: 2,
      }}
      title={`Venta ${idx + 1}: ${estado}`}
    />
  ))}
</div>
  <div style={{ display: "flex", gap: 4 }}>
    {pagosPorCliente[cliente.id]?.estados.map((estado, i) => (
      <div
        key={i}
        style={{
          width: 12,
          height: 12,
          borderRadius: 2,
          backgroundColor:
            estado === "verde"
              ? "green"
              : estado === "amarillo"
              ? "gold"
              : "red",
        }}
      />
    ))}
  </div>
</div>
                    <p
  style={{
    margin: "4px 0",
    fontFamily: "'League Spartan', Arial, sans-serif",
    fontSize: 16,
    color: "#4A4A4A"
  }}
>
  Teléfono: {cliente.telefono}
</p>
<p
  style={{
    margin: "4px 0",
    fontFamily: "'League Spartan', Arial, sans-serif",
    fontSize: 16,
    color: "#4A4A4A"
  }}
>
  Dirección: {cliente.direccion}
</p>
<p
  style={{
    margin: "4px 0",
    fontFamily: "'League Spartan', Arial, sans-serif",
    fontSize: 16,
    color: "#4A4A4A"
  }}
>
  Localidad: {cliente.localidad || "-"}
</p>
                  </div>
                </Link>
              </li>
            ))}
        </ul>
      ) : (
        <p>No hay clientes aún.</p>
      )}
    </div>
  );
}