import { useState } from 'react';
import Sidebar from './Sidebar';
import { cn } from '../../lib/utils';

const DashboardLayout = ({ children, activeTab, onTabChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={onTabChange}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          "lg:ml-0" // Sidebar handles its own width
        )}
      >
        {/* Mobile Header Spacer */}
        <div className="h-16 lg:hidden" />
        
        {/* Content */}
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
