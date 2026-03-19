from django.urls import path
from .views import (
    CaseListCreateView,
    CaseDetailUpdateView,
    CaseLogListView,
    ChainOfCustodyView,
    SupervisorCaseOverview,
)
from .dashboard_views import (
    DashboardKPIView,
    DashboardBySeverityView,
    DashboardTimelineView,
    DashboardRecentCasesView,
)

urlpatterns = [
    # ── Case endpoints ────────────────────────────────────────────
    path("cases/",CaseListCreateView.as_view()),
    path("cases/<uuid:pk>/",CaseDetailUpdateView.as_view()),

    # ── Chain of Custody ──────────────────────────────────────────
    path("cases/<uuid:pk>/custody/",ChainOfCustodyView.as_view()),

    # ── Audit logs ────────────────────────────────────────────────
    path("case-logs/",CaseLogListView.as_view()),

    # ── Supervisor overview ───────────────────────────────────────
    path("supervisor/overview/",SupervisorCaseOverview.as_view()),

    # ── Dashboard ─────────────────────────────────────────────────
    path("dashboard/kpi/",DashboardKPIView.as_view()),
    path("dashboard/by-severity/",DashboardBySeverityView.as_view()),
    path("dashboard/timeline/",DashboardTimelineView.as_view()),
    path("dashboard/recent-cases/",DashboardRecentCasesView.as_view()),
]
