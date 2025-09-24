import { Rewind } from "lucide-react";
import { useState } from "react";

export default function PreviousButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePrevious = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:5000/previous", {
        method: "POST",
        credentials: "include", // ✅ keep session cookie for Spotify token
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to go to previous track");
      console.log(data.message || "Went to previous track!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handlePrevious}
        disabled={loading}
        className={`p-2 rounded-full border border-white/20
          bg-white/10 backdrop-blur-md shadow-lg transition-all duration-200
          hover:bg-white/20 hover:scale-105 active:scale-95
          ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <Rewind className="text-white" size={15} />
      </button>
      {error && (
        <p className="text-red-400 text-xs text-center px-2">{error}</p>
      )}
    </div>
  );
}
