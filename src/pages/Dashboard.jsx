import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  Dumbbell,
  FileWarning,
  Loader2,
  Receipt,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import api from "@/lib/api";
import { formatMoney, formatDate, formatMesYM } from "@/utils/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hasRole, useAuth } from "@/context/AuthContext";
import RegistrarPagoDialog from "@/components/RegistrarPagoDialog";
import RegistrarPagoActividadDialog from "@/components/RegistrarPagoActividadDialog";

function formatMesesPago(pago) {
  if (pago?.esPagoAnual || pago?.tipoPago === "anual") return "PAGO ANUAL";

  const meses = Array.isArray(pago?.meses) ? pago.meses : [];

  if (
    String(pago?.tipoLabel || "").toLowerCase() === "socio" &&
    meses.length === 12
  ) {
    return "PAGO ANUAL";
  }

  if (meses.length > 0) {
    return meses.map(formatMesYM).join(", ");
  }

  if (pago?.mes) {
    return formatMesYM(pago.mes);
  }

  return "-";
}

function getPagoTipo(pago) {
  const tipo = String(pago?.tipoLabel || pago?.tipo || "Socio").toLowerCase();
  return tipo === "actividad" ? "Actividad" : "Socio";
}

function pagoTipoBadgeClass(pago) {
  return getPagoTipo(pago) === "Actividad"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-blue-100 text-blue-800";
}

