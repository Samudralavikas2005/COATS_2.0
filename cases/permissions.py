from rest_framework.permissions import BasePermission

class IsCaseOwner(BasePermission):
    """
    Allows updates only by the case holding officer.
    Supervisors can READ.
    """

    def has_object_permission(self, request, view, obj):
        # SAFE METHODS → allow read
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True

        # WRITE → only case officer
        return obj.case_holding_officer == request.user
