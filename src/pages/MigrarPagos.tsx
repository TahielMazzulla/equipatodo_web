import React, { useState } from "react";
import { getDocs, collection, addDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";


export default function MigrarPagos() {
  const [status, setStatus] = useState<string>("");

  const handleMigrar = async () => {
    setStatus("Migrando...");
    try {
      // Buscar todos los pagos en colecciones anidadas
      const clientesSnap = await getDocs(collection(db, "clientes"));
      let totalPagos = 0;
      for (const clienteDoc of clientesSnap.docs) {
        const ventasSnap = await getDocs(collection(db, "clientes", clienteDoc.id, "ventas"));
        for (const ventaDoc of ventasSnap.docs) {
          const pagosSnap = await getDocs(collection(db, "clientes", clienteDoc.id, "ventas", ventaDoc.id, "pagos"));
          for (const pagoDoc of pagosSnap.docs) {
            const pagoData = pagoDoc.data();
            // Verificá si ya existe el pago (por ejemplo, por fecha+hora+cliente)
            // Si no existe, agregalo a la colección global
            await addDoc(collection(db, "pagos"), {
              ...pagoData,
              clienteId: clienteDoc.id,
              ventaId: ventaDoc.id,
              clienteNombre: clienteDoc.data().nombre || "",
              producto: ventaDoc.data().producto || "",
              cobrador: clienteDoc.data().cobrador || "",
            });
            totalPagos++;
          }
        }
      }
      setStatus(`¡Listo! Migrados ${totalPagos} pagos.`);
    } catch (e) {
      setStatus("Ocurrió un error en la migración.");
      console.error(e);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Migrar pagos antiguos</h1>
      <button onClick={handleMigrar} style={{ padding: 18, borderRadius: 8, fontSize: 18, background: "#294899", color: "#fff", fontWeight: 700 }}>
        Migrar pagos a /pagos
      </button>
      <p style={{ marginTop: 25 }}>{status}</p>
      <div style={{ marginTop: 40, color: "#555" }}>
        <b>¡CUIDADO!</b> No hagas click dos veces.  
        <br />El proceso puede demorar unos segundos. Solo migrá una vez.
      </div>
    </div>
  );
}