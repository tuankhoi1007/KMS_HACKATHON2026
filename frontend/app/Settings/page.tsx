'use client';
import { useAuth } from '@/context/AuthContext';
import { Settings, User, Bell, Shield, Paintbrush } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 mt-1 font-medium">Manage your account preferences and application settings.</p>
      </div>

      <div className="bg-white rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-8 flex gap-8">
         {/* Settings Sidebar */}
         <div className="w-64 pr-6 space-y-1">
             <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 font-bold rounded-2xl text-sm transition">
               <User className="w-4 h-4" /> Account Profile
             </button>
             <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-2xl text-sm transition">
               <Bell className="w-4 h-4" /> Notifications
             </button>
             <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-2xl text-sm transition">
               <Shield className="w-4 h-4" /> Privacy & Security
             </button>
             <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-2xl text-sm transition">
               <Paintbrush className="w-4 h-4" /> Appearance
             </button>
         </div>

         {/* Settings Content */}
         <div className="flex-1 space-y-8">
            <div>
               <h3 className="font-bold text-slate-800 mb-4 text-lg border-b pb-2">Profile Information</h3>
               <div className="space-y-4 max-w-md">
                   <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                       <input type="text" className="w-full rounded-xl px-4 py-3 text-sm bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] outline-none focus:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition text-slate-900" defaultValue={user?.full_name || 'N/A'} />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                       <input type="email" className="w-full rounded-xl px-4 py-3 text-sm bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] outline-none focus:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition text-slate-900" defaultValue={isTeacher ? 'teacher@brainroot.ai' : 'student@brainroot.ai'} />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
                       <input type="text" className="w-full rounded-xl px-4 py-3 text-sm bg-slate-50 shadow-[inset_0_2px_10px_rgb(0,0,0,0.02)] text-slate-500 outline-none cursor-not-allowed" value={isTeacher ? 'Educator (Pro)' : 'Student'} disabled />
                   </div>
               </div>
            </div>

            <div>
               <h3 className="font-bold text-slate-800 mb-4 text-lg border-b pb-2">Save Changes</h3>
               <div className="flex gap-4">
                  <button className="bg-blue-600 text-white px-6 py-2.5 font-bold text-sm rounded-lg shadow-sm hover:bg-blue-700 transition">Update Profile</button>
                  <button className="bg-slate-100 text-slate-600 px-6 py-2.5 font-bold text-sm rounded-lg hover:bg-slate-200 transition">Cancel</button>
               </div>
            </div>
         </div>
      </div>

    </div>
  );
}
