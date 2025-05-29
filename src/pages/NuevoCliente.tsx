// src/pages/NuevoCliente.tsx
import { useState } from "react";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

export default function NuevoCliente() {
  const [nombre, setNombre] = useState("");
  const [comercio, setComercio] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [email, setEmail] = useState("");
  const [redsocial, setRedSocial] = useState("");

  const navigate = useNavigate();

  async function handleAgregarCliente() {
    // Validar campos obligatorios
    if (!nombre || !dni || !telefono || !direccion) {
      alert("Por favor completa nombre, DNI, teléfono y dirección.");
      return;
    }

    const nuevoCliente = {
      nombre,
      comercio,
      dni,
      telefono,
      direccion,
      localidad,
      email,
      redesocial: redsocial,
      creadoEn: serverTimestamp(),
    };

    await addDoc(collection(db, "clientes"), nuevoCliente);
    alert("Cliente agregado exitosamente.");
    navigate("/lista");
  }

const inputEstilo = {
  width: "100%",
  padding: "12px 14px",
  border: "1.6px solid #294899",
  borderRadius: 7,
  fontSize: 17,
  outline: "none",
  fontFamily: "inherit",
  fontWeight: 500,
  background: "white",
  color: "#294899",
};

  return (
  <div
    style={{
      minHeight: "100vh",
      background: "#fff", // Fondo blanco
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <div
      style={{
        background: "#f8fafd", // Un blanco casi gris claro (queda lindo)
        borderRadius: "18px",
        boxShadow: "0 3px 18px #29489919",
        padding: "36px 32px 32px 32px",
        maxWidth: 410,
        width: "100%",
        margin: "40px 0",
      }}
    >
      <h1
        style={{
          color: "#294899",
          textAlign: "center",
          fontFamily: "League Spartan, Arial, sans-serif",
          letterSpacing: 1,
          fontWeight: 700,
          fontSize: 26,
          marginBottom: 26,
          textTransform: "uppercase",
        }}
      >
        Agregar Nuevo Cliente
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <input
          type="text"
          placeholder="Nombre *"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          style={inputEstilo}
        />
        <input
          type="text"
          placeholder="Nombre del Comercio"
          value={comercio}
          onChange={e => setComercio(e.target.value)}
          style={inputEstilo}
        />
        <input
          type="text"
          placeholder="DNI *"
          value={dni}
          onChange={e => setDni(e.target.value)}
          style={inputEstilo}
        />
        <input
          type="text"
          placeholder="Teléfono *"
          value={telefono}
          onChange={e => setTelefono(e.target.value)}
          style={inputEstilo}
        />
        <input
          type="text"
          placeholder="Dirección del Comercio *"
          value={direccion}
          onChange={e => setDireccion(e.target.value)}
          style={inputEstilo}
        />
        <input
          type="text"
          placeholder="Localidad"
          value={localidad}
          onChange={e => setLocalidad(e.target.value)}
          style={inputEstilo}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputEstilo}
        />
        <input
          type="text"
          placeholder="Red Social"
          value={redsocial}
          onChange={e => setRedSocial(e.target.value)}
          style={inputEstilo}
        />
        <button
          onClick={handleAgregarCliente}
          style={{
            width: "100%",
            padding: "12px",
            background: "#294899",
            color: "white",
            fontWeight: 700,
            border: "none",
            borderRadius: 7,
            fontSize: 18,
            marginTop: 10,
            cursor: "pointer",
            letterSpacing: "1px",
            transition: "background 0.2s",
          }}
        >
          Agregar Cliente
        </button>
      </div>
    </div>
  </div>
  );
}