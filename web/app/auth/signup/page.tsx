"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTos) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Sync profile to our backend
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ fullName }),
        });
      }
    } catch {
      // Non-critical — profile sync can happen on next /me call
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <strong>{email}</strong>. Click
            the link to activate your account.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/auth/login")}
            className="mt-4"
          >
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="/logo-icon.png" alt="Fintrest" width={48} height={48} />
            <span className="font-[var(--font-heading)] text-2xl font-bold tracking-tight">
              Fintrest<span className="text-primary">.ai</span>
            </span>
          </Link>
        </div>

        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold text-center">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Start discovering winning trades today.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />

          <input
            type="password"
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />

          <label className="flex items-start gap-2 text-xs text-muted-foreground select-none cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTos}
              onChange={(e) => setAcceptedTos(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="text-primary hover:underline" target="_blank">
                Terms of Service
              </Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                Privacy Policy
              </Link>
              . I understand Fintrest provides educational content only — not financial advice.
            </span>
          </label>

          <Button
            type="submit"
            disabled={loading || !acceptedTos}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold"
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-primary font-medium hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
