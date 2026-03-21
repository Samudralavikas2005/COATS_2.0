from django.db import models
from django.conf import settings
import uuid


class Case(models.Model):

    CASE_STAGE_CHOICES = (
        ('UI', 'Under Investigation'),
        ('PT', 'Pending Trial'),
        ('HC', 'Pending before High Court'),
        ('SC', 'Pending before Supreme Court'),
        ('CC', 'Case Closed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    ps_limit = models.CharField(max_length=100)
    crime_number = models.CharField(max_length=100)
    section_of_law = models.CharField(max_length=200)

    date_of_occurrence = models.DateField()
    date_of_registration = models.DateField()

    complainant_name = models.CharField(max_length=200, blank=True, default="")
    accused_details = models.TextField(blank=True, default="")
    gist_of_case = models.TextField(blank=True, default="")

    current_stage = models.CharField(
        max_length=2,
        choices=CASE_STAGE_CHOICES,
        default="UI"
    )

    action_to_be_taken = models.TextField(blank=True, default="")
    date_of_first_updation = models.DateTimeField(auto_now_add=True)

    case_holding_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cases"
    )

    branch = models.CharField(max_length=10)

    def __str__(self):
        return self.crime_number

    def delete(self, *args, **kwargs):
        raise PermissionError("Cases cannot be deleted. Close the case instead.")


class CaseLog(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="case_logs")
    field_changed = models.CharField(max_length=100)
    old_value = models.TextField(blank=True, default="")
    new_value = models.TextField(blank=True, default="")
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        on_delete=models.SET_NULL, related_name="case_logs"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    crime_number = models.CharField(max_length=100, blank=True, default="")
    branch = models.CharField(max_length=10, blank=True, default="")
    blockchain_tx    = models.CharField(max_length=200, blank=True, default="")
    blockchain_hash  = models.CharField(max_length=100, blank=True, default="")
    blockchain_block = models.IntegerField(null=True, blank=True)
    blockchain_url   = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["-timestamp"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Audit logs are immutable and cannot be edited.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Audit logs cannot be deleted.")


class ChainOfCustody(models.Model):

    ACTION_CHOICES = (
        ('CREATED',  'Case Created'),
        ('VIEWED',   'Case Viewed'),
        ('STAGE',    'Stage Changed'),
        ('ACTION',   'Action Updated'),
        ('ASSIGNED', 'Case Assigned'),
        ('UPDATED',  'Case Updated'),
    )

    id = models.AutoField(primary_key=True)

    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name="custody_chain"
    )

    officer = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        on_delete=models.SET_NULL, related_name="custody_entries"
    )
    officer_username = models.CharField(max_length=150, blank=True, default="")
    officer_role     = models.CharField(max_length=15,  blank=True, default="")
    officer_branch   = models.CharField(max_length=10,  blank=True, default="")

    action        = models.CharField(max_length=20, choices=ACTION_CHOICES)
    reason        = models.TextField(blank=True, default="")
    notes         = models.TextField(blank=True, default="")

    old_value     = models.TextField(blank=True, default="")
    new_value     = models.TextField(blank=True, default="")
    field_changed = models.CharField(max_length=100, blank=True, default="")

    crime_number  = models.CharField(max_length=100, blank=True, default="")
    branch        = models.CharField(max_length=10,  blank=True, default="")

    ip_address    = models.GenericIPAddressField(null=True, blank=True)
    timestamp     = models.DateTimeField(auto_now_add=True)
    
    # Blockchain anchor fields
    blockchain_tx    = models.CharField(max_length=200, blank=True, default="")
    blockchain_hash  = models.CharField(max_length=100, blank=True, default="")
    blockchain_block = models.IntegerField(null=True, blank=True)
    blockchain_url   = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["timestamp"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Chain of custody entries are immutable and cannot be edited.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Chain of custody entries cannot be deleted.")

    def __str__(self):
        return f"{self.crime_number} | {self.action} by {self.officer_username} @ {self.timestamp}"
