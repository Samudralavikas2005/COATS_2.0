from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.contrib.auth import logout
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from accounts.views import CustomTokenObtainPairView, SetupMFAView


def admin_logout_redirect(request):
    logout(request)
    return redirect("/admin/login/")


urlpatterns = [
    # ── Admin ─────────────────────────────────────────────────────
    path("admin/logout/", admin_logout_redirect),
    path("admin/",        admin.site.urls),

    # ── API ───────────────────────────────────────────────────────
    path("api/",               include("cases.urls")),
    path("api/token/",         CustomTokenObtainPairView.as_view()),
    path("api/setup-mfa/",     SetupMFAView.as_view()),
    path("api/token/refresh/", TokenRefreshView.as_view()),

    # ── Swagger API Docs ──────────────────────────────────────────
    path("api/schema/",            SpectacularAPIView.as_view(),      name="schema"),
    path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(
                                       url_name="schema"
                                   ),                                  name="swagger-ui"),
]

from django.views.static import serve
from django.urls import re_path

# ── Serve media files (Forced for Render Production) ──────────────
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
