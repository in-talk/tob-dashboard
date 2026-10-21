import { useState, useRef, useEffect, useCallback } from "react";
import type { GetServerSideProps } from "next";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import CustomLoader from "@/components/ui/CustomLoader";
import Turnstile from "@/components/auth/Turnstile";
import { signInPageData } from "@/constants";
import { captchaMode } from "@/lib/auth/captcha";
import {
  motion,
  AnimatePresence,
  type Variants,
  easeInOut,
} from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const pulseVariants: Variants = {
  idle: {},
  pulse: {
    scale: [1, 1.01, 1],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: easeInOut,
    },
  },
};

const errorVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const BUTTON_SCALE_ANIMATION = 0.98 as const;

type SignInProps = {
  /** Cloudflare Turnstile site key (public), or null when captcha is off. */
  turnstileSiteKey: string | null;
  /** Show the captcha from the start (TURNSTILE_MODE=always). */
  captchaAlways: boolean;
};

// Read at request time so changing the env doesn't need a rebuild.
export const getServerSideProps: GetServerSideProps<SignInProps> = async () => {
  const mode = captchaMode();
  const siteKey = process.env.TURNSTILE_SITE_KEY || null;
  return {
    props: {
      turnstileSiteKey: mode === "off" ? null : siteKey,
      captchaAlways: mode === "always" && !!siteKey,
    },
  };
};

export default function SignIn({ turnstileSiteKey, captchaAlways }: SignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormFocused, setIsFormFocused] = useState(false);

  // Turnstile: shown from the start in "always" mode, otherwise only once
  // the server says this login needs it (after repeated failures).
  const [showCaptcha, setShowCaptcha] = useState(captchaAlways);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const hasRedirected = useRef(false);

  const { data: session, status } = useSession();
  const router = useRouter();

  const handleFocus = useCallback(() => setIsFormFocused(true), []);
  const handleBlur = useCallback(() => setIsFormFocused(false), []);
  const togglePasswordVisibility = useCallback(() => setShowPassword((s) => !s), []);
  const handleCaptchaError = useCallback(() => setError(signInPageData.errors.captchaLoad), []);

  // Handle session redirect - only once
  useEffect(() => {
    if (status === "authenticated" && session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/");
    }
  }, [session, status, router]);

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    if (showCaptcha && !captchaToken) {
      setError(signInPageData.errors.captchaRequired);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        captchaToken: captchaToken ?? "",
        callbackUrl: "/",
      });

      if (result?.ok && !result.error && result.url) {
        hasRedirected.current = true;
        await router.push(result.url);
        return;
      }

      switch (result?.error) {
        case "CaptchaRequired":
          if (turnstileSiteKey) {
            setShowCaptcha(true);
            setError(signInPageData.errors.captchaRequired);
          } else {
            setError(signInPageData.errors.unexpected);
          }
          break;
        case "CaptchaFailed":
          setError(signInPageData.errors.captchaFailed);
          break;
        case "TooManyAttempts":
          setError(signInPageData.errors.tooManyAttempts);
          break;
        case undefined:
          setError(signInPageData.errors.unexpected);
          break;
        default:
          setError(signInPageData.errors.invalidCredentials);
      }
      // Turnstile tokens are single-use: get a fresh one for the next try.
      if (showCaptcha) setCaptchaReset((n) => n + 1);
    } catch (err) {
      console.error("Sign in error:", err);
      setError(signInPageData.errors.unexpected);
      if (showCaptcha) setCaptchaReset((n) => n + 1);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, router, showCaptcha, captchaToken, turnstileSiteKey]);

  // Don't render anything if authenticated (prevents flash)
  if (status === "authenticated") {
    return null;
  }

  const isSubmitDisabled = isLoading || (showCaptcha && !captchaToken);

  const buttonClasses =
    `group relative w-full py-3 rounded-2xl font-semibold flex items-center justify-center overflow-hidden ` +
    (isSubmitDisabled
      ? "bg-white/10 text-white/60 cursor-not-allowed"
      : "bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 text-white shadow-xl shadow-purple-500/25 hover:opacity-95 transition-all duration-300");

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-gray-900 to-slate-800">
        <div
          className={`absolute inset-0 bg-[url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")] opacity-20`}
        />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse [animation-delay:1000ms]" />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl animate-pulse [animation-delay:500ms]" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md mx-4 z-10"
      >
        <motion.div
          variants={pulseVariants}
          animate={isFormFocused ? "pulse" : "idle"}
          className="backdrop-blur-2xl bg-white/5 dark:bg-black/20 p-8 rounded-3xl shadow-2xl border border-white/10 hover:border-white/20 transition-all duration-300"
        >
          <div className="text-center mb-8">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="inline-block mb-6"
            >
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                <Image
                  src="/dashboard.svg"
                  alt={signInPageData.alt.logo}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-white mb-2"
            >
              {signInPageData.heading}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/60 text-sm"
            >
              {signInPageData.welcomeBack}
            </motion.p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                variants={errorVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-red-400 text-sm">⚠️</span>
                  <p className="text-red-300 text-sm font-medium">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSignIn} className="space-y-6" autoComplete="on">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-1"
            >
              <label className="text-white/80 text-xs font-medium block">
                {signInPageData.inputLabel.email}
              </label>
              <div className="relative group">
                <input
                  type="email"
                  name="email"
                  placeholder={signInPageData.emailPlaceholder}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                  disabled={status === "loading"}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 transition-all duration-300 backdrop-blur-sm hover:bg-white/10 group-hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/0 via-purple-500/0 to-indigo-500/0 group-focus-within:from-violet-500/10 group-focus-within:via-purple-500/10 group-focus-within:to-indigo-500/10 transition-all duration-300 pointer-events-none" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-1"
            >
              <label className="text-white/80 text-xs font-medium block">
                {signInPageData.inputLabel.password}
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={signInPageData.passwordPlaceholder}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                  disabled={status === "loading"}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 transition-all duration-300 backdrop-blur-sm hover:bg-white/10 group-hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  disabled={status === "loading"}
                  className="absolute right-3 top-[8px] p-2 text-white/50 hover:text-white/80 transition-colors duration-200 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeClosedIcon className="w-5 h-5" />
                  ) : (
                    <EyeOpenIcon className="w-5 h-5" />
                  )}
                </motion.button>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/0 via-purple-500/0 to-indigo-500/0 group-focus-within:from-violet-500/10 group-focus-within:via-purple-500/10 group-focus-within:to-indigo-500/10 transition-all duration-300 pointer-events-none" />
              </div>
            </motion.div>

            {showCaptcha && turnstileSiteKey && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Turnstile
                  siteKey={turnstileSiteKey}
                  resetKey={captchaReset}
                  onToken={setCaptchaToken}
                  onError={handleCaptchaError}
                />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <motion.button
                type="submit"
                disabled={isSubmitDisabled || status === "loading"}
                whileTap={{ scale: BUTTON_SCALE_ANIMATION }}
                whileHover={!isSubmitDisabled && status !== "loading" ? { scale: 1.02 } : {}}
                className={buttonClasses}
              >
                {!isSubmitDisabled && status !== "loading" && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                )}

                {isLoading || status === "loading" ? (
                  <div className="relative z-10 flex items-center space-x-3">
                    <CustomLoader />
                    <span className="text-lg font-semibold">
                      {status === "loading" ? "Loading..." : signInPageData.signingIn}
                    </span>
                  </div>
                ) : (
                  <div className="relative z-10 flex items-center space-x-3">
                    <span className="text-lg font-semibold">
                      {signInPageData.signInButton}
                    </span>
                  </div>
                )}
              </motion.button>
            </motion.div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
