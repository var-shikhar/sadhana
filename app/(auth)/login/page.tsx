"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { LotusMandala } from "@/components/ornament/LotusMandala"
import { PressureLabel } from "@/components/gurukul/PressureLabel"
import { GoldRule } from "@/components/gurukul/GoldRule"

type ResendStatus = "idle" | "sending" | "sent" | "error"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle")
  const [resendError, setResendError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setNeedsVerification(false)
    setResendStatus("idle")
    setResendError(null)

    const { error } = await authClient.signIn.email({ email, password })

    if (error) {
      // Better-Auth surfaces unverified-email as code "EMAIL_NOT_VERIFIED"
      if (error.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true)
      } else {
        setError(error.message ?? "Could not sign in")
      }
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  async function handleResend() {
    setResendStatus("sending")
    setResendError(null)
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/",
    })
    if (error) {
      setResendStatus("error")
      setResendError(error.message ?? "Could not resend email")
      return
    }
    setResendStatus("sent")
  }

  return (
    <div className="relative">
      <LotusMandala
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        tone="earth"
        opacity={0.1}
        size={420}
      />
      <Card className="relative bg-ivory-deep/90 border-gold/40">
        <CardContent className="p-6 space-y-5">
          <header className="text-center space-y-1">
            <PressureLabel caps tone="ink" className="text-base">
              Sadhana
            </PressureLabel>
            <p className="font-lyric-italic text-sm text-earth-deep">
              A daily practice to be 1% better
            </p>
          </header>
          <GoldRule />
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-ivory border-gold/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-ivory border-gold/40"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {needsVerification && (
              <div className="space-y-2 rounded border border-gold/40 bg-ivory/60 p-3">
                <p className="font-lyric-italic text-sm text-earth-deep">
                  Please verify your email first — check your inbox for the
                  verification link.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full cursor-pointer"
                  onClick={handleResend}
                  disabled={resendStatus === "sending"}
                >
                  {resendStatus === "sending"
                    ? "Sending..."
                    : "Resend verification email"}
                </Button>
                {resendStatus === "sent" && (
                  <p className="text-sm text-earth-mid">
                    Sent — check your inbox.
                  </p>
                )}
                {resendStatus === "error" && resendError && (
                  <p className="text-sm text-destructive">{resendError}</p>
                )}
              </div>
            )}
            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="text-center text-sm text-earth-mid">
            No account?{" "}
            <Link href="/signup" className="text-saffron hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
