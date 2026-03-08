from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.contrib.auth import logout
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import CustomTokenObtainPairView

def admin_logout_redirect(request):
    logout(request)
    return redirect("/admin/login/")   # or your React login

urlpatterns = [
    path("admin/logout/", admin_logout_redirect),  # 👈 add THIS
    path("admin/", admin.site.urls),
    path("api/", include("cases.urls")),
    path("api/token/", CustomTokenObtainPairView.as_view()),
    path("api/token/refresh/", TokenRefreshView.as_view()),
]
