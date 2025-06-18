import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import NuevoCliente from "./pages/NuevoCliente";
import ListaClientes from "./pages/ListaClientes";
import ClienteDetalle from "./pages/ClienteDetalle";
import ResumenDia from "./pages/ResumenDia";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import PanelCobrador from "./pages/PanelCobrador";
import MigrarPagos from "./pages/MigrarPagos";
import './App.css';


// Declaralo así arriba del Header:
interface HeaderProps {
  usuario?: { nombre?: string }
}

// Y usá el tipo en el componente:
function Header({ usuario }: HeaderProps) {
  // ...resto del componente
  return (
    <div className="header-navbar">
      <div className="logo-area">
        <span className="titulo-app">EQUIPA <span className="texto-gris">TODO</span></span>
      </div>
      {usuario?.nombre && (
        <span style={{fontWeight:600}}>Cobrador: {usuario.nombre}</span>
      )}
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const mostrarNavbar = location.pathname !== "/login";

  return (
    <>
      {mostrarNavbar && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rutas solo para ADMIN */}
        <Route
          path="/"
          element={
            <ProtectedRoute roleAllowed="admin">
              <NuevoCliente />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lista"
          element={
            <ProtectedRoute roleAllowed="admin">
              <ListaClientes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cliente/:id"
          element={
            <ProtectedRoute roleAllowed="admin">
              <ClienteDetalle />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resumen"
          element={
            <ProtectedRoute roleAllowed="admin">
              <ResumenDia />
            </ProtectedRoute>
          }
        />
        <Route
  path="/migrar-pagos"
  element={
    <ProtectedRoute roleAllowed="admin">
      <MigrarPagos />
    </ProtectedRoute>
  }
/>

        {/* Ruta solo para COBRADOR */}
        <Route
          path="/panel-cobrador"
          element={
            <ProtectedRoute roleAllowed="cobrador">
              <PanelCobrador />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}



export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}