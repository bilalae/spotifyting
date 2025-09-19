import { useState, useEffect } from "react";
import { Vibrant } from "node-vibrant/browser"; // Use the browser-compatible import

export default function useAlbumColors(imageUrl) {
  const [colors, setColors] = useState({
    primary: "#ffffff",
    secondary: "#888888",
  });

  useEffect(() => {
    if (!imageUrl) return;

    Vibrant.from(imageUrl)
      .getPalette()
      .then((palette) => {
        setColors({
          primary: palette.Vibrant?.hex || "#ffffff",
          secondary: palette.Muted?.hex || "#888888",
        });
      })
      .catch(console.error);
  }, [imageUrl]);

  return colors;
}
