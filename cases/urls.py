from django.urls import path
from .views import CaseListCreateView, CaseDetailUpdateView, SupervisorCaseOverview
from .dashboard_views import (
    DashboardKPIView,
    DashboardBySeverityView,
    DashboardTimelineView,
    DashboardRecentCasesView,
)

urlpatterns = [
    # ── Existing case endpoints ──────────────────────────────────────
    path("cases/",               CaseListCreateView.as_view()),
    path("cases/<uuid:pk>/",     CaseDetailUpdateView.as_view()),
    path("supervisor/overview/", SupervisorCaseOverview.as_view()),

    # ── Dashboard endpoints (used by COATSDashboard.jsx) ─────────────
    path("dashboard/kpi/",          DashboardKPIView.as_view()),
    path("dashboard/by-severity/",  DashboardBySeverityView.as_view()),
    path("dashboard/timeline/",     DashboardTimelineView.as_view()),
    path("dashboard/recent-cases/", DashboardRecentCasesView.as_view()),
]
