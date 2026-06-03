import React from 'react'

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open modal-bottom sm:modal-middle z-50 animate-fadeIn">
      <div className="modal-box border border-base-300 shadow-xl">
        <h3 className="font-bold text-lg text-error">{title}</h3>
        <p className="py-4 text-sm sm:text-base">{message}</p>
        
        <div className="modal-action gap-2">
          <button 
            className="btn btn-ghost btn-sm sm:btn-md" 
            onClick={onClose}
            disabled={isLoading}
          >
            No
          </button>
          <button 
            className="btn btn-error btn-sm sm:btn-md" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Removing...' : 'Yes'}
          </button>
        </div>
      </div>
      {/* Backdrop overlay to close when clicking outside */}
      <div className="modal-backdrop bg-black/40 fixed inset-0" onClick={onClose}></div>
    </div>
  )
}

export default ConfirmationModal