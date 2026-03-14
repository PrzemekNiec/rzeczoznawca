import { X } from 'lucide-react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => (
  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
    <div className="bg-white/10 backdrop-blur-2xl text-white px-5 py-3 rounded-xl shadow-xl border border-white/10 flex items-center gap-3 max-w-md">
      <p className="text-sm">{message}</p>
      <button onClick={onDismiss} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  </div>
);

export default Toast;
