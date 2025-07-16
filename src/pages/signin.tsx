import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import ReCAPTCHA from "react-google-recaptcha";
import Image from "next/image";
import CustomLoader from "@/components/ui/CustomLoader";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const router = useRouter();

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    if (error === "Please complete the reCAPTCHA verification") {
      setError(null);
    }
  };

  const handleRecaptchaError = () => {
    console.error("reCAPTCHA error occurred");
    setError("reCAPTCHA failed to load. Please refresh the page.");
    setRecaptchaToken(null);
  };

  const handleRecaptchaExpired = () => {
    setRecaptchaToken(null);
    setError("reCAPTCHA expired. Please verify again.");
  };

  const verifyRecaptcha = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/verify-recaptcha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Error verifying reCAPTCHA:", error);
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!siteKey) {
      setError("reCAPTCHA is not properly configured");
      return;
    }

    if (!recaptchaToken) {
      setError("Please complete the reCAPTCHA verification");
      return;
    }

    setIsLoading(true);

    try {
      const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);

      if (!isRecaptchaValid) {
        setError("reCAPTCHA verification failed. Please try again.");
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
        setError("Invalid email or password");
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (err) {
      console.error("SignIn error:", err);
      setError("An unexpected error occurred");
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
            Configuration Error
          </h2>
          <p className="text-gray-600">
            reCAPTCHA site key is missing. Please check your environment
            variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className=" bg-gray-100 dark:bg-sidebar text-gray-900 flex justify-center h-screen items-center">
        <div className="max-w-screen-xl m-0 sm:m-10 bg-white dark:bg-dark shadow sm:rounded-lg flex justify-center flex-1">
          <div className="lg:w-1/2 xl:w-5/12 p-6 sm:p-12">
            <div className="flex items-center justify-center">
              <Image src="/dashboard.svg" alt="logo" width={80} height={80} />
            </div>
            <div className="mt-3 flex flex-col items-center">
              <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-200">
                Sign in to your account
              </h2>
              <div className="w-full flex-1 mt-8">
                {error && (
                  <p className="text-red-500 text-center mb-4 text-sm">
                    {error}
                  </p>
                )}
                <form
                  onSubmit={handleSignIn}
                  className="space-y-4"
                  autoComplete="on"
                >
                  <div className="mx-auto max-w-xs">
                    <input
                      className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white"
                      type="email"
                      name="email"
                      placeholder="Email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <div className="relative">
                      <input
                        className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white mt-5"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 mt-5 flex items-center pr-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !recaptchaToken}
                      className={`mt-5 tracking-wide font-semibold bg-[#3b65f5] text-gray-100 w-full py-4 rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none ${
                        isLoading || !recaptchaToken
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-[#2952d3]"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <span className="mr-5">Signing in....</span>
                          <CustomLoader />
                        </>
                      ) : (
                        <>
                          <Image
                            src="/login.svg"
                            alt="login"
                            width={24}
                            height={24}
                          />
                          <span className="ml-3">Sign In</span>
                        </>
                      )}
                    </button>
                    <div className="mt-8 flex justify-center">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={siteKey}
                        onChange={handleRecaptchaChange}
                        onErrored={handleRecaptchaError}
                        onExpired={handleRecaptchaExpired}
                        theme="light"
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-indigo-100 dark:bg-dark sm:rounded-lg text-center hidden lg:flex">
            <div
              className="m-12 xl:m-16 w-full bg-contain bg-center bg-no-repeat"
              style={{
                backgroundImage: `url('/website-maintenance.svg')`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </>
  );
}
