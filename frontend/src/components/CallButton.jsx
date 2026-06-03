import { VideoIcon } from "lucide-react";

function CallButton({handleVideoCall}){
    return (
        <div className="p-3  flex items-center justify-end max-w-7xl mx-auto w-full absolute top-2 right-20 rounded-2xl">
            <button onClick={handleVideoCall} className="btn btn-success btn-sm text-white">
                <VideoIcon className="size-6"/>
            </button>

        </div>
    )
}
export default CallButton