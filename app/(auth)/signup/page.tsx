"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { LotusMandala } from "@/components/ornament/LotusMandala"
import { PressureLabel } from "@/components/gurukul/PressureLabel"
import { GoldRule } from "@/components/gurukul/GoldRule"

type ResendStatus = "idle" | "sending" | "sent" | "error"

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [awaitingVerification, setAwaitingVerification] = useState(false)
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle")
  const [resendError, setResendError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name: displayName,
    })

    if (error) {
      setError(error.message ?? "Could not create account")
      setLoading(false)
      return
    }

    // requireEmailVerification = true → no token returned at signup
    if (data && "token" in data && data.token) {
      router.push("/onboarding")
      router.refresh()
      return
    }

    setAwaitingVerification(true)
    setLoading(false)
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

  if (awaitingVerification) {
    return (
      <div className="relative">
        <LotusMandala
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          tone="earth"
          opacity={0.1}
          size={420}
        />
        <Card className="relative bg-ivory-deep/90 border-gold/40">
          <CardContent className="p-6 space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-saffron/15 border border-saffron/40">
              <Mail className="h-6 w-6 text-saffron" />
            </div>
            <header className="space-y-1">
              <PressureLabel caps tone="ink" className="text-base">
                Check your email
              </PressureLabel>
              <p className="font-lyric-italic text-sm text-earth-deep">
                We&apos;ve sent a verification link to{" "}
                <span className="font-medium text-ink">{email}</span>. Click it
                to activate your account.
              </p>
            </header>
            <GoldRule />
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer"
              onClick={handleResend}
              disabled={resendStatus === "sending"}
            >
              {resendStatus === "sending" ? "Sending..." : "Resend email"}
            </Button>
            {resendStatus === "sent" && (
              <p className="text-sm text-earth-mid">Sent — check your inbox.</p>
            )}
            {resendStatus === "error" && resendError && (
              <p className="text-sm text-destructive">{resendError}</p>
            )}
            <p className="text-sm text-earth-mid">
              <Link href="/login" className="text-saffron hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    )
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
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="What should we call you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="bg-ivory border-gold/40"
              />
            </div>
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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-ivory border-gold/40"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Begin Your Sadhana"}
            </Button>
          </form>
          <p className="text-center text-sm text-earth-mid">
            Already practicing?{" "}
            <Link href="/login" className="text-saffron hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
