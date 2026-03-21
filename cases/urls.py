from django.urls import path
from .views import (
    CaseListCreateView,
    CaseDetailUpdateView,
    CaseLogListView,
    CaseLogVerifyView,
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
    path("cases/",                          CaseListCreateView.as_view()),
    path("cases/<uuid:pk>/",                CaseDetailUpdateView.as_view()),
    path("cases/<uuid:pk>/custody/",        ChainOfCustodyView.as_view()),
    path("case-logs/",                      CaseLogListView.as_view()),
    path("case-logs/<int:pk>/verify/",      CaseLogVerifyView.as_view()),
    path("supervisor/overview/",            SupervisorCaseOverview.as_view()),
    path("dashboard/kpi/",                  DashboardKPIView.as_view()),
    path("dashboard/by-severity/",          DashboardBySeverityView.as_view()),
    path("dashboard/timeline/",             DashboardTimelineView.as_view()),
    path("dashboard/recent-cases/",         DashboardRecentCasesView.as_view()),
]
