import { UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfileIcon: React.FC = () => {
  return (
    <Link to="/profile" className="fixed top-4 right-4">
      <UserCircle 
        className="w-10 h-10 text-gray-700 hover:text-gray-900 transition-colors
          dark:text-gray-300 dark:hover:text-white" 
      />
    </Link>
  );
};