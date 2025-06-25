from rest_framework.permissions import BasePermission

class IsPharmacyUser(BasePermission):
    """Allows access only to authenticated pharmacy users."""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.user_type == 'pharmacy'
        )


class IsOwnerOrPharmacy(BasePermission):
    """Allows access only to the order owner or the pharmacy handling the order."""

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request, so we'll always
        # allow GET, HEAD or OPTIONS requests.
        # if request.method in permissions.SAFE_METHODS:
        #     return True # This might be too permissive depending on requirements

        # Instance must have an attribute named `customer` or `pharmacy`.
        if request.user.user_type == 'customer':
            return obj.customer == request.user
        elif request.user.user_type == 'pharmacy':
            return obj.pharmacy.user == request.user
        return False
