import { generateAudioUrl } from "@/utils/WasabiClient";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import type { GetServerSideProps } from "next";
import { withAuth } from "@/utils/auth";

export default function AudioPreview() {
  const { query, isReady } = useRouter();
  const audioPath = typeof query.url === "string" ? query.url : "";
  const callId = typeof query.call_id === "string" ? query.call_id : "";
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    generateAudioUrl(audioPath, callId).then((url) => {
      if (cancelled) return;
      setAudioUrl(url);
      setResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, audioPath, callId]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const handleCanPlay = () => setLoading(false);
    const handleError = () => setLoading(false); // still hide loader on error

    audio.addEventListener("canplaythrough", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("canplaythrough", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [audioUrl]);

  if (!resolved) return <div>Loading…</div>;
  if (!audioUrl) return <div>No audio available</div>;

  return (
    <div className=" h-full relative flex justify-center items-center">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center dark:border-gray-700 backdrop-blur-sm rounded">
          <div className="animate-spin h-6 w-6 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      )}
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        className={`w-[500px] ${
          loading ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <source src={audioUrl} type="audio/mpeg" />
        <source src={audioUrl} type="audio/wav" />
        <source src={audioUrl} type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin", "user"]);
