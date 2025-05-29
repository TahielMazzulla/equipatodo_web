// src/components/ProtectedRoute.tsx
import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
  roleAllowed: string;
}

export default function ProtectedRoute({ children, roleAllowed }: ProtectedRouteProps) {
  const usuarioStr = localStorage.getItem("usuario");
  if (!usuarioStr) return <Navigate to="/login" replace />;

  const usuario = JSON.parse(usuarioStr);

  if (usuario.rol !== roleAllowed) {
    // Si es cobrador, lo mandamos a su panel
    if (usuario.rol === "cobrador") return <Navigate to="/panel-cobrador" replace />;
    // Si es admin y quiere ir a panel de cobrador, lo mandamos a /lista
    if (usuario.rol === "admin") return <Navigate to="/lista" replace />;
    // Otros casos: al login
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}