function kpiIconClass(color) {
  const classes = {
    blue: "bg-blue-50 text-blue-700",
    slate: "bg-slate-50 text-slate-700",
    red: "bg-red-50 text-red-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return classes[color] || classes.slate;
}

export default function Dashboard() {
  const { user } = useAuth();
  const canManage = hasRole(user, "admin", "secretaria");

  const [data, setData] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [socios, setSocios] = useState([]);
  const [alumnos, setAlumnos] = useState([]);

  const [choiceOpen, setChoiceOpen] = useState(false);
  const [pagoSocioOpen, setPagoSocioOpen] = useState(false);
  const [pagoActividadOpen, setPagoActividadOpen] = useState(false);

  const load = async () => {
    const { data } = await api.get("/dashboard");
    setData(data);
  };

  const loadPaymentData = async () => {
    if (!canManage) return;

    const [cfgRes, sociosRes, alumnosRes] = await Promise.all([
      api.get("/config"),
      api.get("/socios"),
      api.get("/actividades/alumnos"),
    ]);

    setCfg(cfgRes.data);
    setSocios(sociosRes.data || []);
    setAlumnos(alumnosRes.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadPaymentData();
  }, [canManage]);

  const refreshAfterPayment = () => {
    setPagoSocioOpen(false);
    setPagoActividadOpen(false);
    load();
    loadPaymentData();
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando inicio...
      </div>
    );
  }

  const ultimosPagos = [...(data.ultimosPagos || [])]
    .sort((a, b) => {
      const fechaA = new Date(a.fechaPago || a.creadoEn || 0).getTime();
      const fechaB = new Date(b.fechaPago || b.creadoEn || 0).getTime();
      return fechaB - fechaA;
    })
    .slice(0, 8);

  const kpis = [
    {
      label: "Socios activos",
      value: data.sociosActivos,
      icon: Users,
      color: "blue",
      testid: "kpi-socios-activos",
    },
    {
      label: "Socios inactivos",
      value: data.sociosInactivos,
      icon: Users,
      color: "slate",
      testid: "kpi-socios-inactivos",
    },
    {
      label: "Con deuda",
      value: data.sociosConDeuda,
      icon: AlertCircle,
      color: "red",
      testid: "kpi-socios-deuda",
    },
    {
      label: "Recaudación del mes",
      value: formatMoney(data.recaudacionMes),
      icon: TrendingUp,
      color: "emerald",
      testid: "kpi-recaudacion",
    },
    {
      label: "Pagos del mes",
      value: data.pagosMes,
      icon: Receipt,
      color: "amber",
      testid: "kpi-pagos-mes",
    },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1
          className="text-3xl md:text-4xl font-bold text-slate-900"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Hola, {user?.name?.split(" ")[0] || "Bienvenido"}.
        </h1>
        <p className="text-slate-500 mt-1">
          Resumen del club al {formatMesYM(data.mesActual)}.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            data-testid={k.testid}
            className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-md grid place-items-center ${kpiIconClass(
                  k.color
                )}`}
              >
                <k.icon className="w-4 h-4" />
              </div>
            </div>

            <div
              className="text-2xl font-bold text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {k.value}
            </div>

            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            className="bg-blue-700 hover:bg-blue-800"
            data-testid="quick-add-socio"
          >
            <Link to="/socios?nuevo=1">
              <UserPlus className="w-4 h-4 mr-2" />
              Agregar socio
            </Link>
          </Button>

          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setChoiceOpen(true)}
            data-testid="quick-add-pago"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Registrar pago
          </Button>

          <Button
            asChild
            className="border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            data-testid="quick-deudores"
          >
            <Link to="/deudores">
              <FileWarning className="w-4 h-4 mr-2" />
              Ver deudores
            </Link>
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Últimos pagos</h3>

            <Link
              to="/pagos"
              className="text-sm text-blue-700 hover:underline flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">
                    Fecha
                  </th>
                  <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">
                    Tipo
                  </th>
                  <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">
                    Nombre
                  </th>
                  <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">
                    Meses
                  </th>
                  <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">
                    Monto
                  </th>
                </tr>
              </thead>

              <tbody>
                {ultimosPagos.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-slate-500 text-sm"
                    >
                      Sin pagos aún.
                    </td>
                  </tr>
                )}

                {ultimosPagos.map((p) => {
                  const tipoPago = getPagoTipo(p);

                  return (
                    <tr key={p.id} className="border-t border-slate-200">
                      <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {formatDate(p.fechaPago)}
                      </td>

                      <td className="px-5 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${pagoTipoBadgeClass(
                            p
                          )}`}
                        >
                          {tipoPago}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-sm font-medium text-slate-900">
                        {tipoPago === "Socio" && p.socioNumero
                          ? `#${p.socioNumero} `
                          : ""}
                        {p.socioNombre || p.persona || "-"}
                      </td>

                      <td className="px-5 py-3 text-sm text-slate-600">
                        {formatMesesPago(p)}
                      </td>

                      <td className="px-5 py-3 text-sm font-semibold text-slate-900">
                        {formatMoney(p.monto)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">
              Categorías con más deuda
            </h3>
          </div>

          <div className="p-5 space-y-3">
            {data.categoriasConDeuda.length === 0 && (
              <p className="text-sm text-slate-500">
                Sin deudas registradas. 🎉
              </p>
            )}

            {data.categoriasConDeuda.map((c, i) => (
              <div key={c.categoria} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 grid place-items-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    Categoría {c.categoria}
                  </span>
                </div>

                <span className="text-sm font-semibold text-red-600">
                  {formatMoney(c.deuda)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>¿Qué pago querés registrar?</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setChoiceOpen(false);
                setPagoSocioOpen(true);
              }}
              className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-100"
            >
              <ShieldCheck className="w-6 h-6 text-blue-700 mb-3" />
              <div className="font-bold text-slate-900">Socio / Fútbol</div>
              <p className="text-sm text-slate-600 mt-1">
                Registrar cuota social de un socio del club.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setChoiceOpen(false);
                setPagoActividadOpen(true);
              }}
              className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              <Dumbbell className="w-6 h-6 text-emerald-700 mb-3" />
              <div className="font-bold text-slate-900">Actividad</div>
              <p className="text-sm text-slate-600 mt-1">
                Registrar cuota de patín, taekwondo, telas, zumba u otra
                actividad.
              </p>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <RegistrarPagoDialog
        open={pagoSocioOpen}
        onOpenChange={setPagoSocioOpen}
        socio={null}
        allSocios={socios}
        cfg={cfg}
        onSaved={refreshAfterPayment}
      />

      <RegistrarPagoActividadDialog
        open={pagoActividadOpen}
        onOpenChange={setPagoActividadOpen}
        alumno={null}
        allAlumnos={alumnos}
        onSaved={refreshAfterPayment}
      />
    </div>
  );
}