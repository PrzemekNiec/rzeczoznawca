import React from 'react';

interface SidebarProps {
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ children, open, onClose }) => (
  <>
    {/* Backdrop — mobile only */}
    {open && (
      <div
        className="fixed inset-0 z-30 bg-black/50 md:hidden"
        onClick={onClose}
      />
    )}

    {/* Sidebar panel */}
    <div
      className={`
        fixed inset-y-0 left-0 z-40 w-[380px] max-w-[85vw]
        bg-zinc-800/95 backdrop-blur-2xl border-r border-white/10
        flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.3)]
        transition-transform duration-300 ease-in-out
        md:relative md:inset-auto md:z-20 md:translate-x-0 md:w-[380px] md:max-w-none md:flex-shrink-0 md:bg-white/5
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {children}
    </div>
  </>
);

export default Sidebar;
