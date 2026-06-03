import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post", // Maps to your Post model
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Maps to your User model
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment", // Self-referencing pointer for infinite depths!
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent model overwrite compile compilation errors during hot-reloads
const commentModel = mongoose.models.Comment || mongoose.model("Comment", commentSchema);
export default commentModel;