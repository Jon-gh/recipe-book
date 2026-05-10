"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await signIn("email", { email: email.trim(), redirect: false });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Recipe Book</h1>
        <p className="text-muted-foreground text-sm">Sign in to manage your recipes</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Button
          className="w-full"
          variant="outline"
          onClick={() => signIn("google", { callbackUrl: "/recipes" })}
        >
          Continue with Google
        </Button>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 border-t" />
        </div>

        {sent ? (
          <div className="text-center space-y-2 py-4">
            <p className="font-medium">Check your email</p>
            <p className="text-sm text-muted-foreground">
              A sign-in link has been sent to {email}
            </p>
          </div>
        ) : (
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
