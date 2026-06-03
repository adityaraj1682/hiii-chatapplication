import React from "react";

export default function DeleteModal({ isOpen, onClose, onConfirm, isPending }) {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open backdrop-blur-sm bg-black/40 z-50">
      <div className="modal-box max-w-sm rounded-2xl bg-base-100 border border-base-300">
        <h3 className="font-bold text-lg text-center text-base-content">Delete Post?</h3>
        <p className="py-3 text-sm text-center text-base-content/60">
          Are you sure you want to permanently delete this post? This action cannot be undone.
        </p>
        <div className="modal-action flex justify-center gap-3 mt-4">
          <button 
            className="btn btn-ghost rounded-xl px-6 normal-case text-base-content/70"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button 
            className="btn btn-error rounded-xl px-6 normal-case text-error-content shadow-sm"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <span className="loading loading-spinner loading-xs" /> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}