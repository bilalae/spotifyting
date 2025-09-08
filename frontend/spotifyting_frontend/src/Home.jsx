import React, { useEffect, useState, useMemo } from "react";
import SpotifyLogo from "./assets/spotifylogo.png";

const Home = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [timeframe, setTimeframe] = useState("lifetime");

  // Safely compute max values only when results change
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

    fetch("http://127.0.0.1:5000/upload", {
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
      .catch(() => setError("Upload error"));
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-4 p-6s items-center">
        <img src={SpotifyLogo} alt="" width={80} className="mt-8" />
        <div className="font-bold text-4xl justify-center flex gap-2 ">
          <p className="text-green-400">Spotify</p>Listening Stats
        </div>

        <div className="font-semibold text-xl text-center">
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
          className="bg-gray-200 text-black rounded-xl shadow-lg text-xl font-semibold py-2 px-4 cursor-pointer"
        >
          Choose file
        </label>

        {/* Timeframe dropdown */}
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="bg-white border rounded-lg p-2 text-black shadow-md"
        >
          <option value="lifetime">Lifetime</option>
          <option value="30_days">Last 30 Days</option>
          <option value="1_year">Last 1 Year</option>
          <option value="6_months">Last 6 Months</option>
        </select>

        <button
          onClick={handleUpload}
          className="bg-blue-700 text-white rounded-xl shadow-lg text-2xl font-bold py-2 px-6 hover:bg-blue-800"
        >
          {results ? "Update" : "Upload & Analyze"}
        </button>

        {file && <p className="text-sm mt-2">Selected: {file.name}</p>}
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Results */}
      {results && (
        <div className="mt-6 flex flex-col max-w-3/4 mx-auto">
          <h3 className="text-4xl font-bold mb-2 text-center text-white flex gap-2">
            Stats{" "}
            <p className="text-green-400">
              ({results.timeframe.replace("_", " ")})
            </p>
          </h3>

          <div className="text-xl font-semibold flex flex-col gap-1 text-center">
            <p>Total Tracks: {results.amount_of_tracks}</p>
            <p>Total Hours: {Math.floor(results.total_listening_hours)}</p>
            <p>Average Track Duration (min): {results.avg_track_duration}</p>
          </div>

          {/* Top Artists */}
          <div className="border-1 border-gray-700 bg-gray-950 rounded-2xl p-8">
            <h4 className="text-4xl mb-4 text-center font-bold mt-10 text-green-200">
              Top Artists Played
            </h4>
            <ul className="text-center text-xl flex flex-col justify-center gap-2 mt-2">
              {Object.entries(results.top_10_artists)
                .sort((a, b) => b[1] - a[1])
                .map(([artist, count], index) => (
                  <li
                    key={artist}
                    className="flex flex-col gap-2 font-semibold bg-gray-900 hover:bg-gray-950 transition-all duration-200 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-center">
                      <p className={index === 0 ? "text-yellow-300" : ""}>
                        {artist} {index < 3 && <span className="text-yellow-300">★</span>}
                      </p>
                      <p className="text-green-200">{count}</p>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          index < 3 ? "bg-green-400" : "bg-green-500"
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
          <h4 className="text-4xl mb-4 text-center font-bold mt-10 text-amber-200">
            Top Songs Played
          </h4>
          <ul className="text-center text-xl flex flex-col justify-center gap-2 mt-2">
            {Object.entries(results.top_10_songs)
              .sort((a, b) => b[1] - a[1])
              .map(([song, count], index) => (
                <li
                  key={song}
                  className="flex flex-col gap-2 font-semibold bg-gray-900 hover:bg-gray-950 transition-all duration-200 rounded-xl p-4"
                >
                  <div className="flex justify-between items-center">
                    <p className={index === 0 ? "text-yellow-300" : ""}>
                      {song} {index < 3 && <span className="text-yellow-300">★</span>}
                    </p>
                    <p className="text-amber-200">{count}</p>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        index < 3 ? "bg-yellow-400" : "bg-amber-500"
                      }`}
                      style={{
                        width: maxSongCount ? `${(count / maxSongCount) * 100}%` : "0%",
                      }}
                    />
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Home;
