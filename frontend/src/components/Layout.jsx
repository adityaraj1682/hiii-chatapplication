import React from 'react'
import SideBar from './SideBar'
import NavBar from './NavBar'
import BottomBar from './BottomBar' 

const Layout = ({ children, showSidebar = false }) => {
  return (
    <div className='h-screen overflow-hidden flex'>
        
        {/* 1. SIDEBAR (Laptop/Desktop Only) */}
        {/* Hidden on phones and tablets, visible on laptops (lg) and larger */}
        {showSidebar && (
            <div className='hidden lg:flex h-full z-20'>
                <SideBar />
            </div>
        )}

        {/* MAIN COLUMN */}
        <div className='flex-1 flex flex-col h-full relative'>
            
            {/* 2. TOP NAVBAR (Always Visible) */}
            <NavBar />

            {/* 3. MAIN CONTENT AREA */}
            {/* pb-16 adds padding on phones/tablets so the BottomBar doesn't hide content. lg:pb-0 removes it on laptops. */}
            <main className='flex-1 overflow-y-auto pb-16 lg:pb-0'>
                {children}
            </main>

            {/* 4. BOTTOM BAR (Phones & Tablets Only) */}
            {/* Visible everywhere EXCEPT laptops/desktops (lg:hidden) */}
            {showSidebar && (
                <div className='lg:hidden fixed bottom-0 left-0 w-full z-50 bg-base-100 border-t border-base-300'>
                    <BottomBar />
                </div>
            )}
        </div>
        
    </div>
  )
}

export default Layout