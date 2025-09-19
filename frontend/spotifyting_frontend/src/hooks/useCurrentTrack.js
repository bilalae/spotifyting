import { useEffect, useState } from "react";

export default function useCurrentTrack() {
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTrack = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:5000/current_track", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch track");
      setTrack(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrack();
    const id = setInterval(fetchTrack, 1000); // refresh every 5s
    return () => clearInterval(id);
  }, []);

  return { track, loading, error };
}
