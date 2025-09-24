import { Pause, Play } from "lucide-react";
import { useState } from "react";

export default function PlayPauseButton() {

  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(true); // assume music starts playing

const togglePlayback = async () => {
  const nextState = !isPlaying;
  setIsPlaying(nextState);
  
  setError("");

  try {
    const endpoint = nextState ? "play" : "pause";
    const res = await fetch(`http://127.0.0.1:5000/${endpoint}`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json()).error || `Failed to ${endpoint}`);
  } catch (err) {
    setError(err.message);
    // revert if error
    setIsPlaying(!nextState);
  } 
};


  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={togglePlayback}
       
        className={`p-2 rounded-full border border-white/20
          bg-white/10 backdrop-blur-md shadow-lg transition-all duration-200
          hover:bg-white/20 hover:scale-105 active:scale-95`}
      >
        {isPlaying ? (
          <Pause className="text-white" size={15} />
        ) : (
          <Play className="text-white" size={15} />
        )}
      </button>
      {error && (
        <p className="text-red-400 text-xs text-center px-2">{error}</p>
      )}
    </div>
  );
}
