// src/pages/MigrarPagos.tsx
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, addDoc, query } from "firebase/firestore";

export default function MigrarPagos() {
  const [estado, setEstado] = useState("Esperando...");
  const [copiados, setCopiados] = useState(0);

  async function migrar() {
    setEstado("Buscando clientes...");
    const clientesSnap = await getDocs(collection(db, "clientes"));

    let count = 0;
    for (const clienteDoc of clientesSnap.docs) {
      const ventasSnap = await getDocs(collection(db, "clientes", clienteDoc.id, "ventas"));
      for (const ventaDoc of ventasSnap.docs) {
        const pagosSnap = await getDocs(collection(db, "clientes", clienteDoc.id, "ventas", ventaDoc.id, "pagos"));
        for (const pagoDoc of pagosSnap.docs) {
          const pagoData = pagoDoc.data();

          // Ver si ya existe (por fecha, monto, cliente y venta)
          const q = query(
            collection(db, "pagos")
          );
          const ya = await getDocs(q);
          const existe = ya.docs.some(p => 
            p.data().fecha === pagoData.fecha &&
            p.data().monto === pagoData.monto &&
            p.data().clienteId === clienteDoc.id &&
            p.data().ventaId === ventaDoc.id
          );
          if (existe) continue;

          await addDoc(collection(db, "pagos"), {
            ...pagoData,
            clienteId: clienteDoc.id,
            ventaId: ventaDoc.id,
            cobrador: clienteDoc.data().cobrador || "",
            clienteNombre: clienteDoc.data().nombre || "",
            producto: ventaDoc.data().producto || "",
          });
          count++;
        }
      }
    }
    setCopiados(count);
    setEstado("¡Listo! Pagos migrados: " + count);
  }

  return (
    <div style={{padding: 40}}>
      <h1>Migrar pagos viejos a /pagos</h1>
      <p>{estado}</p>
      <button onClick={migrar}>Migrar pagos</button>
      {copiados > 0 && <p style={{color: "green"}}>Total copiados: {copiados}</p>}
      <p style={{color: "#c00"}}>⚠️ Esta herramienta es temporal, borrala después de migrar.</p>
    </div>
  );
}