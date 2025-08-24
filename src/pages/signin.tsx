"use client";

import { useState, useRef, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import ReCAPTCHA from "react-google-recaptcha";
import Image from "next/image";
import CustomLoader from "@/components/ui/CustomLoader";
import { signInPageData } from "@/constants";
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
const RECAPTCHA_THEME: "light" | "dark" = "light";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { data: session } = useSession();
  const router = useRouter();

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const [isFormFocused, setIsFormFocused] = useState(false);
  const handleFocus = () => setIsFormFocused(true);
  const handleBlur = () => setIsFormFocused(false);

  const togglePasswordVisibility = () => setShowPassword((s) => !s);

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session, router]);

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    if (error === signInPageData.errors.recaptchaRequired) {
      setError(null);
    }
  };

  const handleRecaptchaError = () => {
    setError(signInPageData.errors.recaptchaLoad);
    setRecaptchaToken(null);
  };

  const handleRecaptchaExpired = () => {
    setRecaptchaToken(null);
    setError(signInPageData.errors.recaptchaExpired);
  };

  const verifyRecaptcha = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/verify-recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      return data.success;
    } catch (err) {
      console.error("Error verifying reCAPTCHA:", err);
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!siteKey) {
      setError(signInPageData.errors.recaptchaConfig);
      return;
    }

    if (!recaptchaToken) {
      setError(signInPageData.errors.recaptchaRequired);
      return;
    }

    setIsLoading(true);

    try {
      const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);

      if (!isRecaptchaValid) {
        setError(signInPageData.errors.recaptchaFailed);
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
        return;
      }

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/",
      });

      if (result?.error) {
        setError(signInPageData.errors.invalidCredentials);
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(signInPageData.errors.unexpected);
      }
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!siteKey) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">
            {signInPageData.configError.title}
          </h2>
          <p className="text-gray-600">
            {signInPageData.configError.description}
          </p>
        </div>
      </div>
    );
  }

  const isSubmitDisabled = isLoading || !recaptchaToken;

  const buttonClasses =
    `group relative w-full py-3 rounded-2xl font-semibold flex items-center justify-center overflow-hidden ` +
    (isSubmitDisabled
      ? "bg-white/10 text-white/60 cursor-not-allowed"
      : "bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 text-white shadow-xl shadow-purple-500/25 hover:opacity-95 transition-all duration-300");

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0  bg-gradient-to-br from-slate-950 via-gray-900 to-slate-800">
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
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 transition-all duration-300 backdrop-blur-sm hover:bg-white/10 group-hover:border-white/20"
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
              <label className="text-white/80 text-xs  font-medium  block">
                {" "}
                {signInPageData.inputLabel.password}
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={signInPageData.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 transition-all duration-300 backdrop-blur-sm hover:bg-white/10 group-hover:border-white/20"
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  className="absolute right-3 top-[8px]  p-2 text-white/50 hover:text-white/80 transition-colors duration-200 rounded-lg hover:bg-white/10"
                  onClick={togglePasswordVisibility}
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center"
            >
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={siteKey}
                  onChange={handleRecaptchaChange}
                  onErrored={handleRecaptchaError}
                  onExpired={handleRecaptchaExpired}
                  theme={RECAPTCHA_THEME}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <motion.button
                type="submit"
                disabled={isSubmitDisabled}
                whileTap={{ scale: BUTTON_SCALE_ANIMATION }}
                whileHover={!isSubmitDisabled ? { scale: 1.02 } : {}}
                className={buttonClasses}
              >
                {!isSubmitDisabled && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                )}

                {isLoading ? (
                  <div className="relative z-10 flex items-center space-x-3">
                    <CustomLoader />
                    <span className="text-lg font-semibold">
                      {signInPageData.signingIn}
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

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center"
          >
            <p className="text-white/40 text-xs">
              {signInPageData.protectedBy}
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
