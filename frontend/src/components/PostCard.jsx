import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
// 🚀 CHANGED: Imported BookmarkCheck from lucide-react
import { Heart, MessageCircle, MoreHorizontal, Bookmark, BookmarkCheck } from "lucide-react";
import { toggleLikePost, addComment, deletePostApi, addReplyApi, toggleSavePost } from "../lib/api"; 
import { formatDistanceToNow } from "date-fns";
import useAuthUser from "../hooks/useAuthUser"; 
import DeleteModal from "./DelPostPopUp";

export default function PostCard({ post, currentUserId }) {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // States for capturing targeted reply parameters
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const isLiked = post.likes?.includes(currentUserId);
  const isPostOwner = post.user?._id === currentUserId || post.user === currentUserId;

  // Checks if this specific post ID is saved in the user's document array
  const isSavedByMe = authUser?.savedPosts?.includes(post._id); 

  const displayProfilePic = post.user?.profilePic || (isPostOwner ? authUser?.profilePic : null);
  const displayFullName = post.user?.fullName || (isPostOwner ? authUser?.fullName : "User");

  // 1. Like/Unlike Mutation
  const likeMutation = useMutation({
    mutationFn: () => toggleLikePost(post._id),
    onSuccess: (data) => {
      queryClient.setQueryData(["posts"], (oldPosts) => {
        if (!oldPosts) return [];
        return oldPosts.map((p) => (p._id === post._id ? { ...p, likes: data.likes } : p));
      });
    },
  });

  // 2. Add Top-Level Comment Mutation
  const commentMutation = useMutation({
    mutationFn: (text) => addComment(post._id, text),
    onSuccess: (updatedCommentsTree) => {
      queryClient.setQueryData(["posts"], (oldPosts) => {
        if (!oldPosts) return [];
        return oldPosts.map((p) => 
          p._id === post._id ? { ...p, comments: updatedCommentsTree } : p
        );
      });
      setCommentText("");
      setShowComments(true);
    },
  });

  // 3. Delete Post Mutation
  const deletePostMutation = useMutation({
    mutationFn: () => deletePostApi(post._id),
    onSuccess: () => {
      queryClient.setQueryData(["posts"], (oldPosts) => {
        if (!oldPosts) return [];
        return oldPosts.filter((p) => p._id !== post._id);
      });
      setIsDeleteModalOpen(false);
    },
  });

  // 4. Infinite Nested Comment Reply Mutation
  const replyMutation = useMutation({
    mutationFn: ({ commentId, text }) => addReplyApi(post._id, commentId, text),
    onSuccess: (updatedComments) => {
      queryClient.setQueryData(["posts"], (oldPosts) => {
        if (!oldPosts) return [];
        return oldPosts.map((p) => (p._id === post._id ? { ...p, comments: updatedComments } : p));
      });
      setReplyText("");
      setReplyingToCommentId(null);
    },
  });

  // 5. 💾 TOGGLE SAVE/BOOKMARK (NO TOAST MESSAGES)
  const saveMutation = useMutation({
    mutationFn: () => toggleSavePost(post._id),
    onSuccess: (responseData) => {
      // Direct cache modification updates the icon in real time!
      queryClient.setQueryData(["authUser"], (oldUser) => {
        if (!oldUser) return null;
        
        // Grab existing array safely
        const currentSaved = oldUser.savedPosts || [];
        
        // Dynamically add or remove based on what our backend just processed
        let updatedSaved;
        if (currentSaved.includes(post._id)) {
          updatedSaved = currentSaved.filter((id) => id !== post._id);
        } else {
          updatedSaved = [...currentSaved, post._id];
        }

        return { ...oldUser, savedPosts: updatedSaved };
      });

      // Synchronize all data pipelines instantly
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
  });

  const handleReplySubmit = (e, commentId) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate({ commentId, text: replyText });
  };

  return (
    <div className="max-w-md w-full bg-base-200 border border-base-300 rounded-2xl mb-6 mx-auto shadow-sm">
      
      {/* 1. Header (User Info + Dynamic Action Dropdown) */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="avatar placeholder">
            <div className="w-8 h-8 rounded-full ring ring-base-content/10 bg-neutral text-neutral-content overflow-hidden">
              {displayProfilePic ? (
                <img src={displayProfilePic} alt={displayFullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold uppercase">{displayFullName?.charAt(0) || "U"}</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-base-content tracking-tight">{displayFullName}</p>
            <p className="text-xs text-base-content/50">
              {post.createdAt ? formatDistanceToNow(new Date(post.createdAt)) + " ago" : "Just now"}
            </p>
          </div>
        </div>

        {/* Dynamic Header Dropdown menu */}
        <div className="dropdown dropdown-end dropdown-bottom">
          <label tabIndex={0} className="btn btn-ghost btn-circle btn-sm text-base-content/70">
            <MoreHorizontal size={18} />
          </label>
          <ul tabIndex={0} className="dropdown-content menu p-1.5 shadow-md bg-base-100 rounded-xl w-32 border border-base-300 z-50">
            {isPostOwner ? (
              <li>
                <button onClick={() => setIsDeleteModalOpen(true)} className="text-error font-medium hover:bg-error/10 py-2">
                  Delete
                </button>
              </li>
            ) : (
              /* Dropdown Save option */
              /* 🚀 BULLETPROOF UNIFORM DROPDOWN MENU BUTTON */
                <li>
                <button 
                    onClick={() => saveMutation.mutate()} 
                    className={`font-medium py-2 flex items-center justify-between active:bg-base-200 ${
                    isSavedByMe ? "text-primary" : "text-base-content"
                    }`}
                >
                    <span>{isSavedByMe ? "Saved" : "Save"}</span>
                    {isSavedByMe ? (
                    <Bookmark size={16} className="text-primary fill-primary" strokeWidth={2} />
                    ) : (
                    <Bookmark size={16} className="opacity-60" fill="none" strokeWidth={2} />
                    )}
                </button>
                </li>                       )}
          </ul>
        </div>
      </div>

      {/* 2. Media Body */}
      {post.postImage && (
        <div className="w-full aspect-square bg-neutral-900 flex items-center justify-center overflow-hidden border-y border-base-300">
          <img
            src={post.postImage}
            alt="Post content"
            className="w-full h-full object-cover select-none cursor-pointer"
            onDoubleClick={() => likeMutation.mutate()}
          />
        </div>
      )}

      {/* 3. Action Utility Bar */}
      <div className="p-3 pb-2">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => likeMutation.mutate()} 
              className={`transition-transform active:scale-125 duration-100 ${isLiked ? "text-red-500 fill-red-500" : "text-gray-800 dark:text-base-content hover:opacity-70"}`}
            >
              <Heart size={24} strokeWidth={2} />
            </button>
            <button 
              onClick={() => setShowComments(!showComments)} 
              className="text-gray-800 dark:text-base-content hover:opacity-70 transition-colors"
            >
              <MessageCircle size={24} strokeWidth={2} />
            </button>
          </div>

          {/* 🚀 💾 ACTION BAR SWITCH: Dynamic swap from Bookmark to BookmarkCheck */}
         {!isPostOwner && (
            <button
              onClick={() => saveMutation.mutate()}
              className="transition-all active:scale-110 hover:opacity-80 flex items-center justify-center"
            >
              {isSavedByMe ? (
                <Bookmark size={24} className="text-primary fill-primary" strokeWidth={2} />
              ) : (
                <Bookmark size={24} className="text-gray-800 dark:text-base-content opacity-70" fill="none" strokeWidth={2} />
              )}
            </button>
          )}
        </div>

        <p className="text-sm font-semibold text-base-content mb-1">
          {post.likes?.length.toLocaleString() || 0} {post.likes?.length === 1 ? "like" : "likes"}
        </p>

        <div className="text-sm text-base-content leading-relaxed mb-1">
          <span className="font-semibold mr-2">{displayFullName}</span>
          {post.content}
        </div>

        {post.comments?.length > 0 && (
          <button 
            onClick={() => setShowComments(!showComments)}
            className="text-xs text-base-content/50 mt-1 hover:underline block cursor-pointer"
          >
            {showComments ? "Hide all comments" : `View all ${post.comments.length} comments`}
          </button>
        )}
      </div>

      {/* 4. Infinite Recursive Comments Layer */}
      {showComments && (
        <div className="px-4 pb-4 max-h-72 overflow-y-auto space-y-3 border-t border-base-300/40 pt-3 bg-base-300/10">
          {post.comments?.map((comment, index) => (
            <CommentNode 
              key={comment._id || index} 
              comment={comment} 
              replyingToCommentId={replyingToCommentId}
              setReplyingToCommentId={setReplyingToCommentId}
              replyText={replyText}
              setReplyText={setReplyText}
              handleReplySubmit={handleReplySubmit}
              isPending={replyMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* 5. Root Level Input Footer */}
      <form onSubmit={(e) => { e.preventDefault(); if(commentText.trim()) commentMutation.mutate(commentText); }} className="flex items-center border-t border-base-300/60 px-3 py-2.5">
        <input
          type="text"
          placeholder="Add a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="flex-1 text-sm text-base-content focus:outline-none placeholder-base-content/30 bg-transparent"
        />
        <button
          type="submit"
          disabled={!commentText.trim() || commentMutation.isPending}
          className={`text-sm font-semibold transition-colors ${commentText.trim() ? "text-primary" : "text-primary/30 cursor-not-allowed"}`}
        >
          Post
        </button>
      </form>

      {/* 6. Delete Confirmation Modal Popup */}
      <DeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deletePostMutation.mutate()}
        isPending={deletePostMutation.isPending}
      />

    </div>
  );
}

/**
 * RECURSIVE COMMENT NODE COMPONENT
 */
function CommentNode({ 
  comment, 
  replyingToCommentId, 
  setReplyingToCommentId, 
  replyText, 
  setReplyText, 
  handleReplySubmit,
  isPending
}) {
  return (
    <div className="space-y-2 text-sm mt-1">
      
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          <div className="avatar placeholder flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-neutral text-neutral-content text-[10px] font-bold overflow-hidden">
              {comment.user?.profilePic ? (
                <img src={comment.user.profilePic} alt={comment.user?.fullName} className="object-cover w-full h-full" />
              ) : (
                <span>{comment.user?.fullName?.charAt(0) || "U"}</span>
              )}
            </div>
          </div>
          <div>
            <span className="font-semibold text-base-content mr-1.5">{comment.user?.fullName || "User"}</span>
            <span className="text-base-content/90 break-words">{comment.text}</span>
            
            <div className="flex items-center space-x-3 mt-0.5 text-[11px] text-base-content/50 font-medium">
              <span>{comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt)) + " ago" : "Just now"}</span>
              <button 
                onClick={() => setReplyingToCommentId(replyingToCommentId === comment._id ? null : comment._id)}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      </div>

      {replyingToCommentId === comment._id && (
        <form 
          onSubmit={(e) => handleReplySubmit(e, comment._id)} 
          className="ml-8 flex items-center gap-2 pt-1 animate-fadeIn"
        >
          <input
            type="text"
            placeholder={`Reply to ${comment.user?.fullName || "user"}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="input input-xs input-bordered rounded-lg bg-base-100 flex-1 text-xs focus:outline-none placeholder-base-content/30"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!replyText.trim() || isPending}
            className="btn btn-xs btn-primary rounded-lg normal-case font-semibold text-[11px]"
          >
            {isPending ? "..." : "Post"}
          </button>
        </form>
      )}

      {comment.replies?.length > 0 && (
        <div className="ml-6 pl-2 border-l border-base-300/60 space-y-2 mt-1">
          {comment.replies.map((reply, index) => (
            <CommentNode 
              key={reply._id || index} 
              comment={reply} 
              replyingToCommentId={replyingToCommentId}
              setReplyingToCommentId={setReplyingToCommentId}
              replyText={replyText}
              setReplyText={setReplyText}
              handleReplySubmit={handleReplySubmit}
              isPending={isPending}
            />
          ))}
        </div>
      )}

    </div>
  );
}