import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import useAuthUser from '../hooks/useAuthUser'
import { useQuery } from '@tanstack/react-query'
import { getStreamToken } from '../lib/api'
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css"
import toast from 'react-hot-toast'
import PageLoader from '../components/PageLoader'

const STREAM_API_KEY ='pmxyr9jyyg46'

const CallPage = () => {
  const {id:callId} = useParams()
  const [client, setclient] = useState(null)
  const [call, setcall] = useState(null)
  const [IsConnecting, setIsConnecting] = useState(true)
  const {authUser, isLoading} = useAuthUser()

  const {data:tokenData} = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  })

  useEffect(() => {
    let clientInstance = null; 

    const initCall = async () => {
      if (!tokenData?.token || !authUser || !callId) 
        return 
      
      try {
        setIsConnecting(true)
        console.log("Initializing Stream Video client")

        const cleanProfilePic = authUser?.profilePic?.startsWith("data:image")
          ? `https://getstream.io/random_png/?name=${encodeURIComponent(authUser.fullName)}`
          : authUser?.profilePic || "/avatar.png";

        const user = {
          id: authUser._id,
          name: authUser.fullName, 
          image: cleanProfilePic, 
        }

        const videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user,
          token: tokenData.token,
        })
        
        clientInstance = videoClient;

        const callInstance = videoClient.call("default", callId)
        await callInstance.join({ create: true })

        console.log("Call Joined Successfully")
        setclient(videoClient)
        setcall(callInstance)

      } catch (error) {
        console.error("Error joining calls:", error)
        toast.error("Could not join the call. Please try again")
      } finally {
        setIsConnecting(false)
      }
    }
    
    initCall()

    return () => {
      if (clientInstance) {
        console.log("Disconnecting video client connection safely...")
        clientInstance.disconnectUser()
      }
    }
  }, [tokenData, authUser, callId])

  if (isLoading || !tokenData?.token || IsConnecting)
    return <PageLoader/>

  return (
    <div className='h-screen flex flex-col items-center justify-center bg-gray-900'>
      <div className='relative w-full max-w-4xl h-[600px]'> 
        {client && call ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent callId={callId} authUser={authUser} />
            </StreamCall>
          </StreamVideo>
        ) : (
          <div className='flex items-center justify-center h-full text-white'>
            <p>Could not initialize call. Please refresh or try again later</p>
          </div>
        )}
      </div>
    </div>
  )
}

const CallContent = ({ callId, authUser }) => {
  const { useCallCallingState } = useCallStateHooks()
  const callingState = useCallCallingState()
  const navigate = useNavigate()
  const call = useCall()

  // 🎯 Dynamic Fallback Redirect Logic
  const getRedirectUrl = () => {
    if (!callId || !authUser?._id) return "/chat";
    
    // Split the channel ID back down to its component pieces: user1_id-user2_id
    const userIds = callId.split('-');
    
    // Find the other user's ID so we can dump them back into their private room directly!
    const targetFriendId = userIds.find(id => id !== authUser._id);
    
    return targetFriendId ? `/chat/${targetFriendId}` : "/chat";
  };

  // Listen to calling states to redirect back to the chat log when the call wraps up
  useEffect(() => {
    if (callingState === CallingState.LEFT || callingState === CallingState.ENDED) {
      navigate(getRedirectUrl())
    }
  }, [callingState, navigate])

  const handleCustomHangup = async () => {
    if (!call) return;
    
    try {
      await call.endCall();
      toast.success("Call ended");
    } catch (error) {
      console.error("Failed to end call properly:", error);
      navigate(getRedirectUrl());
    }
  }

  return (
    <StreamTheme>
      <SpeakerLayout/>
      <CallControls onLeave={handleCustomHangup} />
    </StreamTheme>
  )
}

export default CallPage