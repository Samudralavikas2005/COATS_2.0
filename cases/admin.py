
# Register your models here.
from django.contrib import admin
from .models import Case


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'crime_number',
        'current_stage',
        'branch',
        'case_holding_officer',
        'date_of_first_updation',
    )

    list_filter = ('current_stage', 'branch')
    search_fields = ('crime_number', 'complainant_name')
