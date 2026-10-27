import { redirect } from "next/navigation";
import { GraduationCap, LockKeyhole, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { hasPortalSession } from "@/lib/auth/session";

export default async function LoginPage() {
  if (await hasPortalSession()) redirect("/");

  return (
    <main className="login-page">
      <section className="login-intro" aria-labelledby="login-title">
        <div className="brand-mark brand-mark--large" aria-hidden="true">
          <GraduationCap size={27} strokeWidth={1.8} />
        </div>
        <p className="eyebrow">Notre Dame University Bangladesh</p>
        <h1 id="login-title">Your portal, in conversation.</h1>
        <p className="login-lead">
          Ask about attendance, courses, routines, and academic details in English, বাংলা, or Banglish.
        </p>
        <div className="login-points">
          <div><ShieldCheck size={19} /><span>Your portal tokens stay in secure, HTTP-only cookies.</span></div>
          <div><LockKeyhole size={19} /><span>Your password is used only to sign in and is never stored.</span></div>
        </div>
      </section>

      <section className="login-card" aria-label="Student portal sign in">
        <div className="login-card__heading">
          <span className="status-dot" />
          <span>NDUB AI Assistant</span>
        </div>
        <h2>Sign in to continue</h2>
        <p>Use the same credentials as your NDUB student portal.</p>
        <LoginForm />
        <p className="privacy-note">
          Portal information needed for your answers is processed by the configured NVIDIA AI service. Web searches never
          automatically include your private portal data.
        </p>
      </section>
    </main>
  );
}
