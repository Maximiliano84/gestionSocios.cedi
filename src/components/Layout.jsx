import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth, hasRole } from "@/context/AuthContext";
import {
  LayoutDashboard, Users, Receipt, AlertCircle,
  Settings, LogOut, Menu, ShieldCheck, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const NAV = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, roles: ["admin","secretaria","comision"], end: true },
  { to: "/socios", label: "Socios / Carnets", icon: Users, roles: ["admin","secretaria","comision","entrenador"] },
  { to: "/pagos", label: "Pagos", icon: Receipt, roles: ["admin","secretaria","comision"] },
  { to: "/deudores", label: "Deudores", icon: AlertCircle, roles: ["admin","secretaria","comision"] },
  { to: "/actividades", label: "Actividades", icon: Activity, roles: ["admin","secretaria","comision"] },
  { to: "/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [club, setClub] = useState({ nombreClub: "CEDI LOS 15", logoUrl: "/logo-cedi.png" });

  useEffect(() => {
    api.get("/config").then(({ data }) => setClub({ nombreClub: data.nombreClub, logoUrl: data.logoUrl || "/logo-cedi.png" })).catch(() => {});
  }, []);

  const roleLabel = {
    admin: "Administrador",
    secretaria: "Secretaria",
    comision: "Comisión",
    entrenador: "Entrenador",
  }[user?.role] || user?.role;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-200 fixed h-screen">
        <SidebarContent user={user} onNavigate={() => {}} club={club} />
        <div className="p-4 border-t border-slate-200">
          <button
            data-testid="logout-button"
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-slate-700 hover:bg-slate-100 text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative w-72 bg-white h-full flex flex-col shadow-xl">
            <SidebarContent user={user} onNavigate={() => setOpen(false)} club={club} />
            <div className="p-4 border-t border-slate-200">
              <button
                data-testid="logout-button-mobile"
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-slate-700 hover:bg-slate-100 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 md:px-8 h-16">
            <button
              data-testid="open-sidebar-button"
              className="lg:hidden p-2 -ml-2 text-slate-700"
              onClick={() => setOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              {club.logoUrl ? (
                <img src={club.logoUrl} alt="logo" className="w-10 h-10 rounded-md object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-blue-700 grid place-items-center text-white font-bold text-sm">15</div>
              )}
              <span className="font-bold text-slate-900">{club.nombreClub}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold text-slate-900" data-testid="topbar-user-name">{user?.name}</span>
                <span className="text-xs text-slate-500">{roleLabel}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-700 text-white grid place-items-center font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="relative flex-1 p-4 md:p-8 overflow-hidden">
          <img
            src={club.logoUrl || "/logo-cedi.png"}
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none fixed right-[-80px] bottom-[-90px] w-[320px] md:w-[470px] opacity-[0.035] blur-[0.2px] z-0"
          />
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ user, onNavigate, club }) {
  return (
    <>
      <div className="px-6 py-6 border-b border-slate-200">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-3">
          {club?.logoUrl ? (
            <img src={club.logoUrl} alt="logo" className="w-16 h-16 rounded-xl object-contain bg-slate-50" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-blue-700 grid place-items-center text-white font-bold">
              <ShieldCheck className="w-7 h-7" />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>{club?.nombreClub || "CEDI LOS 15"}</h1>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">Gestión de Socios</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.filter(n => hasRole(user, ...n.roles)).map((n) => {
          const Icon = n.icon;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={onNavigate}
              data-testid={`nav-${n.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {n.label}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
