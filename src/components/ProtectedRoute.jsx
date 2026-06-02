import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-10 text-center text-slate-600">
        <h2 className="text-2xl font-semibold mb-2">Acceso denegado</h2>
        <p>No tienes permisos para ver esta sección.</p>
      </div>
    );
  }
  return children;
}
