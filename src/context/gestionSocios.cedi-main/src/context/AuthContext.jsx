import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase";

const AuthContext = createContext(null);

function cleanEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

function normalizeRole(role = "") {
  const value = String(role || "").trim().toLowerCase();
  const rolesMap = {
    administrador: "admin",
    admin: "admin",
    secretaria: "secretaria",
    secretaría: "secretaria",
    comision: "comision",
    comisión: "comision",
    entrenador: "entrenador",
    consulta: "entrenador",
  };

  return rolesMap[value] || value;
}

function publicFirestoreProfile(firebaseUser, data) {
  const normalizedRole = normalizeRole(data?.rol || data?.role);

  return {
    id: firebaseUser.uid,
    firebaseUid: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: cleanEmail(data?.email || firebaseUser.email),
    name: data?.nombre || data?.name || firebaseUser.displayName || firebaseUser.email,
    nombre: data?.nombre || data?.name || firebaseUser.displayName || firebaseUser.email,
    role: normalizedRole,
    rol: normalizedRole,
    categoria: data?.categoria || "",
    activo: data?.activo !== false,
  };
}

function saveLocalSession(profile, firebaseUser) {
  if (!profile || !firebaseUser) return;
  localStorage.setItem("cedi_token", firebaseUser.uid);
  localStorage.setItem("cedi_user", JSON.stringify(profile));
}

function clearLocalSession() {
  localStorage.removeItem("cedi_token");
  localStorage.removeItem("cedi_user");
}

function readableAuthError(error) {
  const code = error?.code || "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email o contraseña incorrectos.";
  }
  if (code === "auth/too-many-requests") return "Demasiados intentos. Esperá unos minutos y volvé a probar.";
  if (code === "auth/network-request-failed") return "No se pudo conectar con Firebase. Revisá tu conexión.";
  if (code === "auth/invalid-email") return "El email ingresado no es válido.";
  if (code === "firestore/user-not-found") return "Tu usuario existe en Firebase Auth, pero no tiene permisos cargados en Firestore.";
  if (code === "firestore/user-disabled") return "Tu usuario está inactivo. Consultá con un administrador.";
  if (code === "firestore/user-role-missing") return "Tu usuario no tiene un rol válido asignado.";
  if (code === "permission-denied") return "Firebase no permite leer tu perfil. Revisá las reglas de Firestore.";
  return error?.message || "No se pudo iniciar sesión.";
}

async function getUserProfile(firebaseUser) {
  if (!firebaseUser?.uid) return null;

  const userRef = doc(db, "usuarios", firebaseUser.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const error = new Error("Tu usuario existe en Firebase Auth, pero no tiene permisos cargados en Firestore.");
    error.code = "firestore/user-not-found";
    throw error;
  }

  const data = snap.data();

  if (data?.activo === false) {
    const error = new Error("Tu usuario está inactivo.");
    error.code = "firestore/user-disabled";
    throw error;
  }

  const profile = publicFirestoreProfile(firebaseUser, data);

  if (!profile.role) {
    const error = new Error("Tu usuario no tiene un rol válido asignado.");
    error.code = "firestore/user-role-missing";
    throw error;
  }

  return profile;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=anon, object=authed
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearLocalSession();
        if (mounted) setUser(false);
        return;
      }

      try {
        const profile = await getUserProfile(firebaseUser);
        saveLocalSession(profile, firebaseUser);
        if (mounted) {
          setUser(profile || false);
          setError("");
        }
      } catch (e) {
        const msg = readableAuthError(e);
        clearLocalSession();
        await firebaseSignOut(auth).catch(() => {});
        if (mounted) {
          setError(msg);
          setUser(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, cleanEmail(email), password);
      const profile = await getUserProfile(result.user);
      saveLocalSession(profile, result.user);
      setUser(profile || false);
      return true;
    } catch (e) {
      const msg = readableAuthError(e);
      await firebaseSignOut(auth).catch(() => {});
      clearLocalSession();
      setUser(false);
      setError(msg);
      return false;
    }
  };


  const resetPassword = async (email) => {
    setError("");
    const cleanedEmail = cleanEmail(email);
    if (!cleanedEmail) {
      setError("Ingresá tu email para enviarte el recupero de contraseña.");
      return { ok: false, message: "Ingresá tu email para enviarte el recupero de contraseña." };
    }

    try {
      await sendPasswordResetEmail(auth, cleanedEmail);
      return {
        ok: true,
        message: `Te enviamos un email a ${cleanedEmail} para restablecer tu contraseña.`,
      };
    } catch (e) {
      const msg = readableAuthError(e);
      setError(msg);
      return { ok: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } finally {
      clearLocalSession();
      setUser(false);
      window.location.href = "/login";
    }
  };

  const value = useMemo(() => ({ user, login, logout, resetPassword, error, setError }), [user, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function hasRole(user, ...roles) {
  if (!user) return false;
  const role = normalizeRole(user.role || user.rol);
  return roles.map(normalizeRole).includes(role);
}
