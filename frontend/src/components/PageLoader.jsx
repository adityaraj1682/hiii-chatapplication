import { LoaderIcon } from "lucide-react";

const PageLoader  = () =>{
    return (
        <div className="min-h-screen flex items-center justify-center">
            <LoaderIcon className='animate-spin size-20 text-primary'/>
        </div>
    )
}
export default PageLoader