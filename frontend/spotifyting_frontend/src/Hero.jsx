import React from 'react'
import { Music, BarChart3, User, PlayCircle, Mic} from "lucide-react";



const Hero = () => {
  return (
    <div className='hero min-h-screen bg-base-200 flex gap-2 items-center justify-center'>
        <div className='hero-content max-w-2xl flex flex-col items-start'>
            <h1 className='text-5xl font-bold'>Welcome to Spotifyting</h1>
            <p className='py-6 text-lg'>Every play tells a story. See how your moods, seasons, and late-night playlists come together to create a musical fingerprint that’s uniquely yours.</p>
            <button className='btn btn-primary btn-lg'>Get Started</button>
        </div>

        <div className='stats stats-vertical shadow mt-10'>
            <div className='stat'>
                <div className='stat-figure text-secondary'>
                <PlayCircle className='h-8 w-8'/>

                </div>
                <div className='stat-title text-primary'>Total Plays</div>
                <div className='stat-value text-secondary'>31.6K</div>
                <div className='stat-desc text-accent'>21% more than last month</div>
                
                    
            </div>

            <div className='stat'>
                <div className='stat-figure text-secondary'>
                <Music className='h-8 w-8'/>
                </div>
                <div className='stat-title text-primary'>Top Genre</div>
                <div className='stat-value text-secondary'>Rap/Hip-hop</div>
                <div className='stat-desc text-accent'>5% more than last month</div>
            </div>

            <div className='stat'>
                <div className='stat-figure text-secondary'>
                <Mic className='h-8 w-8'/>
                </div>
                <div className='stat-title text-primary'>Top Artist</div>
                <div className='stat-value text-secondary'>Drake</div>
                <div className='stat-desc text-accent'>89% more than last month 

                </div>
            </div>
        </div>

    </div>
  )
}

export default Hero