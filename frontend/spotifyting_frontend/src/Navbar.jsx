import React from 'react'
import { Link } from 'react-scroll';


const Navbar = () => {
  return (
    <nav className='navbar bg-base-100 px-4 py-2 shadow-md flex justify-between items-center'>
        <div className='navbar-start'>
            <a className='btn btn-ghost normal-case text-xl' href="/">Spotifyting</a>
        </div>

        <div className='navbar-end'>
            <button className='btn btn-md btn-outline btn-primary'>
                  <Link
    to="import"          // id of the target element
    smooth={'easeInOutQuart'}       // enables smooth scrolling
    duration={800}       // ms
           // optional header offset
  >
    Import
  </Link>
            </button>
            <button className='btn btn-md btn-primary ml-2'>
                <a href="#login">
                Login with Spotify
                </a>
            </button>
        </div>
    </nav>
  )
}

export default Navbar