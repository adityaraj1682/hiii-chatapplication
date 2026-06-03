import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router' 
import useAuthUser from '../hooks/useAuthUser'
import { useQuery } from '@tanstack/react-query'
import { getStreamToken } from '../lib/api'
import { 
  WithComponents,
  Chat, 
  Channel, 
  Window, 
  MessageList, 
  MessageComposer,
  Thread 
} from 'stream-chat-react';
// import { CustomMessageWithTranslation } from '../components/CustomMessage';
import toast from 'react-hot-toast'
import ChatLoader from '../components/ChatLoader'
import CallButton from '../components/CallButton'
import { StreamChat } from 'stream-chat'
import { ChevronLeft } from 'lucide-react'


const STREAM_API_KEY ='pmxyr9jyyg46'

const ChatPage = () => { 
  const {id:targetUserId} = useParams()
  const navigate = useNavigate()
  const [chatClient, setchatClient] = useState(null)
  const [channel, setchannel] = useState(null)
  const [loading, setloading] = useState(true)

  const {authUser} = useAuthUser()

  const {data:tokenData} = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser 
  })

useEffect(() => {
    let isMounted = true; 

    const initChat = async () => {
      if (!tokenData?.token || !authUser) return;
      
      try {
        setloading(true);
        console.log('Initializing stream chat client...');
        
        const client = StreamChat.getInstance(STREAM_API_KEY);

        const cleanProfilePic = authUser?.profilePic?.startsWith("data:image")
          ? `https://getstream.io/random_png/?name=${encodeURIComponent(authUser.fullName)}`
          : authUser?.profilePic;

        const userPayload = {
          id: authUser._id,
          name: authUser.fullName,
          image: cleanProfilePic || "/avatar.png",
          user_details: {
            nativeLanguage: authUser.nativeLanguage || "",
            learningLanguage: authUser.learningLanguage || ""
          }
        };

        if (client.userID !== authUser._id) {
          if (client.userID) {
            await client.disconnectUser(); 
          }
          await client.connectUser(userPayload, tokenData.token);
        }

        if (!isMounted) return;

        if (cleanProfilePic && !cleanProfilePic.startsWith("data:image")) {
          await client.updateUser({
            id: authUser._id,
            name: authUser.fullName,
            image: cleanProfilePic,
            user_details: userPayload.user_details
          });
        }

        const channelId = [authUser._id, targetUserId].sort().join('-');
        const currChannel = client.channel('messaging', channelId, {
          members: [authUser._id, targetUserId],
        });

        await currChannel.watch();

        if (isMounted) {
          setchatClient(client);
          setchannel(currChannel);
        }

      } catch (error) {
        console.error('Error in initializing chat:', error);
        if (isMounted) {
          toast.error("Could not connect to the chat. Please try again");
        }
      } finally {
        if (isMounted) {
          setloading(false);
        }
      }
    }

    initChat();

    return () => {
      isMounted = false;
    }
  }, [tokenData, authUser, targetUserId]);

  const handleVideoCall = () =>{
    if(channel){
      const callUrl=`${window.location.origin}/call/${channel.id}`;

      channel.sendMessage({
        text: `I've started a video call. Join me here ${callUrl}`
      })

      toast.success('Video call link sent successfully')
    }
  };

  if (loading || !chatClient || !channel) return <ChatLoader/>

  const otherMember = Object.values(channel.state.members).find(
    (m) => m.user?.id !== authUser._id
  );
  const memberAvatar = otherMember?.user?.image || "/avatar.png";
  
  return (
    /* 🛠️ FIX: Adjusted mobile height calculation to leave room for the top header banner (`h-[calc(100vh-4rem)]`) */
    <div className='h-[calc(100vh-4rem)] sm:h-[93vh] bg-white sm:bg-[#C1EAD4] p-0 sm:p-4 md:p-6 flex justify-center items-center w-full overflow-hidden'> 
      
      {/* STYLED STRUCTURAL OVERRIDES INTERNALLY FOR GETSTREAM COMPONENTS */}
      <style>{`
        .str-chat-container {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .str-chat__main-panel {
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
        }
        /* Pins MessageComposer perfectly to the visible screen area at the bottom */
        .str-chat__message-composer-wrapper {
          padding: 8px 12px !important;
          background-color: #ffffff !important;
          border-top: 1px solid #e5e7eb !important;
        }
        /* Completely hides the default un-aligned Stream title header bar element */
        .str-chat__channel-header {
          display: none !important;
        }
      `}</style>

      {/* CHAT CONTAINER BOX WINDOW */}
      <div className='w-full sm:w-[80vw] h-full max-w-3xl bg-white sm:rounded-3xl border-b border-gray-200 sm:shadow-xl overflow-hidden flex flex-col relative'>
        
        {/* CLEAN PERFORMANCE HEADER BAR */}
        <div className="flex items-center justify-between w-full bg-white py-3 px-4 border-b border-gray-200 z-50 shrink-0 h-16">
          
          {/* LEFT AREA: Chevron Left Navigation Arrow */}
          {/* LEFT AREA: Clean Chevron Back Link to Friends Page */}
          <div className="flex items-center w-20 justify-start" style={{ zIndex: 9999 }}>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Back button clicked! Forcing navigation to /friends...");
                    navigate('/friends');
                  }} 
                  className="p-1.5 -ml-2 rounded-full hover:bg-gray-100 flex text-gray-700 transition-colors focus:outline-none cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </div>

          {/* CENTER AREA: Full Profile Metadata info */}
          <div className="flex flex-col items-center justify-center text-center flex-1 min-w-0">
            <span className="font-bold text-base text-gray-800 leading-tight truncate w-full">
              {otherMember?.user?.name || channel.data?.name || 'Chat'}
            </span>
            <span className="text-xs text-emerald-500 font-medium mt-0.5">
              {otherMember?.user?.online ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* RIGHT AREA: Video Call Button and User Avatar */}
          <div className="flex items-center gap-3 w-20 justify-end shrink-0">
            <div className="flex items-center justify-center">
              <CallButton handleVideoCall={handleVideoCall} />
            </div>
            <div className="avatar size-9 rounded-full overflow-hidden border border-gray-200 shadow-xs shrink-0">
              <img 
                src={memberAvatar} 
                alt="User Avatar" 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = "/avatar.png" }}
              />
            </div>
          </div>

        </div>

        {/* MESSAGES CORE ELEMENT SCROLL GRID INTERNALLY */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
          <Chat client={chatClient} theme='str-chat__theme-light'>
            <Channel channel={channel}>
              <div className='flex flex-col flex-1 h-full relative w-full bg-white'>
                <Window>
                  <MessageList />
                  <MessageComposer />
                </Window>
              </div>
              <Thread /> 
            </Channel>
          </Chat>
        </div>

      </div>
    </div>
  )
}

export default ChatPage