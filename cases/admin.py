from django.contrib import admin
from .models import Case, CaseLog, ChainOfCustody, InsiderThreatAlert
from django.utils.html import format_html

# Existing registrations...

@admin.register(InsiderThreatAlert)
class InsiderThreatAlertAdmin(admin.ModelAdmin):
    list_display = ["risk_flag", "user", "score", "detected_at"]
    list_filter  = ["user__role", "user__branch"]
    search_fields = ["user__username", "reasons"]
    readonly_fields = ["user", "score", "reasons", "detected_at"]
    
    def risk_flag(self, obj):
        color = "red" if obj.score >= 10 else "orange" if obj.score >= 5 else "green"
        return format_html(
            '<span style="color: {}; font-weight: bold;">⚡ {}</span>',
            color,
            "CRITICAL THREAT" if obj.score >= 10 else "RISK FLAG"
        )
    risk_flag.short_description = "Risk Status"

    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display  = ["crime_number", "section_of_law", "current_stage", "branch", "case_holding_officer"]
    list_filter   = ["current_stage", "branch"]
    search_fields = ["crime_number", "section_of_law", "complainant_name"]

    def has_delete_permission(self, request, obj=None):
        return False  # Cases cannot be deleted


@admin.register(CaseLog)
class CaseLogAdmin(admin.ModelAdmin):
    list_display  = ["crime_number", "field_changed", "old_value", "new_value", "updated_by", "timestamp", "blockchain_tx"]
    list_filter   = ["field_changed", "branch"]
    search_fields = ["crime_number", "field_changed"]
    readonly_fields = ["case", "field_changed", "old_value", "new_value", "updated_by", "timestamp", "crime_number", "branch", "blockchain_tx", "blockchain_hash", "blockchain_block", "blockchain_url"]

    def has_add_permission(self, request):
        return False  # Cannot create logs manually

    def has_change_permission(self, request, obj=None):
        return False  # Cannot edit logs

    def has_delete_permission(self, request, obj=None):
        return False  # Cannot delete logs


@admin.register(ChainOfCustody)
class ChainOfCustodyAdmin(admin.ModelAdmin):
    list_display  = ["crime_number", "action", "officer_username", "timestamp", "blockchain_tx"]
    list_filter   = ["action", "branch"]
    search_fields = ["crime_number", "officer_username"]
    readonly_fields = ["case", "officer", "officer_username", "officer_role", "officer_branch", "action", "reason", "notes", "field_changed", "old_value", "new_value", "crime_number", "branch", "ip_address", "timestamp", "blockchain_tx", "blockchain_hash", "blockchain_block", "blockchain_url"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
