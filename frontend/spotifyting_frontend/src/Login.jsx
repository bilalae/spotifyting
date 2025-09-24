import React from "react";
import SpotifyLogo from "./assets/spotifylogo.png"
import { FastForwardIcon, ForwardIcon, Pause, Play, Rewind, RewindIcon, SkipForward } from "lucide-react";
const Login = () => {
  return (
    <section className="flex flex-col lg:flex-row-reverse items-center gap-20 justify-center text-center bg-base-200 py-12" id="login">
        <div className="flex flex-col items-left gap-6">
      <div className="flex gap-3 text-left flex-col">
        <h1 className="text-3xl font-bold">Login with Spotify</h1>
        <p>
          Logging in with Spotify lets you control and see your music realtime
          within the app
        </p>
      </div>

      <div>
        <button className="btn bg-base-300 text-green-500 flex hover:border-1 hover:border-base-100 items-center gap-2 btn-lg"
        onClick={() => window.open("http://127.0.0.1:5000/callback", "_blank")}
        >
            <img src={SpotifyLogo} alt="" className="w-6 h-6"/>
          Login with Spotify
        </button>
      </div>
        </div>

      <div className="card bg-amber-600/10 w-80 h-100">
        <figure style={{ boxShadow: "0 0 100px rgba(180, 83, 9, 0.3)" }}> 
            <img src="https://i.scdn.co/image/ab67616d0000b273ac0c2daf1867b0d86cca74be" alt="Take Care" />
        </figure>
        <div className="card-body px-4 py-4 gap-0">
            <h2 className="card-title text-lg">Over My Dead Body</h2>
            <p className="text-start text-md text-amber-300/60">Drake</p>
            <div className="card-actions justify-center mt-2">
                <button className="btn-circle btn btn-ghost">
                    <RewindIcon className="text-amber-300/60" />
                    </button>

                <button className="btn-circle btn btn-ghost">
                    <Pause className="text-amber-300/60"/>
                </button>

                <button className="btn-circle btn btn-ghost">
                    <FastForwardIcon className="text-amber-300/60"/>
                </button>
            </div>
        </div>

      </div>
    </section>
  );
};

export default Login;
