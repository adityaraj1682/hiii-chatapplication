import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import React from 'react'
import useAuthUser from '../hooks/useAuthUser'
import { getOutgoingFriendReqs, getRecommendedUsers, getUserfriends, sendFriendRequest } from '../lib/api'
import { Link } from 'react-router'
import { House, MapIcon, UserIcon, UserPlusIcon, UserRound, X, CheckCircleIcon } from 'lucide-react' // Added CheckCircleIcon to prevent icon crashes
import FriendCard from '../components/FriendCard'
import NoFriendsFound from '../components/NoFriendsFound'
import { useState } from 'react'
import { useEffect } from 'react'

const FriendsPage = () => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()
  const [outgoingRequestsIds, setoutgoingRequestsIds] = useState(new Set())
  const [dismissedUserIds, setDismissedUserIds] = useState(new Set())
  
  // Mobile Navigation Tab State Toggle
  const [activeTab, setActiveTab] = useState('feed') 

  const {data:friends= [], isLoading:loadingFriends} = useQuery({
    queryKey: ["friends"],
    queryFn: getUserfriends
  }) 
  const {data:recommendedUsers=[],isLoading:loadingUsers} = useQuery({
    queryKey: ["users"],
    queryFn: getRecommendedUsers
  })

  const {data:outgoingFriendReqs} =useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs
  })
  
  const {mutate:sendRequestMutation, isPending} = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => queryClient.invalidateQueries({queryKey:["outgoingFriendReqs"]}),
    onError: (error) => console.log("Mutation failed:", error.response?.data || error.message)
  })

  const friendsList = Array.isArray(friends) ? friends : (friends?.friends || []);

  useEffect(()=>{
    const outgoingIds = new Set()
    if(outgoingFriendReqs && outgoingFriendReqs.length> 0){
      outgoingFriendReqs.forEach((req)=>{
        outgoingIds.add(req.recipient._id)
      })
      setoutgoingRequestsIds(outgoingIds)
    }
  },[outgoingFriendReqs])

  const visibleRecommendations = recommendedUsers.filter(user => !dismissedUserIds.has(user._id));

  const handleDismissUser = (userId) => {
    setDismissedUserIds(prev => {
      const newSet = new Set(prev)
      newSet.add(userId)
      return newSet
    })
  }

  return (
    // Added a little more bottom padding (pb-24) so content doesn't get cut off by the phone's bottom navigation bar
    <div className='p-4 sm:p-6 lg:p-8 min-h-screen w-full bg-base-100 text-base-content pb-24 lg:pb-8 relative'>
      <div className='container mx-auto space-y-10'>
        
        {/* ========================================================================= */}
        {/* SECTION 1: FRIENDS LIST VIEW COLUMN                                       */}
        {/* ========================================================================= */}
        <div className={`${activeTab === 'feed' ? 'block' : 'hidden lg:block'} space-y-6 animate-fadeIn`}>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
            <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>
              Friends
            </h2>
            <Link to='/notification' className='btn btn-outline btn-sm border-radius rounded-2xl'>
              <UserIcon className='mr-2 size-4'/>
              Friend Requests 
            </Link>
          </div>

          {loadingFriends ? (
            <div className='flex justify-center py-12'>
              <span className='loading loading-spinner loading-lg'/>
            </div>
          ) : friendsList.length === 0 ? (
            <NoFriendsFound />
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4'>
              {friendsList.map((friend) => (
                <FriendCard key={friend._id} friend={friend} />
              ))}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: RECOMMENDED USERS VIEW COLUMN                                  */}
        {/* ========================================================================= */}
        {/* 🌟 FIX: Removed "hidden lg:block" so this section displays right underneath your friends on mobile, just like desktop! */}
        <section className="block pt-4 border-t border-base-300 animate-fadeIn">
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
            <div>
              <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>Recommended</h2>
            </div>
          </div>

          {loadingUsers ? (
            <div className='flex justify-center py-12'>
              <span className='loading loading-spinner loading-lg'/>
            </div>
          ) : visibleRecommendations.length === 0 ? ( 
              <div className="card bg-base-200 p-6 text-center mt-5">
                <h3 className="font-semibold text-lg mb-2">No recommended Users</h3>
              </div>
          ) : (
            <div className='grid grid-cols-1 mt-4 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {visibleRecommendations.map((user) => {
                const hasRequestBeenSent = outgoingRequestsIds.has(user._id)
                const totalFriends = user.friendCount ?? user.friends?.length ?? 0;
                const myFriendsList = authUser?.friends || [];
                const recommendedUserFriendsList = user.friends || [];
                
                const normalizedRecommendedFriends = recommendedUserFriendsList.map(f => f._id || f);
                const normalizedMyFriends = myFriendsList.map(f => f._id || f);

                const mutualCount = normalizedRecommendedFriends.filter(friendId => 
                  normalizedMyFriends.includes(friendId)
                ).length;

                return (
                  <div key={user._id} className='card bg-base-200 hover:shadow-lg transition-all duration-300 relative'> 
                    
                    <button 
                      onClick={() => handleDismissUser(user._id)}
                      className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-base-300 text-neutral-content/70 hover:text-error transition-colors"
                      title="Remove recommendation"
                    >
                      <X className="size-4" />
                    </button>

                    <div className='card-body p-5 space-y-4'>
                      <div className='flex items-center gap-3 pr-6'> 
                        <div className='avatar size-16 rounded-full overflow-hidden flex-shrink-0'>
                          <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="w-full h-full object-cover"/>
                        </div>

                        <div>
                          <h3 className='font-semibold text-lg leading-tight'>{user.fullName}</h3>
                          
                          <p className='text-xs text-gray-500 mt-0.5 font-medium'>
                            {totalFriends === 0 ? "No friends" : totalFriends === 1 ? "1 friend" : `${totalFriends} friends`}
                          </p>

                          <p className='text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5'>
                            {mutualCount === 0 ? "No mutual connections" : mutualCount === 1 ? "1 mutual connection" : `${mutualCount} mutual connections`}
                          </p>

                          {user.location && (
                            <div className='flex items-center text-xs opacity-70 mt-1'>
                              <MapIcon className='size-3 mr-1'/>
                              {user.location}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {user.bio && <p className='text-sm opacity-70 line-clamp-2'>{user.bio}</p>}

                      <button 
                        className={`btn w-full mt-2 rounded-3xl ${
                          hasRequestBeenSent ? "btn-disabled" : "btn-primary"
                        }`} 
                        onClick={() => { sendRequestMutation(user._id) }}
                        disabled={hasRequestBeenSent || isPending}
                      >
                        {hasRequestBeenSent ? (
                          <>
                            <CheckCircleIcon className='size-4 mr-2 '/>
                            Request Sent
                          </>
                        ) : (
                          <>
                            <UserPlusIcon className='size-4 mr-2 '/>
                            Send Friend Request
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>    

      {/* ========================================================================= */}
      {/* 📱 WHATSAPP MOBILE/TABLET BOTTOM NAVIGATION BAR                          */}
      {/* ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-base-100/90 backdrop-blur-md border-t border-base-300 flex items-center justify-around px-4 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-200 ${
            activeTab === 'feed' ? 'text-primary' : 'text-base-content/60'
          }`}
        >
          <div className={`px-6 py-1 rounded-full transition-all duration-300 mb-0.5 ${
            activeTab === 'feed' ? 'bg-primary/10 text-primary scale-105' : 'bg-transparent'
          }`}>
            <House className="size-5" />
          </div>
          <span className={`text-[10px] tracking-wide font-medium ${activeTab === 'feed' ? 'font-bold' : 'opacity-70'}`}>
            Home
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recommendations')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-200 ${
            activeTab === 'recommendations' ? 'text-primary' : 'text-base-content/60'
          }`}
        >
          <div className={`px-6 py-1 rounded-full transition-all duration-300 mb-0.5 ${
            activeTab === 'recommendations' ? 'bg-primary/10 text-primary scale-105' : 'bg-transparent'
          }`}>
            <UserRound className="size-5" />
          </div>
          <span className={`text-[10px] tracking-wide font-medium ${activeTab === 'recommendations' ? 'font-bold' : 'opacity-70'}`}>
            Recommended
          </span>
        </button>
      </nav>

    </div>
  )
}

export default FriendsPage;