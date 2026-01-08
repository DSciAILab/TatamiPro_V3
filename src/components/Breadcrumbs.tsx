import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Generate breadcrumbs from current path
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';
  paths.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Format segment into readable label
    let label = segment
      .replace(/-/g, ' ')
      .replace(/^\w/, c => c.toUpperCase());
    
    // Handle special cases
    if (segment === 'events') label = 'Events';
    if (segment === 'create') label = 'Create New';
    if (segment.match(/^[0-9a-f-]{36}$/i)) label = 'Details'; // UUID
    
    breadcrumbs.push({
      label,
      href: index < paths.length - 1 ? currentPath : undefined, // Last item has no link
    });
  });

  return breadcrumbs;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  const location = useLocation();
  const breadcrumbs = items || generateBreadcrumbs(location.pathname);

  if (breadcrumbs.length === 0) return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center text-sm text-muted-foreground mb-4", className)}
    >
      <Link 
        to="/" 
        className="flex items-center hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 mx-2 flex-shrink-0" />
          {item.href ? (
            <Link 
              to={item.href} 
              className="hover:text-foreground transition-colors truncate max-w-[150px]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
