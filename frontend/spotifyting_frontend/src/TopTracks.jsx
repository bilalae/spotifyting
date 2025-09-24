import { Play } from "lucide-react"
import React from "react"

const TopSongs = ({ songs }) => {


  return (
    <section className="bg-base-100 rounded-xl border-base-300 border py-12">
        <div className="container px-4">
            <h2 className="text-3xl font-bold mb-6 text-center">Your Top Songs</h2> 
            {songs ? (
                <ul className="list flex flex-col gap-2">
                    {Object.entries(songs).sort((a, b) => b[1] - a[1] ).map(([song, count], index) => (
                        <li key={index} className="list-row flex items-center justify-between bg-base-200">
                            <div className="flex gap-2 items-center text-md">
                            <div className="text-primary-content badge badge-outline bg-base-300 badge-sm">{index + 1}</div>
                            <div className="font-semibold text-base-content">{song}</div>
                            </div>

                            
                            <div className="badge rounded-full bg-base-300 flex justify-end items-center gap-2 text-md text-base-content">
                                {count} plays
                            <Play className="w-4 h-4 text-secondary"/>
                                </div>
                           
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-500">Upload your Spotify data to see your top songs.</p>
            )}
        </div>
    </section>  
  )
}

export default TopSongs
