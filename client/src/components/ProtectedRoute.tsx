import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'user')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  console.log('heni', allowedRoles);
  const userInfo = localStorage.getItem('pendingUserData');
  const userInfoAdmin = localStorage.getItem('pendingUserDataAdmin');
  const parsedUserInfoAdmin = userInfoAdmin ? JSON.parse(userInfoAdmin) : null;
  const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
  console.log('parsedUserInfo', parsedUserInfo);

  if (!parsedUserInfo && !parsedUserInfoAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  if (allowedRoles && (
    (parsedUserInfoAdmin && !allowedRoles.includes(parsedUserInfoAdmin.role)) ||
    (parsedUserInfo && !allowedRoles.includes(parsedUserInfo.role))
  )) {
    return <Navigate to={parsedUserInfoAdmin?.role === 'admin' ? '/admin' : '/user'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;