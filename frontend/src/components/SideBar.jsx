import React from 'react'
import useAuthUser from '../hooks/useAuthUser'
import { Link, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { axiosInstance } from '../lib/axios'
import { Bell, HomeIcon, User, UserRound, Zap } from 'lucide-react'

const SideBar = () => {
    const {authUser} = useAuthUser()
    const location = useLocation()
    const currentPath = location.pathname
    console.log("Current User:", authUser);

    // Fetch notification requests count to toggle the red indicator dot
    const { data: friendRequests = [] } = useQuery({
      queryKey: ["friendRequests"],
      queryFn: async () => {
        const res = await axiosInstance.get('/users/friend-requests');
        return res.data;
      },
    });
    const hasNotifications = friendRequests.length > 0;

  return (
    <aside className='w-64 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0'>
        <div className='p-5 border-b border-base-300'>
            <Link to='/' className='flex items-center gap-2.5'>
                <Zap className='size-9 text-primary'/>
                <span className='text-3xl font-bold font-mono bg-clip-text text-transparent bg-linear-to-r from-primary to-secondary tracking-wider'>
                    hiii
                </span>
            </Link>
        </div>

        <nav className='flex-1 p-4 space-y-1'>
            <Link 
                to='/' 
                className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
                    currentPath === "/" ? "bg-base-100 btn-active" : ""
                }`}
                >
                <HomeIcon className='size-5 text-base-content opacity-70'/>
                <span>Home</span>
            </Link>
            <Link 
                to='/friends' 
                className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
                    currentPath === "/friends" ? "bg-base-100 btn-active" : ""
                }`}
                >
                <UserRound className='size-5 text-base-content opacity-70'/>
                <span>Friends</span>
            </Link>
            <Link 
                to='/notification' 
                className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case indicator ${
                    currentPath === "/notification" ? "bg-base-100 btn-active" : ""
                }`}
                >
                {hasNotifications && (
                  <span className="indicator-item badge badge-error badge-xs right-4 top-4 size-2.5 border-none" />
                )}
                <Bell className='size-5 text-base-content opacity-70'/>
                <span>Notifications</span>
            </Link>
            <Link
                to='/me' 
                className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
                    currentPath === "/me" ? "bg-base-100 btn-active" : ""
                }`}
                >
                <User className='size-5 text-base-content opacity-70'/>
                <span>Me</span>
            </Link>

            
        </nav>
        {/* User profile section */}
        <div className='p-4 border-t border-base-300 mt-auto'>
            <div className='flex items-center gap-3'>
                <div className='avatar'>
                    <div className='w-10 rounded-full'>
                        <img src={authUser?.profilePic || "/avatar.png"} alt="profile" />
                    </div>
                </div>
                <div className='flex-1'>
                    <p className='font-semibold text-sm text-base-content'>{authUser?.fullName}</p>
                    <p className='text-xs text-success flex items-center gap-1'>
                    <span className='size-2 rounded-full bg-success inline-block'/>
                        Online
                    </p>
                </div>
            </div>
        </div>
        
    </aside>
  )
}

export default SideBar;