from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils.dateparse import parse_date
from datetime import date

from .models import Case

# ── IPC Section → Severity mapping ───────────────────────────────
IPC_SEVERITY_MAP = {
    # Minor
    "IPC 279": "Minor", "IPC 283": "Minor", "IPC 290": "Minor",
    "IPC 294": "Minor", "IPC 341": "Minor",
    # Bailable
    "IPC 323": "Bailable", "IPC 336": "Bailable", "IPC 379": "Bailable",
    "IPC 420": "Bailable", "IPC 504": "Bailable",
    # Non-Bailable
    "IPC 302": "Non-Bailable", "IPC 307": "Non-Bailable", "IPC 376": "Non-Bailable",
    "IPC 395": "Non-Bailable", "IPC 396": "Non-Bailable",
    # Heinous
    "IPC 120B": "Heinous", "IPC 302r/w120B": "Heinous", "IPC 364A": "Heinous",
    "IPC 376A": "Heinous", "IPC 376D": "Heinous",
}

ACTIVE_STAGES = ["UI", "PT", "HC", "SC"]
CLOSED_STAGE  = "CC"


def get_severity(section_of_law: str) -> str:
    s = section_of_law.strip().upper()
    for key, sev in IPC_SEVERITY_MAP.items():
        if key.upper() in s:
            return sev
    return "Non-Bailable"


def apply_filters(request, qs):
    """
    Apply branch and date range filters from query params.
    Supports:
      ?branch=CNI
      ?date_from=2025-01-01
      ?date_to=2025-12-31
    """
    branch    = request.query_params.get("branch")
    date_from = request.query_params.get("date_from")
    date_to   = request.query_params.get("date_to")

    if branch and branch != "ALL":
        qs = qs.filter(branch=branch)
    if date_from:
        parsed = parse_date(date_from)
        if parsed:
            qs = qs.filter(date_of_registration__gte=parsed)
    if date_to:
        parsed = parse_date(date_to)
        if parsed:
            qs = qs.filter(date_of_registration__lte=parsed)

    return qs


# ── 1. KPI endpoint ───────────────────────────────────────────────
class DashboardKPIView(APIView):
    """
    GET /api/dashboard/kpi/
    Supports ?branch=CNI&date_from=2025-01-01&date_to=2025-12-31
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "SUPERVISOR":
            qs = Case.objects.all()
        else:
            qs = Case.objects.filter(case_holding_officer=user)

        qs    = apply_filters(request, qs)
        today = date.today()

        return Response({
            "total_cases":      qs.count(),
            "active_cases":     qs.filter(current_stage__in=ACTIVE_STAGES).count(),
            "closed_cases":     qs.filter(current_stage=CLOSED_STAGE).count(),
            "cases_this_month": qs.filter(
                date_of_registration__year=today.year,
                date_of_registration__month=today.month,
            ).count(),
        })


# ── 2. By-severity endpoint ───────────────────────────────────────
class DashboardBySeverityView(APIView):
    """
    GET /api/dashboard/by-severity/
    Supports ?branch=CNI&date_from=...&date_to=...
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "SUPERVISOR":
            qs = Case.objects.all()
        else:
            qs = Case.objects.filter(case_holding_officer=user)

        qs = apply_filters(request, qs)

        severity_counts = {"Minor": 0, "Bailable": 0, "Non-Bailable": 0, "Heinous": 0}

        for section in qs.values_list("section_of_law", flat=True):
            sev = get_severity(section)
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        return Response([
            {"severity": sev, "total": count}
            for sev, count in severity_counts.items()
        ])


# ── 3. Timeline endpoint ──────────────────────────────────────────
class DashboardTimelineView(APIView):
    """
    GET /api/dashboard/timeline/
    Supports ?branch=CNI&date_from=...&date_to=...
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "SUPERVISOR":
            qs = Case.objects.all()
        else:
            qs = Case.objects.filter(case_holding_officer=user)

        qs = apply_filters(request, qs)

        data = (
            qs
            .annotate(month=TruncMonth("date_of_registration"))
            .values("month")
            .annotate(total=Count("id"))
            .order_by("month")
        )

        return Response([
            {
                "month": row["month"].strftime("%Y-%m-%d"),
                "total": row["total"],
            }
            for row in data
        ])


# ── 4. Recent cases endpoint ──────────────────────────────────────
class DashboardRecentCasesView(APIView):
    """
    GET /api/dashboard/recent-cases/
    Supports ?branch=CNI&date_from=...&date_to=...
    """
    permission_classes = [IsAuthenticated]

    STAGE_LABEL = {
        "UI": "Under Investigation",
        "PT": "Pending Trial",
        "HC": "Pending before HC",
        "SC": "Pending before SC",
        "CC": "Closed",
    }

    def get(self, request):
        user = request.user

        if user.role == "SUPERVISOR":
            qs = Case.objects.all()
        else:
            qs = Case.objects.filter(case_holding_officer=user)

        qs     = apply_filters(request, qs)
        recent = qs.order_by("-date_of_registration", "-date_of_first_updation")[:10]

        return Response([
            {
                "id":                   str(c.id),
                "case_number":          c.crime_number,
                "ipc_section":          c.section_of_law,
                "severity":             get_severity(c.section_of_law),
                "status":               self.STAGE_LABEL.get(c.current_stage, c.current_stage),
                "branch":               c.branch,
                "date_of_registration": c.date_of_registration.strftime("%Y-%m-%d"),
            }
            for c in recent
        ])
