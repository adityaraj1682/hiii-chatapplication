import React from 'react'
import { Navigate, Route, Routes } from 'react-router'
import HomePage from './pages/HomePage.jsx'
import CallPage from './pages/CallPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import NotificationPage from './pages/NotificationPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import SignUpPage from './pages/SignUpPage.jsx'
import FriendsPage from './pages/FriendsPage.jsx'
import { toast,Toaster } from 'react-hot-toast'
import PageLoader from './components/PageLoader.jsx'
import useAuthUser from './hooks/useAuthUser.js'
import  Layout  from './components/Layout.jsx'
import { useThemeStore } from './store/useThemeStore.js'
import MePage from './pages/MePage.jsx'

const App = () => {

  const { isLoading, authUser} = useAuthUser()
  const isAuthenticated = Boolean(authUser)
  const isOnboarded = authUser?.isOnboarded
  const {theme} = useThemeStore()
  
  if (isLoading)
    return <PageLoader/>
  return (
   <div className="h-screen" data-theme={theme}>
    {/* <button onClick={()=>toast.success('Hello')}>Create a toast</button> */}
      <Routes>
        <Route path="/" 
        element={isAuthenticated && isOnboarded ? 
        (<Layout showSidebar>
        <HomePage/>
          </Layout>) : 
        (
          <Navigate to = {!isAuthenticated ? "/login" : "/onboarding" }/>
        )}/>
        
        
        <Route path="/signup" element={!isAuthenticated ? <SignUpPage/> : <Navigate to={!isOnboarded ? "/onboarding" : "/"}/>}/>
        <Route path="/login" element={!isAuthenticated ? <LoginPage/> : <Navigate to={!isOnboarded ? "/onboarding" : "/"} />}/>
        <Route 
              path="/friends" 
              element={
                isAuthenticated && isOnboarded ? (
                  <Layout showSidebar>
                    <FriendsPage />
                  </Layout>
                ) : (
                  <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
                )
              }
            />

          <Route 
              path="/me" 
              element={
                isAuthenticated && isOnboarded ? (
                  <Layout showSidebar>
                    <MePage/>
                  </Layout>
                ) : (
                  <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
                )
              }
            />

        <Route path="/call/:id" 
        element={
          isAuthenticated && isOnboarded ?(
            <CallPage/>
          ) :(
            <Navigate to={!isAuthenticated ? "/login" : "/onboarding"}/>
          )}/>
       
       
        <Route 
        path="/chat/:id" 
        element={
          isAuthenticated && isOnboarded ?
          (<Layout showSidebar={false}>
        <ChatPage/>
          </Layout>) : 
        (
          <Navigate to = {!isAuthenticated ? "/login" : "/onboarding" }/>
        )}/>



        <Route path="/notification" element={isAuthenticated && isOnboarded ? (
        <Layout showSidebar={true}>
          <NotificationPage/>
        </Layout>) :
        (
          <Navigate to={!isAuthenticated ? "/login" : "/onboarding"}/>
        )}/>
       
       
        <Route path="/onboarding" 
        element={isAuthenticated ? 
          (!isOnboarded ? <OnboardingPage/> : <Navigate to="/"/> ) 
          : (<Navigate to="/login" />)
          }/>
        
        
     
      </Routes>
     
     
      <Toaster />
  </div>
  )
}

export default App
