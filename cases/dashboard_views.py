from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import date

from .models import Case

# ── IPC Section → Severity mapping ──────────────────────────────────────────
# Extend this dict to cover all sections your officers use.
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
    """
    Determine severity from the section_of_law field.
    Does a case-insensitive prefix/contains check against IPC_SEVERITY_MAP.
    Falls back to 'Non-Bailable' if unrecognised.
    """
    s = section_of_law.strip().upper()
    for key, sev in IPC_SEVERITY_MAP.items():
        if key.upper() in s:
            return sev
    return "Non-Bailable"   # safe default for unknown sections


# ── 1. KPI endpoint ──────────────────────────────────────────────────────────
class DashboardKPIView(APIView):
    """
    GET /api/dashboard/kpi/
    Returns:
      {
        total_cases, active_cases, closed_cases, cases_this_month
      }
    Only SUPERVISOR can access; Case Officers see their own slice.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "SUPERVISOR":
            qs = Case.objects.all()
        else:
            qs = Case.objects.filter(case_holding_officer=user)

        today = date.today()
        return Response({
            "total_cases":       qs.count(),
            "active_cases":      qs.filter(current_stage__in=ACTIVE_STAGES).count(),
            "closed_cases":      qs.filter(current_stage=CLOSED_STAGE).count(),
            "cases_this_month":  qs.filter(
                                     date_of_registration__year=today.year,
                                     date_of_registration__month=today.month,
                                 ).count(),
        })


# ── 2. By-severity endpoint ───────────────────────────────────────────────────
class DashboardBySeverityView(APIView):
    """
    GET /api/dashboard/by-severity/
    Returns:
      [
        { "severity": "Minor",        "total": N },
        { "severity": "Bailable",     "total": N },
        { "severity": "Non-Bailable", "total": N },
        { "severity": "Heinous",      "total": N },
      ]
    Severity is derived from section_of_law using IPC_SEVERITY_MAP.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "SUPERVISOR":
            qs = Case.objects.all()
        else:
            qs = Case.objects.filter(case_holding_officer=user)

        severity_counts = {"Minor": 0, "Bailable": 0, "Non-Bailable": 0, "Heinous": 0}

        for section in qs.values_list("section_of_law", flat=True):
            sev = get_severity(section)
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        result = [
            {"severity": sev, "total": count}
            for sev, count in severity_counts.items()
        ]
        return Response(result)


# ── 3. Timeline endpoint ──────────────────────────────────────────────────────
class DashboardTimelineView(APIView):
    """
    GET /api/dashboard/timeline/
    Returns monthly case counts (last 12 months):
      [
        { "month": "2025-01-01", "total": N },
        ...
      ]
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "SUPERVISOR":
            qs = Case.objects.all()
        else:
            qs = Case.objects.filter(case_holding_officer=user)

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


# ── 4. Recent cases endpoint ──────────────────────────────────────────────────
class DashboardRecentCasesView(APIView):
    """
    GET /api/dashboard/recent-cases/
    Returns last 10 cases (newest first):
      [
        {
          "id", "case_number", "ipc_section",
          "severity", "status", "date_of_registration"
        },
        ...
      ]
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

        recent = qs.order_by("-date_of_registration", "-date_of_first_updation")[:10]

        return Response([
            {
                "id":                    str(c.id),
                "case_number":           c.crime_number,
                "ipc_section":           c.section_of_law,
                "severity":              get_severity(c.section_of_law),
                "status":                self.STAGE_LABEL.get(c.current_stage, c.current_stage),
                "date_of_registration":  c.date_of_registration.strftime("%Y-%m-%d"),
            }
            for c in recent
        ])
