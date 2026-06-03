import { MapIcon, X } from 'lucide-react';
import React, { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeFriend } from '../lib/api';
import { toast } from 'react-hot-toast';
import ConfirmationModal from './Confirmation'; 

const FriendCard = ({ friend }) => { 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: unfriendMutation, isPending } = useMutation({
    mutationFn: removeFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success(`${friend.fullName} removed from friend list`);
      setIsModalOpen(false);
    },
    onError: (error) => {
      console.error("Failed to remove friend:", error);
      toast.error(error.response?.data?.message || "Failed to remove friend");
    }
  });

  console.log("Friend data received:", friend);
  if (!friend) return null;

  return (
    // 🛠️ FIX: Added inline style 'position: relative' to guarantee the container context handles absolute items!
    <div 
      className='card bg-base-200 shadow-sm border border-base-300 overflow-visible group'
      style={{ position: 'relative' }}
    >
      
      {/* 🛠️ TOP RIGHT CORNER X BUTTON: Bright text with a border matching your setup */}
      <button 
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setIsModalOpen(true);
        }}
        className='absolute top-2 right-2 p-1 rounded-full bg-base-300 border border-base-100 shadow text-neutral-content hover:bg-error hover:text-error-content hover:border-error transition-all z-30'
        style={{ position: 'absolute', top: '8px', right: '8px' }}
        title={`Remove ${friend.fullName}`}
      >
        <X className='w-4 h-4' />
      </button>

      <div className='card-body p-4 relative z-10'>
        {/* User info */}
        <div className='flex items-center gap-3 mb-3 pr-6'>
            <div className='avatar size-12 rounded-full overflow-hidden bg-base-300'>
                <img src={friend.profilePic || "/default-avatar.png"} alt={friend.fullName} />
            </div>
            <h3 className='font-semibold truncate text-base-content'>{friend.fullName}</h3>
        </div>

        <Link to={`/chat/${friend._id}`} className='btn btn-outline btn-primary btn-sm w-full'>
          Message
        </Link>
      </div>

      {/* POPUP MODAL */}
      <ConfirmationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => unfriendMutation(friend._id)}
        title="Remove Friend"
        message={`Do you really want to remove ${friend.fullName} from your friendlist?`}
        isLoading={isPending}
      />
    </div>
  )
}

export default FriendCard