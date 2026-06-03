import React from 'react'
import { Link, useLocation } from 'react-router' // 🌟 Pure router navigation
import { House, UserRound, User } from 'lucide-react' 

// 🌟 FIX: Completely removed the old { activeTab, setActiveTab } broken props!
const HomeMobileBottomBar = () => {
  const location = useLocation()
  const currentPath = location.pathname

  // Unified configuration map for your application paths
  const tabs = [
    { path: '/', name: 'Home', icon: House },
    { path: '/friends', name: 'Friends', icon: UserRound },
    { path: '/me', name: 'Me', icon: User }, 
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-base-100/90 backdrop-blur-md border-t border-base-300 flex items-center justify-around px-4 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        // Automatically calculate active highlights based directly on the browser URL path string
        const isActive = currentPath === tab.path
        const Icon = tab.icon

        return (
          <Link
            key={tab.path}
            to={tab.path}
            // 🌟 FIXED: No onClick triggers or state handlers here to cause runtime crashes!
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-200 relative ${
              isActive ? 'text-primary' : 'text-base-content/60'
            }`}
          >
            {/* WhatsApp style background capsule layout animation */}
            <div className={`px-6 py-1 rounded-full transition-all duration-300 mb-0.5 ${
              isActive ? 'bg-primary/10 text-primary scale-105' : 'bg-transparent'
            }`}>
              <Icon className="size-5 transition-transform duration-200" />
            </div>
            
            {/* Label Text */}
            <span className={`text-[10px] tracking-wide font-medium transition-all ${
              isActive ? 'font-bold text-primary' : 'opacity-70'
            }`}>
              {tab.name}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export default HomeMobileBottomBar;