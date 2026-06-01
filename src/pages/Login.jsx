import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function Login() {
  const { user, login, resetPassword, error, setError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setResetMessage("");
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  const onResetPassword = async () => {
    setResetMessage("");
    setResetLoading(true);
    const result = await resetPassword(email);
    if (result?.ok) {
      setError("");
      setResetMessage(result.message);
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-blue-700 grid place-items-center text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>CEDI LOS 15</h1>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Gestión de Socios</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            Bienvenido
          </h2>
          <p className="text-slate-600 mb-8">Ingresá tus credenciales para acceder al panel.</p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu email autorizado"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Contraseña</Label>
                <button
                  type="button"
                  onClick={onResetPassword}
                  disabled={resetLoading}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-60"
                >
                  {resetLoading ? "Enviando..." : "¿Olvidaste tu contraseña?"}
                </button>
              </div>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1.5"
              />
            </div>
            {resetMessage && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                {resetMessage}
              </div>
            )}
            {error && (
              <div data-testid="login-error" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white h-11 text-sm font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar"}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800">
            <p className="font-semibold mb-1">Acceso con Firebase</p>
            <p>Ingresá con un usuario creado en Firebase Authentication. Los permisos se leen desde Firestore en la colección usuarios.</p>
          </div>
        </div>
      </div>

      {/* Right side - blue panel */}
      <div className="hidden lg:flex flex-1 bg-blue-700 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3), transparent 40%),
                              radial-gradient(circle at 80% 70%, rgba(255,255,255,0.2), transparent 40%)`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="text-xs uppercase tracking-[0.2em] opacity-80">Club de Barrio</div>
          <div>
            <h3 className="text-5xl font-bold leading-tight mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
              El club, ordenado.
            </h3>
            <p className="text-lg opacity-90 max-w-md">
              Socios, cuotas, pagos, deudores, carnets digitales y validación por QR — todo en un solo lugar.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-3xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>+20</div>
              <div className="opacity-80">Socios</div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>7</div>
              <div className="opacity-80">Categorías</div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>QR</div>
              <div className="opacity-80">Carnets digitales</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
