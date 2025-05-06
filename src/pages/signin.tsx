import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";

import Image from "next/image";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/",
      });
   console.log('result',result)
      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (err) {
      console.error("SignIn error:", err);
      setError("An unexpected error occurred");
    }
  };

  return (
    <div className=" h-screen bg-gray-100 text-gray-900 flex justify-center">
      <div className="max-w-screen-xl m-0 sm:m-10 bg-white shadow sm:rounded-lg flex justify-center flex-1">
        <div className="lg:w-1/2 xl:w-5/12 p-6 sm:p-12">
          <div className="flex items-center justify-center">
            <Image src="/dashboard.svg" alt="logo" width={80} height={80} />
          </div>
          <div className="mt-3 flex flex-col items-center">
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Sign in to your account{" "}
            </h2>
            <div className="w-full flex-1 mt-8">
              {error && (
                <p className="text-red-500 text-center mb-2">{error}</p>
              )}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="mx-auto max-w-xs">
                  <input
                    className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="relative">
                    <input
                      className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white mt-5"
                      type={showPassword ? "text" : "password"} // toggle between text and password
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 mt-5 flex items-center pr-3"
                      onClick={() => setShowPassword(!showPassword)} // toggle password visibility
                    >
                      {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="mt-5 tracking-wide font-semibold bg-[#3b65f5] text-gray-100 w-full py-4 rounded-lg  transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none"
                  >
                    <Image
                      src="/login.svg"
                      alt="login"
                      width={24}
                      height={24}
                    />
                    <span className="ml-3">Sign In</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-indigo-100 text-center hidden lg:flex">
          <div
            className="m-12 xl:m-16 w-full bg-contain bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/website-maintenance.svg')`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
