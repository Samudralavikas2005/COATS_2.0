from django.urls import path
from .views import (
    CaseListCreateView,
    CaseDetailUpdateView,
    CaseLogListView,
    CaseLogVerifyView,
    ChainOfCustodyView,
    CaseProgressListCreateView,
    CaseProgressCompleteView,
    CaseHandoverView,
    OfficersListView,
    LegalAssistantView,
    LegalAssistantFileView,
    SupervisorCaseOverview,
    CaseReportPDFView,
    CaseReportCSVView,
    CaseRecommendationView,
    EvidenceListCreateView,
    WitnessListCreateView,
    CrimeMapDataView,
    AccusedLinkAnalysisView,
)
from .dashboard_views import (
    DashboardKPIView,
    DashboardBySeverityView,
    DashboardTimelineView,
    DashboardRecentCasesView,
)

urlpatterns = [
    # ── Cases ─────────────────────────────────────────────────────
    path("cases/",                              CaseListCreateView.as_view()),
    path("cases/<uuid:pk>/",                    CaseDetailUpdateView.as_view()),
    path("cases/<uuid:pk>/custody/",            ChainOfCustodyView.as_view()),
    path("cases/<uuid:pk>/progress/",           CaseProgressListCreateView.as_view()),
    path("cases/<uuid:pk>/handover/",           CaseHandoverView.as_view()),
    path("cases/<uuid:pk>/report/pdf/",         CaseReportPDFView.as_view()),
    path("cases/<uuid:pk>/report/csv/",         CaseReportCSVView.as_view()),
    path("cases/<uuid:pk>/recommendations/",    CaseRecommendationView.as_view()),
    path("cases/<uuid:pk>/evidence/",           EvidenceListCreateView.as_view()),
    path("cases/<uuid:pk>/witnesses/",          WitnessListCreateView.as_view()),
    # ── Progress ──────────────────────────────────────────────────
    path("progress/<int:pk>/complete/",         CaseProgressCompleteView.as_view()),
    # ── Logs ──────────────────────────────────────────────────────
    path("case-logs/",                          CaseLogListView.as_view()),
    path("case-logs/<int:pk>/verify/",          CaseLogVerifyView.as_view()),
    # ── Officers ──────────────────────────────────────────────────
    path("officers/",                           OfficersListView.as_view()),
    # ── Supervisor ────────────────────────────────────────────────
    path("supervisor/overview/",                SupervisorCaseOverview.as_view()),
    # ── Dashboard ─────────────────────────────────────────────────
    path("dashboard/kpi/",                      DashboardKPIView.as_view()),
    path("dashboard/by-severity/",              DashboardBySeverityView.as_view()),
    path("dashboard/timeline/",                 DashboardTimelineView.as_view()),
    path("dashboard/recent-cases/",             DashboardRecentCasesView.as_view()),
    # ── Intelligence ──────────────────────────────────────────────
    path("intelligence/crime-map/",             CrimeMapDataView.as_view()),
    path("intelligence/link-analysis/",         AccusedLinkAnalysisView.as_view()),
    # ── AI ────────────────────────────────────────────────────────
    path("ai/legal-assistant/",                 LegalAssistantView.as_view()),
    path("ai/legal-assistant/file/",            LegalAssistantFileView.as_view()),
]
