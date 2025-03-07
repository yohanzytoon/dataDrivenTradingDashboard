import React from 'react';
import { 
  Home, BarChart2, LineChart, PieChart, Activity, Star, Clock, FileText, Settings, Users, Shield 
} from 'lucide-react';

// Temporary mock for useAuth until context is properly set up
const useAuth = () => {
  return {
    user: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    },
    isAdmin: false
  };
};

// Temporary mock for NavLink until react-router-dom is installed
const NavLink: React.FC<{
  to: string;
  children: React.ReactNode;
  className: (props: { isActive: boolean }) => string;
}> = ({ to, children, className }) => {
  // Simulate active state for demo purposes
  const isActive = to === '/';
  
  return (
    <a 
      href={to} 
      className={className({ isActive })}
    >
      {children}
    </a>
  );
};

interface SidebarProps {
  isOpen: boolean;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isOpen }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) => `
        flex items-center py-2 px-3 rounded-md
        ${isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}
        ${isOpen ? 'justify-start' : 'justify-center'}
        transition-all duration-200
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      {isOpen && <span className="ml-3 font-medium">{label}</span>}
    </NavLink>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { user, isAdmin } = useAuth();
  
  return (
    <aside className={`
      ${isOpen ? 'w-64' : 'w-16'} 
      h-screen fixed top-0 left-0 bg-white dark:bg-gray-900 shadow-md
      transition-all duration-300 ease-in-out transform z-20
      flex flex-col border-r border-gray-200 dark:border-gray-800
    `}>
      <div className="p-4 flex items-center justify-center h-14 border-b border-gray-200 dark:border-gray-800">
        {isOpen ? (
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">TradeInsight</h1>
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">
            TI
          </div>
        )}
      </div>
      
      <div className="flex-1 py-6 px-3 overflow-y-auto">
        <nav className="space-y-2">
          <NavItem to="/" icon={<Home size={20} />} label="Dashboard" isOpen={isOpen} />
          <NavItem to="/market" icon={<BarChart2 size={20} />} label="Market Overview" isOpen={isOpen} />
          <NavItem to="/watchlist" icon={<Star size={20} />} label="Watchlists" isOpen={isOpen} />
          <NavItem to="/analysis" icon={<LineChart size={20} />} label="Technical Analysis" isOpen={isOpen} />
          <NavItem to="/portfolio" icon={<PieChart size={20} />} label="Portfolio Tracker" isOpen={isOpen} />
          <NavItem to="/news" icon={<FileText size={20} />} label="Market News" isOpen={isOpen} />
          <NavItem to="/alerts" icon={<Activity size={20} />} label="Price Alerts" isOpen={isOpen} />
          <NavItem to="/history" icon={<Clock size={20} />} label="Trading History" isOpen={isOpen} />
        </nav>
        
        {isAdmin && isOpen && (
          <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800">
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Admin
            </h3>
            <nav className="mt-2 space-y-2">
              <NavItem to="/admin/users" icon={<Users size={20} />} label="User Management" isOpen={isOpen} />
              <NavItem to="/admin/security" icon={<Shield size={20} />} label="Security" isOpen={isOpen} />
            </nav>
          </div>
        )}
      </div>
      
      {isOpen && user && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
          <div className="ml-3 truncate">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>
        </div>
      )}
      
      <div className="p-4 flex items-center justify-center">
        <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" isOpen={isOpen} />
      </div>
    </aside>
  );
};

export default Sidebar;