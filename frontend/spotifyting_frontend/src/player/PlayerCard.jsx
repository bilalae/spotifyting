import { useState, useEffect } from "react";
import useCurrentTrack from "../hooks/useCurrentTrack";
import PreviousButton from "./PreviousButton";
import SkipButton from "./SkipButton";
import PlayPauseButton from "./PlayPauseButton";
import useAlbumColors from "../hooks/useAlbumColors";
import ProgressBar from "./ProgressBar";
import { ArrowDown, ArrowUp } from "lucide-react";

export default function PlayerCard() {
  const { track, error } = useCurrentTrack();
const [isVisible, setIsVisible] = useState(true);

  const albumUrl = track?.item?.album?.images?.[0]?.url || "";
  const colors = useAlbumColors(albumUrl);

  const primaryRGBA = colors.primary + "20"; // 20% opacity
  const secondaryRGBA = colors.secondary + "20";

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

  const formatMs = (ms) => {
    if (!ms) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };


  if (!track?.item) return null;

  const t = track.item;

  return (
    <> 
    {t && 
      <div>
    <button
  className={`fixed bottom-2 right-2 z-100 btn bg-white/5 backdrop-blur-lg btn-sm ${isVisible ? "bottom-22" : ""} `}
  onClick={() => setIsVisible(!isVisible)}
>
  {isVisible ? 
  <div className="flex gap-1 items-center p-0">
    <ArrowDown className="text-secondary"/>
    Hide
  </div>
   :
   <div className="flex gap-1 items-center p-0">
     <ArrowUp className="text-secondary"/>
     Player
   </div>
  }
</button>

    {isVisible && 
      <div
    className="fixed bottom-0 left-0 z-50 flex items-center gap-3 px-0 pb-3 pt-2
               w-screen bg-white/5 backdrop-blur-lg border-t border-white/10
               "
    style={{
      boxShadow: `0 0px 16px 0px ${primaryRGBA}, 0 0px 16px 0px ${secondaryRGBA}`,
    }}
  >
    <div className="w-14 h-14 flex-shrink-0 ml-3">
      <img
        src={albumUrl}
        alt="Album Art"
        className="w-full h-full rounded-xl shadow-lg ring-1 ring-white/20 object-cover"
      />
    </div>
  
    <div className="flex-1 flex flex-col gap-0 overflow-hidden min-w-0 mx-3">
      <p className="font-semibold text-white text-xs md:text-base truncate">
        {t.name}
      </p>
      <p
        className="text-xs md:text-sm mt-0 mb-2 font-semibold truncate"
        style={{ color: colors?.secondary || "#ccc" }}
      >
        {t.artists.map((a) => a.name).join(", ")}
      </p>
  
      <ProgressBar progress={progress} duration={t.duration_ms} colors={colors} />
    </div>
  
    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 mr-3">
      <PreviousButton />
      <PlayPauseButton />
      <SkipButton />
    </div>
  </div>
    }
  <div/>
    </div>
    
    }
  
    </>

  );
}
