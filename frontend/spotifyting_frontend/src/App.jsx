import { useState } from 'react'
import './App.css'
import Home from './Home'
import Navbar from './Navbar'
import Hero from './Hero'

import ImportZip from './ImportZip'
import TopTracks from './TopTracks'
import TopArtists from './TopArtists'
import Login from './Login'
import PlayerCard from './player/PlayerCard'
import MostSkipped from './MostSkipped'
function App() {
  const [results, setResults] = useState(null);
 console.log(results)
 const {
  amount_of_tracks,
  avg_track_duration,
  least_skipped,
  most_skipped,
  timeframe,
  top_10_artists,
  top_10_songs,
  total_listening_hours
} = results || {};


console.log(most_skipped)
  return (
    <div data-theme="spotify">
      <Navbar />
      <Hero />
      <ImportZip onUploadSuccess={setResults}/>
      {
        results &&
        <div className='flex gap-4 bg-base-200 justify-center w-full px-28 py-8 items-stretch'>
          <div className='flex-1'>
          <TopTracks songs={top_10_songs} />
         </div>
        <div className='flex-1'>
          <TopArtists artists={top_10_artists} />
        </div>
        </div>
      }
      <MostSkipped most_skipped={most_skipped}/>
      <Login />
      <PlayerCard />
    </div>
  )
}

export default App
