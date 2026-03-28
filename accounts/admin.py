from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, LoginAuditLog


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display  = ["username", "role", "branch", "is_staff", "is_active"]
    list_filter   = ["role", "branch"]
    fieldsets     = UserAdmin.fieldsets + (
        ("COATS Info", {"fields": ("role", "branch", "google_email")}),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("COATS Info", {
            "fields": ("role", "branch", "google_email")
        }),
    )


@admin.register(LoginAuditLog)
class LoginAuditLogAdmin(admin.ModelAdmin):
    list_display  = ["username", "success", "ip_address", "timestamp", "blockchain_tx"]
    list_filter   = ["success"]
    search_fields = ["username", "ip_address"]
    readonly_fields = ["username", "ip_address", "timestamp", "success", "user_agent", "blockchain_tx", "blockchain_hash", "blockchain_block", "blockchain_url"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
