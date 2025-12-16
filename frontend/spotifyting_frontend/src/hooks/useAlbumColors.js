import { useState, useEffect } from "react";
import { Vibrant } from "node-vibrant/browser";

export default function useAlbumColors(imageUrl) {
  const [colors, setColors] = useState({
    primary: "#ffffff",
    secondary: "#cccccc",
  });

  useEffect(() => {
    if (!imageUrl) return;

    Vibrant.from(imageUrl)
      .getPalette()
      .then((palette) => {
        setColors({
          // Prefer light swatches for a softer, album-art feel
          primary: palette.LightVibrant?.hex || palette.Vibrant?.hex || "#ffffff",
          secondary: palette.LightMuted?.hex || palette.Muted?.hex || "#cccccc",
        });
      })
      .catch(console.error);
  }, [imageUrl]);

  return colors;
}
