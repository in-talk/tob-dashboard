import { useRef } from "react";

export default function AudioPlayer({ audioUrl }: { audioUrl: string | null }) {
  const audioRef = useRef(null);

  if (!audioUrl) return <div>No audio available</div>;
  return (
    <div className="w-full">
      <audio ref={audioRef} controls preload="metadata" className="w-full">
        <source src={audioUrl} type="audio/mpeg" />
        <source src={audioUrl} type="audio/wav" />
        <source src={audioUrl} type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
