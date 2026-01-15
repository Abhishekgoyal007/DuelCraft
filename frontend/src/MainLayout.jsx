import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";

export default function MainLayout() {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    );
}
