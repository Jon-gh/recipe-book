"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Mode = "signin" | "signup";

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim().split("@")[0],
          callbackURL: "/recipes",
        });
        if (err) setError(err.message ?? "Sign up failed");
      } else {
        const { error: err } = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: "/recipes",
        });
        if (err) setError(err.message ?? "Invalid email or password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Recipe Book</h1>
        <p className="text-muted-foreground text-sm">
          {mode === "signin" ? "Sign in to manage your recipes" : "Create an account"}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Button
          className="w-full"
          variant="outline"
          onClick={() =>
            authClient.signIn.social({ provider: "google", callbackURL: "/recipes" })
          }
        >
          Continue with Google
        </Button>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 border-t" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="hover:text-foreground transition-colors"
              >
                Don&apos;t have an account? Create one
              </button>
              <Link
                href="/auth/reset-password"
                className="hover:text-foreground transition-colors"
              >
                Forgot password?
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className="hover:text-foreground transition-colors"
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
