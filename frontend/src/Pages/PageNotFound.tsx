import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export default function PageNotFound() {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold mt-4">404 - Page Not Found</h1>
            <Button className="mt-2" onClick={() => navigate("/")}>Go to home page</Button>
        </div>
    )
}