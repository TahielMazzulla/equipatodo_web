import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDocs, collection, query, where } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

// El color azul de tu logo (del manual de marca)
const AZUL_EQUIPATODO = "#294899";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const usuariosRef = collection(db, "usuarios");
      const q = query(usuariosRef, where("email", "==", email));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setError("Usuario no encontrado en Firestore.");
        return;
      }
      const usuarioValido = { id: snapshot.docs[0].id, ...(snapshot.docs[0].data() as any) };
      localStorage.setItem("usuario", JSON.stringify(usuarioValido));
      if (usuarioValido.rol === "admin") {
        navigate("/lista");
      } else if (usuarioValido.rol === "cobrador") {
        navigate("/panel-cobrador");
      } else {
        setError("Tu usuario no tiene rol asignado.");
      }
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError("Ocurrió un error. Intenta más tarde.");
      }
    }
  }

  return (
  <div
    style={{
      minHeight: "100vh",
      minWidth: "100vw",
      backgroundImage: `url("/fondo_login.png")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <form
      onSubmit={handleLogin}
      style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: 15,
        padding: 32,
        boxShadow: "0 6px 32px 0 #2548b175",
        minWidth: 320,
        maxWidth: 360,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backdropFilter: "blur(2px)",
      }}
    >
      <h2
        style={{
          color: "#2548B1",
          fontWeight: "bold",
          marginBottom: 18,
          fontFamily: "Montserrat, Arial, sans-serif",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        INICIAR SESIÓN
      </h2>
      <div style={{ width: "100%", marginBottom: 16 }}>
        <label style={{ color: "#2548B1", fontWeight: 600, marginBottom: 4, display: "block" }}>
          Correo electrónico
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1.5px solid #2548B1`,
            borderRadius: 7,
            fontSize: 16,
            outline: "none",
            marginBottom: 2,
          }}
        />
      </div>
      <div style={{ width: "100%", marginBottom: 20 }}>
        <label style={{ color: "#2548B1", fontWeight: 600, marginBottom: 4, display: "block" }}>
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1.5px solid #2548B1`,
            borderRadius: 7,
            fontSize: 16,
            outline: "none",
          }}
        />
      </div>
      {error && <p style={{ color: "#f44", marginBottom: 12 }}>{error}</p>}
      <button
        type="submit"
        style={{
          width: "100%",
          padding: "11px",
          background: "#2548B1",
          color: "white",
          fontWeight: "bold",
          border: "none",
          borderRadius: 7,
          fontSize: 17,
          letterSpacing: "1px",
          cursor: "pointer",
          marginTop: 8,
          transition: "background 0.2s",
        }}
      >
        Iniciar sesión
      </button>
    </form>
  </div>
);
}