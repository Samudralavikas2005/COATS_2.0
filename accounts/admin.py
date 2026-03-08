from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(DjangoUserAdmin):
    list_display = ("username", "role", "branch", "is_staff", "is_active")
    list_filter = ("role", "branch")
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Role & Branch", {"fields": ("role", "branch")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )
