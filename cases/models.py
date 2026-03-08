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

    complainant_name = models.CharField(max_length=200)
    accused_details = models.TextField()
    gist_of_case = models.TextField()

    current_stage = models.CharField(
        max_length=2,
        choices=CASE_STAGE_CHOICES,
        default="UI"
    )

    action_to_be_taken = models.TextField()

    date_of_first_updation = models.DateTimeField(auto_now_add=True)

    case_holding_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cases"
    )

    branch = models.CharField(max_length=10)
