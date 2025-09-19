import { Pause, Play } from "lucide-react";
import { useState } from "react";

export default function PlayPauseButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(true); // assume music starts playing

  const togglePlayback = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = isPlaying ? "pause" : "play";
      const res = await fetch(`http://127.0.0.1:5000/${endpoint}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${endpoint}`);
      console.log(data.message);
      setIsPlaying(!isPlaying);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={togglePlayback}
        disabled={loading}
        className={`p-3 rounded-full border border-white/20
          bg-white/10 backdrop-blur-md shadow-lg transition-all duration-200
          hover:bg-white/20 hover:scale-105 active:scale-95
          ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {isPlaying ? (
          <Pause className="text-white" size={20} />
        ) : (
          <Play className="text-white" size={20} />
        )}
      </button>
      {error && (
        <p className="text-red-400 text-xs text-center px-2">{error}</p>
      )}
    </div>
  );
}
