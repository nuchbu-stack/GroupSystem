import { auth, googleProvider, isUserInstructor } from "../firebase";
import { signInWithPopup, signOut, User } from "firebase/auth";
import { LogIn, LogOut, GraduationCap, User as UserIcon, BookOpen } from "lucide-react";

interface NavbarProps {
  user: User | null;
  loading: boolean;
}

export default function Navbar({ user, loading }: NavbarProps) {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("GAuth Error: ", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout Error: ", err);
    }
  };

  const isInstructor = user ? isUserInstructor(user.email) : false;

  return (
    <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Application Name */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-violet-600 to-pink-500 p-2.5 rounded-lg shadow-inner flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-sans font-bold text-lg md:text-xl tracking-tight bg-gradient-to-r from-violet-400 via-pink-400 to-white bg-clip-text text-transparent">
                ระบบจัดกลุ่มงานและให้คะแนนตามเกณฑ์
              </span>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider -mt-1 hidden sm:block">
                BANGKOK UNIVERSITY GROUP PROJECTS & GRADING
              </div>
            </div>
          </div>

          {/* User Profile / Login Controls */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="animate-pulse h-8 w-24 bg-slate-800 rounded"></div>
            ) : user ? (
              <div className="flex items-center space-x-3">
                {/* User Role Badge */}
                <div className="hidden md:flex flex-col items-end">
                  <div className="text-sm font-medium text-slate-200">{user.displayName}</div>
                  <div className="text-[11px] text-slate-400">{user.email}</div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isInstructor
                        ? "bg-violet-900/60 text-violet-200 border border-violet-700"
                        : "bg-emerald-900/60 text-emerald-200 border border-emerald-700"
                    }`}
                  >
                    {isInstructor ? "👨‍🏫 อาจารย์ (Instructor)" : "🎓 นักศึกษา (Student)"}
                  </span>

                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full ring-2 ring-violet-500"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center ring-2 ring-violet-500">
                      <UserIcon className="h-5 w-5 text-slate-400" />
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    className="p-2 ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition duration-200"
                    title="ออกจากระบบ"
                    id="btn-logout"
                  >
                    <LogOut className="h-5 w-5 stroke-[2]" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-lg shadow-violet-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition duration-300"
                id="btn-login"
              >
                <LogIn className="h-4 w-4 mr-2" />
                เข้าสู่ระบบด้วย Google
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
