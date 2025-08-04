export default function SyncingProgressBars() {
  return (
    <>
      <div className="w-full h-[3px] bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full w-1/3 animate-[slide_2s_ease-in-out_infinite]"></div>
      </div>

      <style jsx>{`
        @keyframes slide {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(300%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </>
  );
}
