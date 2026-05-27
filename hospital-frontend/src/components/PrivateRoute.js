import React, { useContext } from 'react';
import { AuthContext } from './AuthContext';
import AccessDenied from './AccessDenied';

const PrivateRoute = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated || !user) {

    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDenied />;
  }

  return children;
};

export default PrivateRoute;
