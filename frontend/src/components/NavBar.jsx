import React, { useState, useRef, useEffect } from 'react'
import useAuthUser from '../hooks/useAuthUser'
import { useLocation, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { axiosInstance } from '../lib/axios'
import { Bell, Zap, LogOut, Search, UserPlus, Settings, X, AlertTriangle } from 'lucide-react' // 🔥 Added AlertTriangle
import ThemeSelector from './ThemeSelector'
import useLogout from '../hooks/useLogout'
import SettingsModal from './SettingsModal'
import toast from 'react-hot-toast'

const NavBar = () => {
  const { authUser } = useAuthUser()
  const location = useLocation()
  const isChatPage = location.pathname?.startsWith("/chat")
  const { logoutMutation } = useLogout()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDropdownVisible, setIsDropdownVisible] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false) // 🔥 NEW: Logout modal tracking state
  
  const dropdownRef = useRef(null)
  const mobileRef = useRef(null)

  // 🔥 NEW FEATURE: Fetch notification requests count to toggle the red indicator dot
  const { data: friendRequests = [] } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: async () => {
      const res = await axiosInstance.get('/users/friend-requests');
      return res.data;
    },
  });
  const hasNotifications = friendRequests.length > 0;

  // Live Database Search Query
  const { data: searchResults = [], isPending } = useQuery({
    queryKey: ["searchUsers", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await axiosInstance.get(`/users/search?q=${searchQuery}`);
      return res.data;
    },
    enabled: searchQuery.trim().length > 0, 
  });

  // Keep dropdown visible while text exists
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsDropdownVisible(true)
    } else {
      setIsDropdownVisible(false)
    }
  }, [searchQuery])

  // 🌟 MACBOOK FIX 1: Use 'pointerdown' instead of 'mousedown'. 
  // This catches physical trackpad clicks, force touches, and tap-to-clicks seamlessly.
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideDesktop = dropdownRef.current && dropdownRef.current.contains(event.target);
      const clickedInsideMobile = mobileRef.current && mobileRef.current.contains(event.target);
      
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setIsDropdownVisible(false);
      }
    }
    
    document.addEventListener("pointerdown", handleClickOutside)
    return () => document.removeEventListener("pointerdown", handleClickOutside)
  }, [])

  // 🤝 Unified Connect Handler for MacBook, Windows, & Mobile
  const handleConnectAction = async (e, userId, userFullName) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    try {
      await axiosInstance.post(`/users/friend-request/${userId}`);
      toast.success(`Connection request sent to ${userFullName}!`);
      
      // 🌟 MACBOOK FIX 2: Explicitly clear inputs, collapse layout states, and kill browser focus hooks
      setSearchQuery("");
      setIsDropdownVisible(false);
      setShowMobileSearch(false);
      
      if (document.activeElement) {
        document.activeElement.blur();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to issue connection request.");
    }
  }

  // Clear Search Function
  const handleClearSearch = (e) => {
    e.preventDefault();
    setSearchQuery("");
    setIsDropdownVisible(false);
  }

  // Reusable Search Result Dropdown
  const renderDropdownContents = () => (
    <div className="absolute top-11 left-0 w-full bg-base-300 border border-neutral/30 rounded-2xl shadow-2xl p-2 max-h-64 overflow-y-auto space-y-1 z-50 block custom-scrollbar">
      {isPending && (
        <div className="flex items-center justify-center p-4">
          <span className="loading loading-spinner loading-sm text-primary"></span>
        </div>
      )}

      {!isPending && searchResults.length === 0 && (
        <div className="text-center p-4 text-xs text-base-content opacity-60">
          No users found matching "{searchQuery}"
        </div>
      )}

      {!isPending && searchResults.length > 0 && searchResults.map((user) => {
        const isCurrentUser = user._id === authUser?._id;
        
        return (
          <div 
            key={user._id} 
            className={`flex items-center justify-between p-2 rounded-xl transition-colors border ${
              isCurrentUser
                ? "bg-primary/10 border-primary/30" 
                : "bg-base-100 hover:bg-base-200 border-base-300"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img 
                src={user.profilePic || "/avatar.png"} 
                alt={user.fullName} 
                className="size-8 rounded-full object-cover border border-primary/20 flex-shrink-0"
              />
              <div className="text-left min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold leading-tight text-base-content flex items-center gap-1">
                  <span className="truncate block max-w-[100px] sm:max-w-none">{user.fullName}</span>
                  {isCurrentUser && (
                    <span className="text-[9px] text-primary font-normal bg-primary/10 px-1.5 py-0.2 rounded-full flex-shrink-0">
                      You
                    </span>
                  )}
                </h4>
                <span className="text-[10px] opacity-60 block text-base-content/80 truncate max-w-[130px] sm:max-w-[200px]">
                  {user.email}
                </span>
              </div>
            </div>
            
            {isCurrentUser ? (
              <span className="badge badge-outline badge-primary badge-xs text-[9px] font-bold px-1.5 py-2 rounded-md">
                Me
              </span>
            ) : (
              <button 
                type="button"
                className="btn btn-primary btn-xs rounded-lg gap-1 normal-case font-bold shadow-sm px-2.5"
                onMouseDown={(e) => handleConnectAction(e, user._id, user.fullName)}
              >
                <UserPlus className="size-3" />
                <span>Connect</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  )

  return (
    <nav className='bg-base-200 border-b border-base-300 sticky top-0 z-50 h-16 flex flex-col justify-center w-full'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8 w-full'>
        <div className='flex items-center justify-between w-full relative'>
          
          {/* LEFT: Logo Section */}
          <div className='flex items-center min-w-[40px] sm:min-w-[100px]'>
            {isChatPage && (
              <Link to='/' className='flex items-center gap-2.5'>
                <Zap className='size-7 sm:size-8 text-primary' />
                <span className='text-xl sm:text-2xl font-bold font-mono bg-clip-text text-transparent bg-linear-to-r from-primary to-secondary tracking-wider hidden sm:inline'>
                    hiii
                </span>
              </Link>
            )}
          </div>

          {/* DESKTOP/LAPTOP SEARCH BAR */}
          <div ref={dropdownRef} className='hidden md:block flex-1 max-w-md mx-4 relative'>
            <div className='relative w-full'>
              <input
                type="text"
                placeholder="Search friends on hiii..."
                className="input input-bordered input-sm w-full pl-9 pr-8 rounded-full bg-base-300 focus:bg-base-100 transition-all text-sm text-base-content"
                value={searchQuery}
                onFocus={() => { if(searchQuery.trim()) setIsDropdownVisible(true); }}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2 size-4 opacity-50 text-base-content" />
              
              {/* 🌟 DESKTOP CLEAR OPTION */}
              {searchQuery && (
                <button 
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-2 text-xs opacity-50 hover:opacity-100 font-bold"
                >
                  <X className="size-4 text-base-content" />
                </button>
              )}
            </div>

            {isDropdownVisible && renderDropdownContents()}
          </div>

          {/* RIGHT SIDE ITEMS */}
          <div className='flex items-center gap-1.5 sm:gap-3 justify-end flex-1 sm:flex-initial'>
            
            <button 
              className='btn btn-ghost btn-circle btn-sm md:hidden text-base-content opacity-70'
              onClick={() => {
                setShowMobileSearch(!showMobileSearch);
                setSearchQuery(""); 
              }}
            >
              {showMobileSearch ? <X className="h-5 w-5" /> : <Search className='h-5 w-5' />}
            </button>

            <Link to={'/notification'}>
              {/* 🔥 ADDED: Red dot indicator wrapper around original layout */}
              <button className='btn btn-ghost btn-circle btn-sm sm:btn-md indicator'>
                {hasNotifications && (
                  <span className="indicator-item badge badge-error badge-xs translate-x-[-2px] translate-y-[2px] size-2.5 p-0 border-none" />
                )}
                <Bell className='h-5 w-5 sm:h-6 sm:w-6 text-base-content opacity-70' />
              </button>
            </Link>

            <button 
              className='btn btn-ghost btn-circle btn-sm sm:btn-md' 
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className='h-5 w-5 sm:h-6 sm:w-6 text-base-content opacity-70' />
            </button>

            <ThemeSelector />

            {authUser?.profilePic && (
              <div className='avatar hidden xs:inline-block'>
                <div className='w-7 h-7 sm:w-8 sm:h-8 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden'>
                  <img src={authUser.profilePic} alt="User Dashboard Avatar" className="object-cover w-full h-full" />
                </div>
              </div>
            )}

            {/* 🔥 UPDATED: Triggers confirmation popup instead of instant mutation */}
            <button 
              className='btn btn-ghost btn-circle btn-sm sm:btn-md text-error hover:bg-error/10' 
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut className='h-5 w-5 sm:h-6 sm:w-6 opacity-70' />
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE SEARCH TRAY PANEL */}
      {showMobileSearch && (
        <div ref={mobileRef} className="absolute top-16 left-0 w-full bg-base-200 border-b border-base-300 p-3 z-50 md:hidden animate-fadeIn">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search people on hiii..."
              className="input input-bordered input-sm w-full pl-9 pr-8 rounded-xl bg-base-300 text-xs text-base-content focus:outline-none focus:border-primary"
              value={searchQuery}
              autoFocus
              onFocus={() => setIsDropdownVisible(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 size-3.5 opacity-50 text-base-content" />
            
            {searchQuery && (
              <button 
                type="button"
                onClick={handleClearSearch} 
                className="absolute right-3 top-2.5 text-xs opacity-50 hover:opacity-100 font-bold"
              >
                Clear
              </button>
            )}
          </div>
          
          {isDropdownVisible && searchQuery.trim().length > 0 && (
            <div className="relative w-full mt-1">
              {renderDropdownContents()}
            </div>
          )}
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* ========================================== */}
      {/* 🔥 NEW: UNIFIED LOGOUT CONFIRMATION POPUP  */}
      {/* ========================================== */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="card w-full max-w-xs bg-base-100 border border-base-300 shadow-2xl rounded-2xl p-5 text-center space-y-4 scale-95 transition-transform duration-200 ease-out">
            
            {/* Warning Icon Graphic Frame */}
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-error/10 text-error">
              <AlertTriangle className="size-6" />
            </div>

            {/* Prompt Meta Core */}
            <div className="space-y-1">
              <h3 className="text-base font-bold text-base-content">Confirm Logout</h3>
              <p className="text-xs text-base-content/60 leading-relaxed">
                Are you sure you want to end your active session on hiii?
              </p>
            </div>

            {/* Modal Interactive Actions Footer */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button 
                type="button" 
                className="btn btn-sm btn-ghost border border-base-300 rounded-xl font-semibold normal-case text-xs text-base-content/70 hover:bg-base-200"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-sm btn-error text-error-content rounded-xl font-bold normal-case text-xs shadow-xs"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logoutMutation();
                }}
              >
                Yes, Logout
              </button>
            </div>

          </div>
        </div>
      )}
    </nav>
  )
}

export default NavBar;