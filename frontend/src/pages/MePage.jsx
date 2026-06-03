import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFeedPosts, addComment, toggleLikePost } from "../lib/api"; 
import { Grid, Bookmark, Heart, MessageCircle, X, Send } from "lucide-react";
// 🌟 FIX 1: Import your global auth hook exactly like SideBar.jsx does!
import useAuthUser from "../hooks/useAuthUser"; 

export default function MePage() {
  // 🌟 FIX 2: Pull authUser straight from the hook instead of relying on props
  const { authUser } = useAuthUser();
  
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("posts"); 
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: getFeedPosts,
  });

  const myPosts = posts.filter(
    (post) => post.user?._id === authUser?._id || post.user?.id === authUser?._id
  );

  // 🚀 FIXED LOGIC LAYER: Filters the global posts feed by verifying if the ID exists inside authUser.savedPosts
  const savedPosts = posts.filter((post) => {
    const isSavedInUserDoc = authUser?.savedPosts?.some(
      (savedId) => savedId.toString() === post._id.toString()
    );
    return isSavedInUserDoc;
  });

  const likeMutation = useMutation({
    mutationFn: toggleLikePost,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      if (selectedPost && selectedPost._id === variables) {
        setSelectedPost((prev) => ({ ...prev, likes: data.likes }));
      }
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ postId, text }) => addComment(postId, text),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setCommentText("");
      if (selectedPost && selectedPost._id === variables.postId) {
        setSelectedPost((prev) => ({ ...prev, comments: data }));
      }
    },
  });

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    commentMutation.mutate({ postId: selectedPost._id, text: commentText });
  };

  const RenderCommentNode = ({ comment }) => (
    <div className="mb-3 text-sm text-base-content">
      <div className="flex items-start gap-2">
        <img
          src={comment.user?.profilePic || "/avatar.png"}
          alt=""
          className="w-7 h-7 rounded-full object-cover mt-0.5 border border-base-300"
        />
        <div className="bg-base-200 text-base-content rounded-lg p-2 flex-1 shadow-xs">
          <p className="font-bold text-xs opacity-90">{comment.user?.fullName}</p>
          <p className="mt-0.5 opacity-85">{comment.text}</p>
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-8 mt-2 border-l border-base-300 space-y-2">
          {comment.replies.map((reply) => (
            <RenderCommentNode key={reply._id} comment={reply} />
          ))}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return <div className="text-center py-12 font-medium text-base-content opacity-70">Loading profile feed...</div>;
  }

  const targetedSourceList = activeTab === "posts" ? myPosts : savedPosts;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-base-content">
      
      {/* 🌟 USER PROFILE HEADER SECTION */}
      <div className="flex items-center gap-6 mb-10 pb-8 border-b border-b-base-300">
        <div className="avatar">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden bg-base-300 shadow-sm">
            <img
              src={authUser?.profilePic || "/avatar.png"}
              alt={authUser?.fullName || "User Avatar"}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          {/* Displays Full Name dynamically in big bold font */}
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-base-content">
            {authUser?.fullName || "Hiii User"}
          </h1>
          
          {/* Email address handle container */}
          <p className="text-xs font-mono text-primary font-semibold">
            {authUser?.email || "@username"}
          </p>
          
          {/* User Bio implementation */}
          {authUser?.bio && (
            <p className="text-sm text-base-content/70 max-w-md pt-1 whitespace-pre-wrap leading-relaxed">
              {authUser.bio}
            </p>
          )}

          <div className="flex gap-4 mt-3 text-sm opacity-80 pt-1">
            <span><strong>{myPosts.length}</strong> posts</span>
            <span><strong>{savedPosts.length}</strong> saved</span>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex justify-center gap-12 mb-6 border-t border-base-200 pt-1">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-2 py-3 font-semibold text-sm tracking-wider uppercase border-t-2 transition-all duration-200 ${
            activeTab === "posts"
              ? "border-primary text-primary opacity-100 font-bold" 
              : "border-transparent text-base-content opacity-40 hover:opacity-70" 
          }`}
        >
          <Grid size={16} /> My Posts
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 py-3 font-semibold text-sm tracking-wider uppercase border-t-2 transition-all duration-200 ${
            activeTab === "saved"
              ? "border-primary text-primary opacity-100 font-bold" 
              : "border-transparent text-base-content opacity-40 hover:opacity-70" 
          }`}
        >
          <Bookmark size={16} /> Saved
        </button>
      </div>

      {/* THREE-COLUMN GRID CONTAINER */}
      {targetedSourceList.length === 0 ? (
        <div className="text-center py-16 bg-base-200 text-base-content opacity-60 rounded-xl font-medium border border-base-300 shadow-inner">
          No assets discovered inside this folder section.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {targetedSourceList.map((post) => (
            <div
              key={post._id}
              onClick={() => setSelectedPost(post)}
              className="relative aspect-square bg-base-300 overflow-hidden group cursor-pointer rounded-md hover:opacity-95 transition-all shadow-xs border border-base-200"
            >
              {post.postImage ? (
                <img
                  src={post.postImage}
                  alt="Feed item grid thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral text-neutral-content p-3 text-center text-xs md:text-sm font-medium leading-relaxed select-none">
                  <p className="line-clamp-4">"{post.content}"</p>
                </div>
              )}

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 md:gap-6 text-white transition-opacity duration-200">
                <span className="flex items-center gap-1.5 font-bold text-sm md:text-base">
                  <Heart size={18} fill="currentColor" /> {post.likes?.length || 0}
                </span>
                <span className="flex items-center gap-1.5 font-bold text-sm md:text-base">
                  <MessageCircle size={18} fill="currentColor" /> {post.comments?.length || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DYNAMIC POST DETAIL SCREEN POPUP */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setSelectedPost(null)} />

          <div className="relative bg-base-100 text-base-content w-full max-w-4xl h-[85vh] md:h-[75vh] rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row z-10 animate-in fade-in zoom-in-95 duration-150 border border-base-300">
            
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3 md:hidden z-20 p-1.5 bg-neutral/80 rounded-full text-neutral-content"
            >
              <X size={20} />
            </button>

            <div className="w-full md:w-[60%] bg-neutral text-neutral-content flex items-center justify-center h-[35%] md:h-full relative">
              {selectedPost.postImage ? (
                <img
                  src={selectedPost.postImage}
                  alt="Enlarged layout frame preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-8 font-medium text-center md:text-lg italic max-w-md leading-relaxed">
                  "{selectedPost.content}"
                </div>
              )}
            </div>

            <div className="w-full md:w-[40%] flex flex-col h-[65%] md:h-full bg-base-100">
              
              <div className="p-4 border-b border-base-200 flex items-center justify-between sticky top-0 bg-base-100 z-10">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedPost.user?.profilePic || "/avatar.png"}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-base-300"
                  />
                  <div>
                    <h3 className="font-bold text-sm leading-tight">
                      {selectedPost.user?.fullName}
                    </h3>
                    <p className="text-xs opacity-50">Author Profile</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="hidden md:block p-1 opacity-50 hover:opacity-100 rounded-lg transition-opacity"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-200/30">
                {selectedPost.postImage && selectedPost.content && (
                  <div className="flex items-start gap-3 pb-3 border-b border-base-200">
                    <img
                      src={selectedPost.user?.profilePic || "/avatar.png"}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover mt-0.5 border border-base-300"
                    />
                    <div>
                      <p className="text-sm">
                        <strong className="mr-1.5">{selectedPost.user?.fullName}</strong>
                        <span className="opacity-90">{selectedPost.content}</span>
                      </p>
                    </div>
                  </div>
                )}

                {selectedPost.comments && selectedPost.comments.length > 0 ? (
                  selectedPost.comments.map((comment) => (
                    <RenderCommentNode key={comment._id} comment={comment} />
                  ))
                ) : (
                  <div className="text-center opacity-40 py-12 text-xs font-light">
                    No active messages found under this post panel container.
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-base-200 bg-base-100 sticky bottom-0">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => likeMutation.mutate(selectedPost._id)}
                    className="flex items-center gap-1.5 transition-colors group text-sm font-semibold"
                  >
                    <Heart
                      size={22}
                      className={
                        selectedPost.likes?.includes(authUser?._id) 
                          ? "text-error fill-error scale-110" 
                          : "opacity-70 group-hover:text-error group-hover:opacity-100"
                      }
                    />
                    <span>{selectedPost.likes?.length || 0} Likes</span>
                  </button>
                </div>

                <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a response item column..."
                    className="flex-1 input input-bordered input-sm bg-base-200 text-base-content focus:outline-hidden text-sm h-9 rounded-lg"
                  />
                  <button
                    type="submit"
                    disabled={commentMutation.isPending || !commentText.trim()}
                    className="btn btn-square btn-sm bg-neutral text-neutral-content hover:bg-neutral/90 border-none h-9 w-9 min-h-0 rounded-lg"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}