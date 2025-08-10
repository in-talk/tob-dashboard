import { generateAudioUrl } from "@/utils/WasabiClient";
import { useRef, useState, useCallback } from "react";

export default function AudioPlayer({
  audioPath,
}: {
  audioPath: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchAudioUrl = useCallback(async () => {
    if (!audioPath || loading || audioUrl) return;

    try {
      setLoading(true);
      setError(false);

      // Generate the signed URL
      const url = await generateAudioUrl(audioPath);

      if (url) {
        setAudioUrl(url);
        setLoading(false);
      } else {
        throw new Error("Failed to generate audio URL");
      }
    } catch (err) {
      console.error("Error loading audio:", err);
      setLoading(false);
      setError(true);
    }
  }, [audioPath, loading, audioUrl]);

  const handleInitialPlay = () => {
    if (!audioUrl) {
      fetchAudioUrl();
    }
  };

  if (!audioPath) return <div>No audio available</div>;

  return (
    <div className="w-[160px] relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded">
          <div className="animate-spin h-6 w-6 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      )}

      {!audioUrl ? (
        // Show a play button before URL is loaded
        <div
          onClick={handleInitialPlay}
          className="w-full h-[25px] bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
          ) : error ? (
            <span className="text-red-500 text-xs">Error</span>
          ) : (
            <svg
              className="w-4 h-4 text-gray-600 dark:text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M8 5v10l8-5-8-5z" />
            </svg>
          )}
        </div>
      ) : (
        // Show audio controls once URL is loaded
        <audio
          ref={audioRef}
          controls
          preload="metadata"
          className="w-full h-[25px]"
          // onClick={handleAudioClick}
        >
          <source src={audioUrl} type="audio/mpeg" />
          <source src={audioUrl} type="audio/wav" />
          <source src={audioUrl} type="audio/mp3" />
          Your browser does not support the audio element.
        </audio>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handleInitialPlay}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
