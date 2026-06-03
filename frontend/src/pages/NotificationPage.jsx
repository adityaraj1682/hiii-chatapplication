import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { acceptFriendRequest, getFriendRequests, rejectFriendRequest, removeNotification } from '../lib/api'
import { ClockIcon, UserCheckIcon, MessageSquareIcon, X } from 'lucide-react'
import NoNotificationFound from '../components/NoNotificationFound.jsx'
import { toast } from 'react-hot-toast'

const NotificationPage = () => {
  const queryClient = useQueryClient()
  
  const { data: friendRequests, isLoading } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  })

  // Accept Mutation
  const { mutate: acceptRequestMutation, isPending: isAccepting } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success("Friend request accepted!");
    },
    onError: (error) => {
      console.error("Failed to accept request:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to accept request");
    }
  })

  // Reject Mutation
  const { mutate: rejectRequestMutation, isPending: isRejecting } = useMutation({
    mutationFn: rejectFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success("Request rejected");
    },
    onError: (error) => {
      console.error("Failed to reject request:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to reject request");
    }
  })

  // Dismiss Notification Mutation
  const { mutate: removeNotificationMutation, isPending: isRemoving } = useMutation({
    mutationFn: removeNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success("Notification cleared");
    },
    onError: (error) => {
      console.error("Failed to remove notification:", error);
      toast.error("Failed to clear notification");
    }
  })
  
  const IncomingRequests = friendRequests?.incomingReqs || []
  const acceptedRequests = friendRequests?.acceptedReqs || []

  return (
    <div className='p-4 sm:p-6 lg:p-6'>
      <div className='container mx-auto max-w-4xl space-y-8'>
        <h1 className='text-2xl sm:text-3xl font-bold tracking-tight mb-6'>Notifications</h1>

        {isLoading ? (
          <div className='flex justify-center py-12'>
            <span className='loading loading-spinner loading-lg'></span>
          </div>
        ) : (
          <>
            {/* ========================================= */}
            {/* 1. INCOMING FRIEND REQUESTS               */}
            {/* ========================================= */}
            {IncomingRequests.length > 0 && (
              <section className='space-y-4'>
                <h2 className='text-xl font-semibold flex items-center gap-2'>
                  <UserCheckIcon className='h-5 w-5 text-primary'/>
                  Friend Requests
                  <span className='badge badge-primary ml-2'>{IncomingRequests.length}</span>
                </h2>
                
                <div className='space-y-3'>
                  {IncomingRequests.map((request) => (
                    <div key={request._id} className='card bg-base-200 hover:shadow-md transition-shadow'>
                      <div className='card-body p-4'> 
                        <div className='flex items-center justify-between'>
                          
                          <div className='flex items-center gap-3'>
                            <div className='avatar w-14 h-14 rounded-full overflow-hidden bg-base-300'>
                              <img 
                                src={request.sender?.profilePic || "/avatar.png"} 
                                alt={request.sender?.fullName || "User"} 
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div>
                              <h3 className='font-semibold'>{request.sender?.fullName || "Unknown User"}</h3>
                              <p className='text-sm opacity-70'>Sent you a request</p>
                            </div>
                          </div>

                          <div className='flex gap-2'>
                            <button
                              className='btn btn-primary btn-sm'
                              onClick={() => acceptRequestMutation(request._id)}
                              disabled={isAccepting || isRejecting}
                            >
                              {isAccepting ? 'Accepting...' : 'Accept'}
                            </button>

                            <button
                              className='btn btn-outline btn-error btn-sm'
                              onClick={() => rejectRequestMutation(request._id)}
                              disabled={isAccepting || isRejecting}
                            >
                              {isRejecting ? 'Rejecting...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ========================================= */}
            {/* 2. ACCEPTED REQUESTS                      */}
            {/* ========================================= */}
            {acceptedRequests.length > 0 && (
              <section className='space-y-4 mt-8'>
                <h2 className='text-xl font-semibold flex items-center gap-2'>
                  Recent Updates
                </h2>
                <div className='space-y-3'>
                  {acceptedRequests.map((notification) => (
                    <div key={notification._id} className='card bg-base-200 shadow-sm relative'>
                      
                      {/* 🛠️ FIXED DISMISS BUTTON: Always visible, clean positioning */}
                      <button 
                        onClick={() => removeNotificationMutation(notification._id)}
                        disabled={isRemoving}
                        className='absolute top-3 right-3 p-1.5 rounded-full hover:bg-base-300 text-base-content/60 hover:text-error transition-colors z-10'
                        title="Dismiss notification"
                      >
                        <X className='w-4 h-4' />
                      </button>

                      <div className='card-body p-4 pr-10'>
                        <div className='flex items-start gap-3'>
                          <div className='avatar mt-1 size-10 rounded-full overflow-hidden bg-base-300'>
                            <img 
                              src={notification.recipient?.profilePic || "/avatar.png"}
                              alt={notification.recipient?.fullName || "User"} 
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className='flex-1'>
                            <h3 className='font-semibold'>{notification.recipient?.fullName || "Someone"}</h3>
                            <p className='text-sm my-1'>
                              {notification.recipient?.fullName || "Someone"} accepted your friend request
                            </p>
                            <p className='text-xs flex items-center opacity-70'>
                              <ClockIcon className='h-3 w-3 mr-1'/>
                              Recently         
                            </p>
                          </div>
                          <div className='badge badge-success hidden sm:inline-flex'>
                            <MessageSquareIcon className='h-2 w-3 mr-1'/>
                            New Friend
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ========================================= */}
            {/* 3. EMPTY STATE                            */}
            {/* ========================================= */}
            {IncomingRequests.length === 0 && acceptedRequests.length === 0 && (
              <NoNotificationFound/>
            )}
          </>
        )}
      </div>     
    </div>
  )
}

export default NotificationPage