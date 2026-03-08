from rest_framework import serializers
from .models import Case

class CaseSerializer(serializers.ModelSerializer):
    case_holding_officer_username = serializers.CharField(
        source="case_holding_officer.username",
        read_only=True
    )

    class Meta:
        model = Case
        fields = "__all__"
        read_only_fields = [
            "id",
            "branch",
            "case_holding_officer",
            "case_holding_officer_username",
        ]
