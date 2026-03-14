import React from 'react';

interface SidebarProps {
  children: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ children }) => (
  <div className="w-full md:w-[380px] flex-shrink-0 bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.15)]">
    {children}
  </div>
);

export default Sidebar;
