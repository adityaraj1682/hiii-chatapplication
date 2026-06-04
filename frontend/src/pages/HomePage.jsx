import React, { useState, useRef, useEffect } from "react"; // 🔥 Added useRef & useEffect for chatbot scroll track
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image, Send, Loader2, Sparkles, ImagePlus, X, Camera, Plus, MessageSquare } from "lucide-react"; // 🔥 Added MessageSquare
import useAuthUser from "../hooks/useAuthUser";
import { getFeedPosts, createPost, getFeedStories, createStory, queryChatbot } from "../lib/api"; // 🔥 Added queryChatbot
import PostCard from "../components/PostCard";
import CameraPostCapture from "../components/CameraCapture"; 

export default function HomePage() {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  
  // Post States
  const [content, setContent] = useState("");
  const [postImageBase64, setPostImageBase64] = useState("");
  const [isCameraViewOpen, setIsCameraViewOpen] = useState(false);

  // Story States
  const [storyCaption, setStoryCaption] = useState("");
  const [storyImageBase64, setStoryImageBase64] = useState("");
  const [isStoryCameraOpen, setIsStoryCameraOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null); 

  // 🔥 NEW: Chatbot Assistant Layout States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Hey! I am your AI assistant. Ask me anything!" }
  ]);
  const [isChatPending, setIsChatPending] = useState(false);
  const chatEndRef = useRef(null);

  // 🔥 Auto scroll chatbot viewport thread
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatOpen]);

  // 1. Fetch Posts Feed
  const { data: posts = [], isLoading: loadingFeed } = useQuery({
    queryKey: ["posts"],
    queryFn: getFeedPosts,
  });

  // 2. Fetch Stories Feed
  const { data: stories = [], isLoading: loadingStories } = useQuery({
    queryKey: ["stories"],
    queryFn: getFeedStories,
  });

  // 3. Create Post Mutation
  const createPostMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setContent("");
      setPostImageBase64("");
      setIsCameraViewOpen(false); 
    },
    onError: (error) => {
      console.error("Failed to create post:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Something went wrong while sharing your post.");
    },
  });

  // 4. Create Story Mutation
  const createStoryMutation = useMutation({
    mutationFn: createStory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      setStoryCaption("");
      setStoryImageBase64("");
      setIsStoryCameraOpen(false);
      document.getElementById("add_story_modal").close(); 
    },
    onError: (error) => {
      console.error("Failed to create story:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Something went wrong while sharing your story.");
    },
  });

  const handleImageUpload = (e, type = "post") => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "story") {
        setStoryImageBase64(reader.result);
        setIsStoryCameraOpen(false);
      } else {
        setPostImageBase64(reader.result);
        setIsCameraViewOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePostSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() && !postImageBase64) return;

    createPostMutation.mutate({
      content: content,
      postImage: postImageBase64,
    });
  };

  const handleStorySubmit = (e) => {
    e.preventDefault();
    if (!storyImageBase64) return;

    createStoryMutation.mutate({
      caption: storyCaption,
      storyImage: storyImageBase64,
    });
  };

  // 🔥 NEW: Chatbot Request Processing Hub
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatPending) return;

    const userMessage = { role: "user", content: chatInput };
    const updatedHistory = [...chatMessages, userMessage];

    setChatMessages(updatedHistory);
    setChatInput("");
    setIsChatPending(true);

    try {
      const aiResponse = await queryChatbot(updatedHistory);
      setChatMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      console.error(err);
      // 👇 CHANGED FROM setMessages TO setChatMessages HERE
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, my brain cells stalled out. Please try sending that again!" }
      ]);
    } finally {
      setIsChatPending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-base-100 text-base-content pb-24 pt-6 px-4 md:px-0 relative">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* ========================================== */}
        {/* CIRCULAR STORIES BANNER SECTION            */}
        {/* ========================================== */}
        <div className="w-full bg-base-200 border border-base-300 rounded-2xl p-4 shadow-sm overflow-x-auto no-scrollbar flex items-center gap-4">
          
          {/* Action Trigger: Add personal story frame */}
          <div className="flex flex-col items-center flex-shrink-0 cursor-pointer">
            <div 
              onClick={() => document.getElementById("add_story_modal").showModal()} 
              className="relative w-16 h-16 rounded-full bg-base-300 border-2 border-dashed border-primary flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
            >
              {authUser?.profilePic ? (
                <img src={authUser.profilePic} alt="Me" className="w-full h-full object-cover rounded-full p-0.5 opacity-60" />
              ) : (
                <span className="text-sm font-bold uppercase">{authUser?.fullName?.charAt(0)}</span>
              )}
              <div className="absolute bottom-0 right-0 bg-primary text-primary-content p-1 rounded-full border-2 border-base-200 shadow-md">
                <Plus size={12} strokeWidth={3} />
              </div>
            </div>
            <span className="text-[10px] font-medium mt-1 text-base-content/70">Add Story</span>
          </div>

          {/* Dynamic Map Block of Friends Active Stories */}
          {loadingStories ? (
            <div className="flex items-center gap-2 py-2">
              <span className="loading loading-spinner loading-sm text-primary" />
            </div>
          ) : (
            stories.map((story) => (
              <div 
                key={story._id} 
                onClick={() => setSelectedStory(story)}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-base-200 p-[2px] transition-transform group-hover:scale-105">
                  <img 
                    src={story.user?.profilePic || "https://placehold.co/150"} 
                    alt={story.user?.fullName} 
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <span className="text-[10px] font-medium mt-1 truncate max-w-[64px] text-base-content/80">
                  {story.user?.fullName?.split(" ")[0]}
                </span>
              </div>
            ))
          )}
        </div>

        {/* ========================================== */}
        {/* CREATE POST CARD                          */}
        {/* ========================================== */}
        <div className="card bg-base-200 border border-base-300 shadow-sm rounded-2xl">
          <div className="card-body p-4 space-y-3">
            
            <div className="flex items-start gap-3">
              <div className="avatar placeholder">
                <div className="w-10 h-10 rounded-full ring ring-primary/20 ring-offset-base-100 ring-offset-1 bg-neutral text-neutral-content">
                  {authUser?.profilePic ? (
                    <img
                      src={authUser.profilePic}
                      alt={authUser.fullName}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-sm font-semibold uppercase">
                      {authUser?.fullName?.charAt(0) || "U"}
                    </span>
                  )}
                </div>
              </div>
              
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind today?"
                className="textarea textarea-ghost focus:bg-transparent focus:outline-none w-full text-sm placeholder-base-content/40 resize-none min-h-[60px] p-1 pt-2 leading-relaxed"
              />
            </div>

            {/* Premium Base64 Image Preview Box */}
            {postImageBase64 && (
              <div className="relative aspect-square w-full bg-base-300 rounded-xl overflow-hidden group border border-base-300">
                <img
                  src={postImageBase64}
                  alt="Upload preview"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                />
                <button
                  type="button"
                  onClick={() => setPostImageBase64("")}
                  className="btn btn-circle btn-xs absolute top-3 right-3 bg-base-100/80 backdrop-blur border-none text-base-content hover:bg-error hover:text-error-content shadow-md"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* LIVE VIEWPORT CONTROLLER WINDOW CONTAINER */}
            {isCameraViewOpen && !postImageBase64 && (
              <div className="animate-fadeIn w-full">
                <CameraPostCapture 
                  onImageCaptured={(base64String) => {
                    setPostImageBase64(base64String); 
                    setIsCameraViewOpen(false);       
                  }}
                  onCancel={() => setIsCameraViewOpen(false)}
                />
              </div>
            )}

            <div className="flex items-center justify-between border-t border-base-300/60 pt-3">
              <div className="flex items-center gap-1">
                <label className="btn btn-ghost btn-sm text-base-content/70 hover:text-primary rounded-xl gap-2 font-medium normal-case transition-colors">
                  <ImagePlus size={18} />
                  <span className="text-xs hidden sm:inline">Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "post")}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setIsCameraViewOpen(!isCameraViewOpen)}
                  className={`btn btn-ghost btn-sm rounded-xl gap-2 font-medium normal-case transition-colors ${
                    isCameraViewOpen ? "text-error" : "text-base-content/70 hover:text-primary"
                  }`}
                  title={isCameraViewOpen ? "Close Active Camera Track" : "Capture Live Photo Frame"}
                >
                  <Camera size={18} />
                  <span className="text-xs hidden sm:inline">Use Camera</span>
                </button>
              </div>

              <button
                onClick={handlePostSubmit}
                disabled={(!content.trim() && !postImageBase64) || createPostMutation.isPending}
                className={`btn btn-sm rounded-xl px-5 gap-1.5 normal-case ${
                  content.trim() || postImageBase64
                    ? "btn-primary shadow-sm"
                    : "btn-disabled bg-base-300/50 text-base-content/30"
                }`}
              >
                {createPostMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <span className="text-xs font-semibold">Share</span>
                    <Send size={12} className="opacity-80" />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* ========================================== */}
        {/* DYNAMIC TIMELINE STREAM FEED              */}
        {/* ========================================== */}
        <div className="flex items-center gap-2 px-1 text-base-content/40">
          <Sparkles size={14} />
          <span className="text-[11px] font-bold tracking-wider uppercase">Your Updates</span>
          <div className="h-[1px] bg-base-300/60 flex-1 ml-1" />
        </div>

        {loadingFeed ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <span className="loading loading-ring loading-lg text-primary" />
            <p className="text-xs text-base-content/50 font-medium tracking-wide">Assembling your timeline...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="card bg-base-200 border border-base-300 rounded-2xl text-center py-12 px-6 shadow-xs">
            <div className="card-body max-w-xs mx-auto items-center p-0 space-y-2">
              <div className="bg-primary/10 p-3 rounded-full text-primary mb-1">
                <Sparkles size={24} />
              </div>
              <h3 className="font-bold text-base-content text-lg">Your Feed is Quiet</h3>
              <p className="text-xs text-base-content/60 leading-relaxed">
                Connect with more language partners or share your thoughts to start customizing your workspace.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard 
                key={post._id} 
                post={post} 
                currentUserId={authUser?._id || authUser?.id} 
              />
            ))}
          </div>
        )}

      </div>

      {/* ========================================== */}
      {/* MODAL: ADD STORY SELECTION OVERLAY         */}
      {/* ========================================== */}
      <dialog id="add_story_modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box bg-base-200 border border-base-300 max-w-sm rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base flex items-center gap-1.5"><Sparkles size={16} className="text-primary"/> Create 24h Story</h3>
            <form method="dialog">
              <button className="btn btn-circle btn-xs btn-ghost text-base-content/60"><X size={16}/></button>
            </form>
          </div>

          <input 
            type="text" 
            placeholder="Add a snappy caption... (optional)" 
            value={storyCaption} 
            onChange={(e) => setStoryCaption(e.target.value)} 
            className="input input-sm input-bordered w-full rounded-xl bg-base-100"
          />

          {storyImageBase64 ? (
            <div className="relative aspect-[9/16] w-full max-h-[300px] bg-neutral rounded-xl overflow-hidden border border-base-300">
              <img src={storyImageBase64} alt="Story design file" className="w-full h-full object-cover"/>
              <button type="button" onClick={() => setStoryImageBase64("")} className="btn btn-circle btn-xs absolute top-2 right-2 bg-base-100 text-base-content"><X size={12}/></button>
            </div>
          ) : isStoryCameraOpen ? (
            <div className="w-full">
              <CameraPostCapture 
                onImageCaptured={(base64) => { setStoryImageBase64(base64); setIsStoryCameraOpen(false); }}
                onCancel={() => setIsStoryCameraOpen(false)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="btn btn-outline btn-primary btn-sm flex flex-col h-20 rounded-xl items-center justify-center gap-1 cursor-pointer">
                <ImagePlus size={20}/>
                <span className="text-[11px] normal-case">Photo Vault</span>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "story")} className="hidden"/>
              </label>
              <button type="button" onClick={() => setIsStoryCameraOpen(true)} className="btn btn-outline btn-primary btn-sm flex flex-col h-20 rounded-xl items-center justify-center gap-1">
                <Camera size={20}/>
                <span className="text-[11px] normal-case">Snap Photo</span>
              </button>
            </div>
          )}

          <button 
            onClick={handleStorySubmit} 
            disabled={!storyImageBase64 || createStoryMutation.isPending} 
            className="btn btn-primary btn-sm w-full rounded-xl gap-2"
          >
            {createStoryMutation.isPending ? <Loader2 className="animate-spin size-4"/> : <>Publish Story <Send size={12}/></>}
          </button>
        </div>
      </dialog>

      {/* ========================================== */}
      {/* OVERLAY: FULLSCREEN STORY VISUALIZER       */}
      {/* ========================================== */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-md aspect-[9/16] bg-neutral rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl">
            
            <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between z-10 text-white">
              <div className="flex items-center gap-2">
                <img src={selectedStory.user?.profilePic} alt="" className="w-9 h-9 object-cover rounded-full border border-white/20"/>
                <div>
                  <h4 className="text-xs font-bold">{selectedStory.user?.fullName}</h4>
                  <p className="text-[9px] opacity-60">Active Story</p>
                </div>
              </div>
              <button onClick={() => setSelectedStory(null)} className="btn btn-circle btn-xs bg-white/20 border-none text-white hover:bg-white/40"><X size={16}/></button>
            </div>

            <img src={selectedStory.storyImage} alt="Active story asset" className="w-full h-full object-cover"/>

            {selectedStory.caption && (
              <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-center text-white">
                <p className="text-sm font-medium drop-shadow-md leading-relaxed">{selectedStory.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🔥 NEW: FLOATING WHATSAPP-STYLE CHATBOT    */}
      {/* ========================================== */}
      <div className="fixed bottom-16 right-6 z-40 sm:bottom-6">
        {/* Toggle FAB Circular Button Trigger */}
        {!isChatOpen && (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="btn btn-primary btn-circle btn-lg shadow-2xl animate-bounce hover:animate-none group"
          >
            <MessageSquare className="group-hover:scale-110 transition-transform"/>
          </button>
        )}

        {/* Chat Widget Window Container */}
        {isChatOpen && (
          <div className="card w-80 h-96 bg-base-200 border border-base-300 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-fadeIn">
            
            {/* Header section layout styling */}
            <div className="p-3 bg-primary text-primary-content flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles size={16}/>
                <h4 className="font-bold text-xs">Llama AI Assistant</h4>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="btn btn-ghost btn-circle btn-xs text-primary-content">
                <X size={16}/>
              </button>
            </div>

            {/* Chat message dialog layout tracks */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs no-scrollbar bg-base-100">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}>
                <div className={`chat-bubble max-w-[85%] text-[11px] leading-relaxed font-medium rounded-xl p-2 px-3 ${
                 msg.role === "user" ? "chat-bubble-primary" : "chat-bubble-neutral text-base-content"
              }`}>
      {/* If it contains an image tag string, render it as innerHTML, else render standard text */}
      {msg.content.includes("<img") ? (
        <div dangerouslySetInnerHTML={{ __html: msg.content }} />
      ) : (
        msg.content
      )}
    </div>
  </div>
))}
              {isChatPending && (
                <div className="chat chat-start">
                  <div className="chat-bubble chat-bubble-neutral flex items-center gap-1.5 p-2 px-3 text-[11px] rounded-xl">
                    <Loader2 size={12} className="animate-spin text-primary"/> Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Submission Footer Form block */}
            <form onSubmit={handleSendChatMessage} className="p-2 bg-base-200 border-t border-base-300/60 flex gap-1.5 items-center">
              <input 
                type="text" 
                placeholder="Ask me anything..." 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatPending}
                className="input input-sm input-bordered flex-1 rounded-xl bg-base-100 text-xs focus:outline-none"
              />
              <button type="submit" disabled={!chatInput.trim() || isChatPending} className="btn btn-primary btn-sm btn-circle text-primary-content">
                <Send size={12}/>
              </button>
            </form>

          </div>
        )}
      </div>

    </div>
  );
}