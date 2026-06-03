import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storyImage: {
      type: String,
      required: true, // Stories generally need an image or background
    },
    caption: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: "24h", // 🔥 MongoDB will automatically delete this document after 24 hours!
    },
  },
  { timestamps: true }
);

const storyModel = mongoose.model("Story", storySchema);
export default storyModel;