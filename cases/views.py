import threading
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta

from .models import Case, CaseLog, ChainOfCustody
from .serializers import CaseSerializer, CaseLogSerializer, ChainOfCustodySerializer
from .permissions import IsCaseOwner
from blockchain.service import blockchain

TRACKED_FIELDS = [
    "current_stage", "action_to_be_taken", "section_of_law",
    "complainant_name", "accused_details", "gist_of_case", "ps_limit",
]

VIEW_COOLDOWN_MINUTES = 5


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def anchor_in_background(anchor_fn, obj, model_class, pk):
    """
    Runs blockchain anchoring in a background thread
    so the API response is not delayed.
    """
    def run():
        result = anchor_fn(obj)
        if "tx_hash" in result:
            model_class.objects.filter(pk=pk).update(
                blockchain_tx=result["tx_hash"],
                blockchain_hash=result["log_hash"],
                blockchain_block=result["block"],
                blockchain_url=result["etherscan"],
            )
    threading.Thread(target=run, daemon=True).start()


def record_custody(case, user, action, reason="", notes="",
                   field_changed="", old_value="", new_value="",
                   ip_address=None):
    entry = ChainOfCustody.objects.create(
        case=case,
        officer=user,
        officer_username=user.username if user else "",
        officer_role=getattr(user, 'role', ""),
        officer_branch=getattr(user, 'branch', ""),
        action=action,
        reason=reason,
        notes=notes,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        crime_number=case.crime_number,
        branch=case.branch,
        ip_address=ip_address,
    )

    # ── Anchor custody entry in background ───────────────────────
    anchor_in_background(
        blockchain.anchor_custody,
        entry, ChainOfCustody, entry.pk
    )


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

        case = serializer.save(
            case_holding_officer=user,
            branch=user.branch
        )

        # ── Anchor case creation in background ────────────────────
        anchor_in_background(
            lambda c: blockchain.anchor_case_create(c, user),
            case, Case, case.pk
        )

        record_custody(
            case=case,
            user=user,
            action="CREATED",
            reason="Initial case registration",
            notes=f"Case filed under {case.section_of_law}",
            ip_address=get_client_ip(self.request),
        )


class CaseDetailUpdateView(RetrieveUpdateAPIView):
    queryset = Case.objects.all()
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated, IsCaseOwner]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        cooldown_threshold = timezone.now() - timedelta(minutes=VIEW_COOLDOWN_MINUTES)
        recent_view_exists = ChainOfCustody.objects.filter(
            case=instance,
            officer=user,
            action="VIEWED",
            timestamp__gte=cooldown_threshold,
        ).exists()

        if not recent_view_exists:
            record_custody(
                case=instance,
                user=user,
                action="VIEWED",
                reason="Case record accessed",
                ip_address=get_client_ip(request),
            )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_update(self, serializer):
        user = self.request.user
        if user.role != "CASE":
            raise PermissionDenied("Supervisors cannot update cases.")

        reason = self.request.data.get("reason", "").strip()
        if not reason:
            raise ValidationError(
                {"reason": "A reason is mandatory when updating a case."}
            )

        instance = self.get_object()
        old_values = {f: str(getattr(instance, f) or "") for f in TRACKED_FIELDS}

        serializer.save()

        updated = self.get_object()
        ip = get_client_ip(self.request)

        for field in TRACKED_FIELDS:
            new_val = str(getattr(updated, field) or "")
            old_val = old_values[field]

            if old_val != new_val:
                # Create CaseLog entry
                log = CaseLog.objects.create(
                    case=updated,
                    field_changed=field,
                    old_value=old_val,
                    new_value=new_val,
                    updated_by=user,
                    crime_number=updated.crime_number,
                    branch=updated.branch,
                )

                # ── Anchor CaseLog in background ──────────────────
                anchor_in_background(
                    blockchain.anchor_log,
                    log, CaseLog, log.pk
                )

                # Chain of Custody entry
                if field == "current_stage":
                    action = "STAGE"
                    notes  = f"Stage changed from {old_val} to {new_val}"
                elif field == "action_to_be_taken":
                    action = "ACTION"
                    notes  = "Action to be taken updated"
                else:
                    action = "UPDATED"
                    notes  = f"{field} was modified"

                record_custody(
                    case=updated,
                    user=user,
                    action=action,
                    reason=reason,
                    notes=notes,
                    field_changed=field,
                    old_value=old_val,
                    new_value=new_val,
                    ip_address=ip,
                )


class ChainOfCustodyView(generics.ListAPIView):
    serializer_class = ChainOfCustodySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        case_id = self.kwargs.get("pk")
        return ChainOfCustody.objects.filter(case_id=case_id)


class CaseLogListView(generics.ListAPIView):
    serializer_class = CaseLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "SUPERVISOR":
            return CaseLog.objects.select_related("case", "updated_by").all()
        return CaseLog.objects.select_related("case", "updated_by").filter(
            case__case_holding_officer=user
        )


class CaseLogVerifyView(APIView):
    """
    GET /api/case-logs/<id>/verify/
    Verifies a specific log entry against Sepolia blockchain.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            log = CaseLog.objects.get(pk=pk)
        except CaseLog.DoesNotExist:
            return Response({"error": "Log not found"}, status=404)

        result = blockchain.verify_log(log)
        return Response(result)


class SupervisorCaseOverview(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "SUPERVISOR":
            return Response({"detail": "Forbidden"}, status=403)

        pending = ["UI", "PT", "HC", "SC"]
        return Response({
            "pending": CaseSerializer(
                Case.objects.filter(current_stage__in=pending), many=True
            ).data,
            "closed": CaseSerializer(
                Case.objects.filter(current_stage="CC"), many=True
            ).data,
        })
