function createRoleGuard(requiredRole) {
  return function verifyRole(request, response, next) {
    if (!request.user) {
      return response.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (request.user.role !== requiredRole) {
      return response.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    return next();
  };
}

export const verifyAdmin = createRoleGuard("admin");
export const verifyCustomer = createRoleGuard("customer");
