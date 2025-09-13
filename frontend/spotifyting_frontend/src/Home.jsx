import React, { useEffect, useState, useMemo } from "react";
import SpotifyLogo from "./assets/spotifylogo.png"; // Make sure the logo is in /public

const API_BASE = "http://127.0.0.1:5000";

const Home = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [timeframe, setTimeframe] = useState("lifetime");
  const [currentTrack, setCurrentTrack] = useState(null);

  // Compute max values for bar widths
  const maxCount = useMemo(() => {
    if (!results?.top_10_artists) return 0;
    return Math.max(...Object.values(results.top_10_artists));
  }, [results]);

  const maxSongCount = useMemo(() => {
    if (!results?.top_10_songs) return 0;
    return Math.max(...Object.values(results.top_10_songs));
  }, [results]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError("");
    setResults(null);

    if (selectedFile && !selectedFile.name.endsWith(".zip")) {
      setError("Only .zip files are allowed!");
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = () => {
    if (!file) {
      setError("Please select a .zip file before uploading");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("timeframe", timeframe);

    fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setResults(data);
      })
      .catch((err) => setError(`Upload error: ${err.message}`));
  };

  // Poll current track every 15 seconds
  useEffect(() => {
    const fetchCurrentTrack = async () => {
  try {
    const res = await fetch(`${API_BASE}/current_track`, {
      method: "GET", 
       credentials: "include" 
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.error) setCurrentTrack(data);
    else console.warn("Spotify API error:", data.error);
  } catch (err) {
    console.error("Error fetching current track:", err);
  }
};

    fetchCurrentTrack(); // initial fetch
    const interval = setInterval(fetchCurrentTrack, 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-clear error after 2s
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 items-center">
        <img src={SpotifyLogo} alt="" width={80} className="mt-8" />

        <div className="font-bold text-4xl text-center">
          <p className="bg-gradient-to-r from-green-400 via-teal-300 to-green-200 bg-clip-text text-transparent leading-[1.3]">
            Spotify
          </p>
          <p className="bg-gradient-to-r from-green-400 via-teal-300 to-green-200 bg-clip-text text-transparent leading-[1.3]">
            Listening Stats
          </p>
        </div>

        <div className="font-semibold text-xl text-center max-w-lg">
          Upload your lifetime Spotify data (get it from{" "}
          <a
            href="https://spotify.com/account/privacy"
            className="text-green-400 hover:text-green-500 transition-all duration-150 hover:underline"
          >
            here
          </a>
          ) to see your listening stats!
        </div>

        {/* File input */}
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="hidden"
          id="fileInput"
        />
        <label
          htmlFor="fileInput"
          className="relative inline-block cursor-pointer bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl shadow-xl text-xl font-semibold py-2 px-4"
        >
          Choose file
        </label>

        {/* Timeframe dropdown */}
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="relative bg-white/20 backdrop-blur-md border border-white/30 rounded-lg p-2 text-white shadow-xl mt-4"
        >
          <option value="lifetime" className="bg-gray-900">
            Lifetime
          </option>
          <option value="30_days" className="bg-gray-900">
            Last 30 Days
          </option>
          <option value="1_year" className="bg-gray-900">
            Last 1 Year
          </option>
          <option value="6_months" className="bg-gray-900">
            Last 6 Months
          </option>
        </select>

        <button
          onClick={handleUpload}
          className="mt-4 relative rounded-xl py-2 px-6 text-2xl font-bold bg-green-400/20 text-white border border-white/20 backdrop-blur-sm shadow-lg hover:bg-green-400/40 transition-all duration-200"
        >
          {results ? "Update" : "Upload & Analyze"}
        </button>

        {file && <p className="text-sm mt-2">Selected: {file.name}</p>}
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Current Track */}
      {currentTrack && currentTrack.item && (
        <div className="flex items-center gap-4">
          <img
            src={currentTrack.item.album.images[0].url}
            alt="Album Art"
            className="w-16 h-16 rounded"
          />
          <div>
            <p className="font-bold text-white">{currentTrack.item.name}</p>
            <p className="text-gray-300">
              {currentTrack.item.artists.map((a) => a.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="flex flex-col mx-auto">
          <div className="relative border border-white/20 bg-white/10 backdrop-blur-md md:w-fit md:mx-auto rounded-2xl px-2 md:px-8 py-6 mb-6 shadow-xl">
            <div className="text-4xl font-bold mb-2 text-center text-white">
              Stats{" "}
              <span className="bg-gradient-to-r from-white via-emerald-200 to-green-400 bg-clip-text text-transparent">
                ({results.timeframe.replace("_", " ")})
              </span>
            </div>

            <div className="text-xl font-semibold flex flex-col gap-1 text-center">
              <p>Total Tracks: {results.amount_of_tracks}</p>
              <p>Total Hours: {Math.floor(results.total_listening_hours)}</p>
              <p>Avg Track Duration (min): {results.avg_track_duration}</p>
            </div>
          </div>

          {/* Top Artists & Songs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Artists */}
            <div className="relative border border-white/10 bg-white/5 backdrop-blur-md rounded-2xl px-2 md:px-8 pb-4 shadow-xl">
              <h4 className="text-4xl mb-4 mt-10 text-center font-bold bg-gradient-to-r from-emerald-300 via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
                Top Artists
              </h4>
              <ul className="text-center text-xl flex flex-col gap-2">
                {Object.entries(results.top_10_artists || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([artist, count], index) => (
                    <li
                      key={artist}
                      className="flex flex-col gap-2 font-semibold bg-white/5 hover:bg-white/10 rounded-xl p-4"
                    >
                      <div className="flex justify-between items-center">
                        <p className={index < 3 ? "text-teal-300" : "text-white/90"}>
                          {artist} {index < 3 && "★"}
                        </p>
                        <p className="text-teal-300">{count}</p>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            index < 3 ? "bg-teal-400" : "bg-teal-500"
                          }`}
                          style={{
                            width: maxCount ? `${(count / maxCount) * 100}%` : "0%",
                          }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </div>

            {/* Top Songs */}
            <div className="relative border border-white/10 bg-white/5 backdrop-blur-md rounded-2xl px-2 md:px-8 pb-4 shadow-xl">
              <h4 className="text-4xl mb-4 mt-10 text-center font-bold bg-gradient-to-r from-emerald-300 via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
                Top Songs
              </h4>
              <ul className="text-center text-xl flex flex-col gap-2">
                {Object.entries(results.top_10_songs || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([song, count], index) => (
                    <li
                      key={song}
                      className="flex flex-col gap-2 font-semibold bg-white/10 hover:bg-white/20 rounded-xl p-4"
                    >
                      <div className="flex justify-between items-center">
                        <p className={index < 3 ? "text-emerald-300" : "text-white/90"}>
                          {song} {index < 3 && "★"}
                        </p>
                        <p className="text-white/90">{count}</p>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            index < 3 ? "bg-emerald-400" : "bg-emerald-500"
                          }`}
                          style={{
                            width: maxSongCount
                              ? `${(count / maxSongCount) * 100}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
