import { useState, useEffect } from "react";
import useCurrentTrack from "../hooks/useCurrentTrack";
import PreviousButton from "./PreviousButton";
import SkipButton from "./SkipButton";
import PlayPauseButton from "./PlayPauseButton";
import useAlbumColors from "../hooks/useAlbumColors";
import ProgressBar from "./ProgressBar";

export default function PlayerCard() {
  const { track, error } = useCurrentTrack();

  // ✅ Always define albumUrl even if track is null
  const albumUrl = track?.item?.album?.images?.[0]?.url || "";
  const colors = useAlbumColors(albumUrl); 

  // Soft RGBA for glow
  const primaryRGBA = colors.primary + "33";   // 20% opacity
  const secondaryRGBA = colors.secondary + "33"; 

  // Local progress state for smooth updates
  const [progress, setProgress] = useState(track?.progress_ms || 0);

  useEffect(() => {
    if (!track?.item) return;
    setProgress(track.progress_ms || 0);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (!track?.item?.duration_ms) return p;
        return Math.min(p + 1000, track.item.duration_ms);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [track]);

  // Format ms to mm:ss
  const formatMs = (ms) => {
    if (!ms) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (error) return <p className="text-red-400">{error}</p>;
  if (!track?.item) return null;

  const t = track.item;

  return (
    <div
      className="relative border border-white/20 bg-white/10 backdrop-blur-xl
                 md:w-fit md:mx-auto rounded-3xl p-6 mb-6 shadow-2xl
                 flex flex-col items-center gap-6 transition-all duration-300 hover:bg-white/15"
    >
      <div className="flex gap-6 items-center">
        {/* Album Art with soft colored glow */}
        <div>
          <img
            src={albumUrl}
            alt="Album Art"
            className="w-40 h-40 rounded-2xl shadow-lg ring-1 ring-white/20"
            style={{
              boxShadow: `
                0 0 60px 30px ${primaryRGBA}, 
                0 0 100px 50px ${secondaryRGBA}`
            }}
          />
        </div>

        <div className="flex flex-col gap-5 flex-1">
          {/* Track info */}
          <div>
            <p className="font-semibold text-white text-xl leading-tight">
              {t.name}
            </p>
            <p
              className="text-md mt-1 font-semibold"
              style={{ color: colors?.secondary || "#ccc" }}
            >
              {t.artists.map((a) => a.name).join(", ")}
            </p>
          </div>

          {/* Progress bar + time */}
          <div className="flex flex-col gap-2 w-full">
            <ProgressBar
              progress={progress}
              duration={t.duration_ms}
              colors={colors}
            />
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              <span style={{ color: colors?.secondary || "#ccc" }}>{formatMs(progress)}</span>
              <span style={{ color: colors?.secondary || "#ccc" }}>{formatMs(t.duration_ms)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-8 mt-3">
            <PreviousButton />
            <PlayPauseButton />
            <SkipButton />
          </div>
        </div>
      </div>
    </div>
  );
}
