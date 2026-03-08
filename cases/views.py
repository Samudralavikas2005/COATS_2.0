from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Case
from .serializers import CaseSerializer
from .permissions import IsCaseOwner


class CaseListCreateView(generics.ListCreateAPIView):
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == "SUPERVISOR":
            return Case.objects.all()

        return Case.objects.filter(case_holding_officer=user)

    def perform_create(self, serializer):
        user = self.request.user

        if user.role != "CASE":
            raise PermissionDenied("Only Case Officers can create cases.")

        serializer.save(
            case_holding_officer=user,
            branch=user.branch
        )


class CaseDetailUpdateView(RetrieveUpdateAPIView):
    queryset = Case.objects.all()
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated, IsCaseOwner]

    def perform_update(self, serializer):
        if self.request.user.role != "CASE":
            raise PermissionDenied("Supervisors cannot update cases.")
        serializer.save()


class SupervisorCaseOverview(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "SUPERVISOR":
            return Response({"detail": "Forbidden"}, status=403)

        pending = ["UI", "PT", "HC", "SC"]

        return Response({
            "pending": CaseSerializer(
                Case.objects.filter(current_stage__in=pending),
                many=True
            ).data,
            "closed": CaseSerializer(
                Case.objects.filter(current_stage="CC"),
                many=True
            ).data,
        })
