import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const rol = usuario?.rol;
  if (rol === "cobrador") return null;

  const handleLogout = () => {
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  return (
    <div
      style={{
        background: "#2548B1", // azul marca
        color: "white",
        padding: "12px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "League Spartan, sans-serif",
        fontWeight: "bold",
        fontSize: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
      }}
    >
      {/* LOGO */}
      <div style={{ display: "flex", alignItems: "center" }}>
  <div style={{ height: 45, overflow: "hidden", display: "flex", alignItems: "center" }}>
    <img
      src="/logo_navbar.png"
      alt="Logo Equipatodo"
      style={{
        height: 80,
        marginTop: -6,
      }}
    />
  </div>
</div>

      {/* LINKS */}
      <div style={{ display: "flex", gap: 24 }}>
        <Link to="/" style={{ color: "white", textDecoration: "none" }}>
          Nuevo Cliente
        </Link>
        <Link to="/lista" style={{ color: "white", textDecoration: "none" }}>
          Lista de Clientes
        </Link>
        <Link to="/resumen" style={{ color: "white", textDecoration: "none" }}>
          Resumen del Día
        </Link>
      </div>

      {/* BOTÓN CERRAR SESIÓN */}
      <button
        onClick={handleLogout}
        style={{
          background: "transparent",
          border: "2px solid white",
          color: "white",
          padding: "6px 14px",
          borderRadius: 6,
          fontWeight: "bold",
          cursor: "pointer",
          transition: "background 0.3s"
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#ffffff22")}
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
      >
        Cerrar sesión
      </button>
    </div>
  );
}