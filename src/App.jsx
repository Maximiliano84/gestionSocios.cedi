import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Socios from "@/pages/Socios";
import SocioDetalle from "@/pages/SocioDetalle";
import Pagos from "@/pages/Pagos";
import Deudores from "@/pages/Deudores";
import Actividades from "@/pages/Actividades";
import AlumnoActividadDetalle from "@/pages/AlumnoActividadDetalle";
import Configuracion from "@/pages/Configuracion";
import CarnetPublico from "@/pages/CarnetPublico";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/carnet/:id" element={<CarnetPublico />} />
            <Route path="/carnet/:tipo/:id" element={<CarnetPublico />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<ProtectedRoute roles={["admin","secretaria","comision"]}><Dashboard /></ProtectedRoute>} />
              <Route path="/socios" element={<Socios />} />
              <Route path="/socios/:id" element={<SocioDetalle />} />
              <Route
                path="/pagos"
                element={<ProtectedRoute roles={["admin","secretaria","comision"]}><Pagos /></ProtectedRoute>}
              />
              <Route
                path="/deudores"
                element={<ProtectedRoute roles={["admin","secretaria","comision"]}><Deudores /></ProtectedRoute>}
              />
              <Route
                path="/actividades"
                element={<ProtectedRoute roles={["admin","secretaria","comision"]}><Actividades /></ProtectedRoute>}
              />
              <Route
                path="/actividades/alumnos/:id"
                element={<ProtectedRoute roles={["admin","secretaria","comision"]}><AlumnoActividadDetalle /></ProtectedRoute>}
              />
              <Route
                path="/configuracion"
                element={<ProtectedRoute roles={["admin"]}><Configuracion /></ProtectedRoute>}
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
