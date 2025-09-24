import { FastForward } from "lucide-react";
import { useState } from "react";

export default function SkipButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSkip = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:5000/skip", {
        method: "POST",
        credentials: "include", // Important for Flask session cookies
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to skip track");
      console.log(data.message || "Skipped!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleSkip}
        disabled={loading}
        className={`p-2 rounded-full border border-white/20
          bg-white/10 backdrop-blur-md shadow-lg transition-all duration-200
          hover:bg-white/20 hover:scale-105 active:scale-95
          ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <FastForward className="text-white" size={15} />
      </button>
      {error && (
        <p className="text-red-400 text-xs text-center px-2">{error}</p>
      )}
    </div>
  );
}
