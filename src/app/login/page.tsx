"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function login() {
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setError(signInError?.message ?? copy.login.signIn.genericError);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    router.push(profile?.role === "coach" ? "/coach" : "/client");
    router.refresh();
  }

  async function signup() {
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();
    // New sign-ups are always clients; coach accounts are created by an admin.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim(), role: "client" } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/client");
      router.refresh();
      return;
    }

    setInfo(copy.login.signUp.confirmEmailInfo);
    setMode("signin");
    setLoading(false);
  }

  const isSignup = mode === "signup";
  const t = isSignup ? copy.login.signUp : copy.login.signIn;
  const inputClass =
    "w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Dumbbell size={32} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{copy.login.brandName}</h1>
          <p className="text-blue-200 mt-1 text-sm">{copy.login.tagline}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">
            {t.heading}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {t.subheading}
          </p>

          <form
            className="space-y-3 mb-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (isSignup) signup();
              else login();
            }}
          >
            {isSignup && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {copy.login.form.nameLabel}
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                {copy.login.form.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                {copy.login.form.passwordLabel}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-emerald-600">{info}</p>}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? t.buttonLoading : t.button}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "signin" : "signup");
              setError(null);
              setInfo(null);
            }}
            className="w-full text-center text-sm text-blue-600 hover:underline mt-3"
          >
            {isSignup ? copy.login.signUp.switchToSignin : copy.login.signIn.switchToSignup}
          </button>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          {copy.login.footer}
        </p>
      </div>
    </div>
  );
}
