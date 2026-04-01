import csv
import io
import hashlib
import threading
import os
import re
import PyPDF2
import base64
from collections import defaultdict
from rest_framework import generics, parsers
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
from groq import Groq
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER

from django.db.models import Q
from .models import Case, CaseLog, ChainOfCustody, CaseProgress, CaseHandover, Evidence, Witness, InsiderThreatAlert
from .serializers import (
    CaseSerializer, CaseLogSerializer, ChainOfCustodySerializer,
    CaseProgressSerializer, CaseHandoverSerializer, CaseRecommendationSerializer,
    EvidenceSerializer, WitnessSerializer,
)
from .permissions import IsCaseOwner
from blockchain.service import blockchain
from accounts.models import User

TRACKED_FIELDS = [
    "current_stage", "action_to_be_taken", "section_of_law",
    "complainant_name", "accused_details", "gist_of_case", "ps_limit",
]

VIEW_COOLDOWN_MINUTES = 5


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def anchor_in_background(anchor_fn, obj, model_class, pk):
    def run():
        result = anchor_fn(obj)
        if "tx_hash" in result:
            model_class.objects.filter(pk=pk).update(
                blockchain_tx=result["tx_hash"],
                blockchain_hash=result["log_hash"],
                blockchain_block=result["block"],
                blockchain_url=result["etherscan"],
            )
    threading.Thread(target=run, daemon=True).start()


def record_custody(
    case,
    user,
    action,
    reason="",
    notes="",
    field_changed="",
    old_value="",
    new_value="",
    ip_address=None
):
    entry = ChainOfCustody.objects.create(
        case=case,
        officer=user,
        officer_username=user.username if user else "",
        officer_role=getattr(user, 'role', ""),
        officer_branch=getattr(user, 'branch', ""),
        action=action,
        reason=reason,
        notes=notes,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        crime_number=case.crime_number,
        branch=case.branch,
        ip_address=ip_address,
    )
    anchor_in_background(
        blockchain.anchor_custody,
        entry, ChainOfCustody, entry.pk
    )


# ── Case List + Create ────────────────────────────────────────────
class CaseListCreateView(generics.ListCreateAPIView):
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "SUPERVISOR":
            return Case.objects.all()
        return Case.objects.filter(case_holding_officer=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != "CASE":
            raise PermissionDenied("Only Case Officers can create cases.")
        case = serializer.save(
            case_holding_officer=user,
            branch=user.branch
        )
        anchor_in_background(
            lambda c: blockchain.anchor_case_create(c, user),
            case, Case, case.pk
        )
        record_custody(
            case=case,
            user=user,
            action="CREATED",
            reason="Initial case registration",
            notes=f"Case filed under {case.section_of_law}",
            ip_address=get_client_ip(self.request),
        )


# ── Case Detail + Update ──────────────────────────────────────────
class CaseDetailUpdateView(RetrieveUpdateAPIView):
    queryset = Case.objects.all()
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated, IsCaseOwner]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        cooldown_threshold = timezone.now() - timedelta(minutes=VIEW_COOLDOWN_MINUTES)
        recent_view_exists = ChainOfCustody.objects.filter(
            case=instance,
            officer=user,
            action="VIEWED",
            timestamp__gte=cooldown_threshold,
        ).exists()
        if not recent_view_exists:
            record_custody(
                case=instance,
                user=user,
                action="VIEWED",
                reason="Case record accessed",
                ip_address=get_client_ip(request),
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_update(self, serializer):
        user = self.request.user
        if user.role != "CASE":
            raise PermissionDenied("Supervisors cannot update cases.")
        reason = self.request.data.get("reason", "").strip()
        if not reason:
            raise ValidationError(
                {"reason": "A reason is mandatory when updating a case."}
            )
        instance = self.get_object()
        old_values = {f: str(getattr(instance, f) or "") for f in TRACKED_FIELDS}
        serializer.save()
        updated = self.get_object()
        ip = get_client_ip(self.request)
        for field in TRACKED_FIELDS:
            new_val = str(getattr(updated, field) or "")
            old_val = old_values[field]
            if old_val != new_val:
                log = CaseLog.objects.create(
                    case=updated,
                    field_changed=field,
                    old_value=old_val,
                    new_value=new_val,
                    updated_by=user,
                    crime_number=updated.crime_number,
                    branch=updated.branch,
                )
                anchor_in_background(
                    blockchain.anchor_log,
                    log, CaseLog, log.pk
                )
                if field == "current_stage":
                    action = "STAGE"
                    notes = f"Stage changed from {old_val} to {new_val}"
                elif field == "action_to_be_taken":
                    action = "ACTION"
                    notes = "Action to be taken updated"
                else:
                    action = "UPDATED"
                    notes = f"{field} was modified"
                record_custody(
                    case=updated,
                    user=user,
                    action=action,
                    reason=reason,
                    notes=notes,
                    field_changed=field,
                    old_value=old_val,
                    new_value=new_val,
                    ip_address=ip,
                )


# ── Chain of Custody ──────────────────────────────────────────────
class ChainOfCustodyView(generics.ListAPIView):
    serializer_class = ChainOfCustodySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        case_id = self.kwargs.get("pk")
        return ChainOfCustody.objects.filter(case_id=case_id)


# ── Case Logs ─────────────────────────────────────────────────────
class CaseLogListView(generics.ListAPIView):
    serializer_class = CaseLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "SUPERVISOR":
            return CaseLog.objects.select_related("case", "updated_by").all()
        return CaseLog.objects.select_related("case", "updated_by").filter(
            case__case_holding_officer=user
        )


class CaseLogVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            log = CaseLog.objects.get(pk=pk)
        except CaseLog.DoesNotExist:
            return Response({"error": "Log not found"}, status=404)
        result = blockchain.verify_log(log)
        return Response(result)


# ── Progress Entries ──────────────────────────────────────────────
class CaseProgressListCreateView(generics.ListCreateAPIView):
    serializer_class = CaseProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CaseProgress.objects.filter(case_id=self.kwargs["pk"])

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != "CASE":
            raise PermissionDenied("Only Case Officers can add progress entries.")
        case = Case.objects.get(pk=self.kwargs["pk"])
        entry = serializer.save(case=case, officer=user)

        def _anchor():
            data = (
                f"{entry.case_id}{entry.date_of_progress}{entry.details_of_progress}"
                f"{entry.officer_id}{entry.created_at}"
            )
            log_hash = hashlib.sha256(data.encode()).hexdigest()
            result = blockchain._anchor(log_hash, str(case.id), case.crime_number)
            if "tx_hash" in result:
                CaseProgress.objects.filter(pk=entry.pk).update(
                    blockchain_tx=result["tx_hash"],
                    blockchain_hash=result["log_hash"],
                    blockchain_block=result["block"],
                    blockchain_url=result["etherscan"],
                )

        threading.Thread(target=_anchor, daemon=True).start()


class CaseProgressCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            entry = CaseProgress.objects.get(pk=pk)
        except CaseProgress.DoesNotExist:
            return Response({"error": "Progress entry not found"}, status=404)
        if request.user.role != "CASE":
            raise PermissionDenied("Only Case Officers can complete progress entries.")
        entry.is_completed = True
        entry.completed_at = timezone.now()
        entry.save()
        return Response(CaseProgressSerializer(entry).data)


# ── Case Handover ─────────────────────────────────────────────────
class CaseHandoverView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        handovers = CaseHandover.objects.filter(case_id=pk)
        return Response(CaseHandoverSerializer(handovers, many=True).data)

    def post(self, request, pk):
        if request.user.role != "SUPERVISOR":
            raise PermissionDenied("Only Supervisors can hand over cases.")
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({"error": "Case not found"}, status=404)

        to_officer_id = request.data.get("to_officer_id")
        reason = request.data.get("reason", "").strip()

        if not to_officer_id:
            return Response({"error": "to_officer_id is required"}, status=400)
        if not reason:
            return Response({"error": "reason is required"}, status=400)

        try:
            to_officer = User.objects.get(pk=to_officer_id, role="CASE")
        except User.DoesNotExist:
            return Response({"error": "Officer not found"}, status=404)

        from_officer = case.case_holding_officer
        handover = CaseHandover.objects.create(
            case=case,
            from_officer=from_officer,
            to_officer=to_officer,
            authorized_by=request.user,
            reason=reason,
            from_officer_username=from_officer.username if from_officer else "",
            to_officer_username=to_officer.username,
            crime_number=case.crime_number,
        )

        Case.objects.filter(pk=case.pk).update(
            case_holding_officer=to_officer,
            branch=to_officer.branch,
        )
        case.refresh_from_db()

        record_custody(
            case=case,
            user=request.user,
            action="ASSIGNED",
            reason=reason,
            notes=f"Case reassigned from {from_officer.username if from_officer else 'unknown'} to {to_officer.username}",
            ip_address=get_client_ip(request),
        )

        def _anchor():
            data = (
                f"{handover.case_id}{handover.from_officer_username}"
                f"{handover.to_officer_username}{handover.reason}{handover.timestamp}"
            )
            log_hash = hashlib.sha256(data.encode()).hexdigest()
            result = blockchain._anchor(log_hash, str(case.id), case.crime_number)
            if "tx_hash" in result:
                CaseHandover.objects.filter(pk=handover.pk).update(
                    blockchain_tx=result["tx_hash"],
                    blockchain_hash=result["log_hash"],
                    blockchain_block=result["block"],
                    blockchain_url=result["etherscan"],
                )

        threading.Thread(target=_anchor, daemon=True).start()

        return Response(CaseHandoverSerializer(handover).data)


# ── Officers List ─────────────────────────────────────────────────
class OfficersListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "SUPERVISOR":
            raise PermissionDenied("Only Supervisors can view officers list.")
        officers = User.objects.filter(role="CASE").values(
            "id", "username", "branch", "first_name", "last_name"
        )
        return Response(list(officers))


# ── Supervisor Overview ───────────────────────────────────────────
class SupervisorCaseOverview(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "SUPERVISOR":
            return Response({"detail": "Forbidden"}, status=403)

        pending = ["UI", "PT", "HC", "SC"]
        return Response({
            "pending": CaseSerializer(
                Case.objects.filter(current_stage__in=pending), many=True
            ).data,
            "closed": CaseSerializer(
                Case.objects.filter(current_stage="CC"), many=True
            ).data,
        })


# ── Legal Assistant (Text Chat) ───────────────────────────────────
class LegalAssistantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_message = request.data.get("message", "").strip()
        history = request.data.get("messages", [])

        if not user_message:
            return Response({"error": "Message is required"}, status=400)

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return Response({"error": "GROQ_API_KEY is not configured in Render environment variables."}, status=500)

        try:
            client = Groq(api_key=api_key)

            messages = [
                {
                    "role": "system",
                    "content": """You are a legal assistant for COATS — the Cases of Anti-Terrorism Squad used by Tamil Nadu Police. You help Case Holding Officers and Supervisors with:
- Indian Penal Code (IPC) sections and their meanings
- Criminal Procedure Code (CrPC) procedures
- Court stages — UI, PT, HC, SC and what each requires
- Documentation needed at each stage
- Bailable vs non-bailable offences
- Arrest procedures and warrant requirements
- Evidence handling guidelines
- Case filing procedures
Always give clear, accurate, practical answers relevant to Indian law enforcement. Keep answers concise and actionable. If you don't know something, say so clearly."""
                },
                *history,
                {"role": "user", "content": user_message},
            ]

            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                max_tokens=1024,
                temperature=0.7,
            )

            reply = response.choices[0].message.content

            history.append({"role": "user", "content": user_message})
            history.append({"role": "assistant", "content": reply})

            return Response({
                "reply": reply,
                "messages": history,
            })

        except Exception as e:
            return Response({"error": str(e)}, status=500)


# ── Legal Assistant File Upload + Analysis ────────────────────────
class LegalAssistantFileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request):
        file = request.FILES.get("file")
        message = request.data.get("message", "Please summarize this document and suggest next steps.").strip()
        history = []

        if not file:
            return Response({"error": "No file uploaded"}, status=400)

        try:
            # ── Extract text from file ────────────────────────────
            file_text = ""
            file_name = file.name.lower()

            if file_name.endswith(".pdf"):
                # Extract text from PDF
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
                for page in pdf_reader.pages:
                    file_text += page.extract_text() or ""
            elif file_name.endswith((".txt",)):
                file_text = file.read().decode("utf-8", errors="ignore")
            else:
                return Response(
                    {"error": "Unsupported file type. Please upload PDF or TXT files."},
                    status=400
                )

            if not file_text.strip():
                return Response(
                    {"error": "Could not extract text from the file. Make sure it is not a scanned image PDF."},
                    status=400
                )

            # Limit text to avoid token overflow (adjust as needed)
            file_text = file_text[:8000]

            # ── Call Groq ─────────────────────────────────────────
            api_key = os.environ.get("GROQ_API_KEY")
            if not api_key:
                return Response({"error": "GROQ_API_KEY is not configured in Render environment variables."}, status=500)

            client = Groq(api_key=api_key)

            prompt = f"""The following is the content of a legal document uploaded by a Tamil Nadu Police officer.
--- DOCUMENT START ---
{file_text}
--- DOCUMENT END ---
{message}

Please provide:
1. **Document Summary** — What is this document about?
2. **Key Points** — Most important facts, dates, names, IPC sections mentioned
3. **Current Stage** — What stage is this case at?
4. **Recommended Next Steps** — What should the officer do next?
5. **Important Deadlines** — Any dates or deadlines mentioned that need attention?"""

            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a legal assistant for COATS used by Tamil Nadu Police.
Analyze legal documents and provide clear, actionable summaries and next steps.
Focus on practical guidance relevant to Indian law enforcement."""
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=2048,
                temperature=0.3,
            )

            reply = response.choices[0].message.content

            history.append({"role": "user", "content": f"[Uploaded file: {file.name}] {message}"})
            history.append({"role": "assistant", "content": reply})

            return Response({
                "reply": reply,
                "messages": history,
                "file_name": file.name,
            })

        except Exception as e:
            return Response({"error": str(e)}, status=500)


# ── Case Report — PDF ─────────────────────────────────────────────
class CaseReportPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({"error": "Case not found"}, status=404)

        custody = ChainOfCustody.objects.filter(case=case).order_by("timestamp")
        progress = CaseProgress.objects.filter(case=case).order_by("date_of_progress")
        handovers = CaseHandover.objects.filter(case=case).order_by("timestamp")
        logs = CaseLog.objects.filter(case=case).order_by("timestamp")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1.5*cm,
            bottomMargin=1.5*cm
        )

        styles = getSampleStyleSheet()
        elements = []

        title_style = ParagraphStyle(
            'title',
            fontSize=16,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            spaceAfter=4
        )
        sub_style = ParagraphStyle(
            'sub',
            fontSize=9,
            alignment=TA_CENTER,
            textColor=colors.grey,
            spaceAfter=12
        )
        section_style = ParagraphStyle(
            'section',
            fontSize=11,
            fontName='Helvetica-Bold',
            spaceBefore=12,
            spaceAfter=4,
            textColor=colors.HexColor('#1a1a2e')
        )

        elements.append(Paragraph("COATS 2.0 — Full Case Report", title_style))
        elements.append(Paragraph(
            f"Generated: {timezone.now().strftime('%d %b %Y %H:%M')} | "
            f"By: {request.user.username}",
            sub_style
        ))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.black))
        elements.append(Spacer(1, 0.3*cm))

        DARK = colors.HexColor('#1a1a2e')
        LIGHT = colors.HexColor('#f5f5f5')

        def section(title):
            elements.append(Paragraph(title, section_style))
            elements.append(HRFlowable(width="100%", thickness=0.4, color=colors.grey))
            elements.append(Spacer(1, 0.15*cm))

        def info_table(rows):
            t = Table(rows, colWidths=[5*cm, 12*cm])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), LIGHT),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('GRID', (0, 0), (-1, -1), 0.3, colors.lightgrey),
                ('PADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 0.3*cm))

        def data_table(headers, rows, col_widths):
            all_rows = [headers] + rows
            t = Table(all_rows, colWidths=col_widths)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), DARK),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 7),
                ('GRID', (0, 0), (-1, -1), 0.3, colors.lightgrey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 0.3*cm))

        # 1. Case Details
        section("1. Case Details")
        info_table([
            ["Crime Number", str(case.crime_number)],
            ["PS Limit", str(case.ps_limit or "—")],
            ["Current Stage", str(case.current_stage)],
            ["Date of Occurrence", str(case.date_of_occurrence)],
            ["Date of Registration", str(case.date_of_registration)],
            ["Branch", str(case.branch or "—")],
            ["Section of Law", str(case.section_of_law or "—")],
            ["Complainant", str(case.complainant_name or "—")],
            ["Accused Details", str(case.accused_details or "—")],
            ["Gist of Case", str(case.gist_of_case or "—")],
            ["Action to be Taken", str(case.action_to_be_taken or "—")],
            ["Assigned Officer", str(case.case_holding_officer) if case.case_holding_officer else "—"],
        ])

        # 2. Chain of Custody
        section("2. Chain of Custody")
        if custody.exists():
            data_table(
                ["#", "Timestamp", "Action", "Officer", "Notes", "Blockchain TX"],
                [[
                    str(i),
                    e.timestamp.strftime("%d %b %Y %H:%M") if e.timestamp else "—",
                    str(e.action or "—"),
                    str(e.officer_username or "—"),
                    str(e.notes or "—")[:40],
                    (e.blockchain_tx[:18] + "...") if e.blockchain_tx else "—",
                ] for i, e in enumerate(custody, 1)],
                [0.6*cm, 3*cm, 2.5*cm, 3*cm, 4.5*cm, 3.4*cm]
            )
        else:
            elements.append(Paragraph("No custody entries.", styles['Normal']))
            elements.append(Spacer(1, 0.2*cm))

        # 3. Investigation Progress
        section("3. Investigation Progress")
        if progress.exists():
            data_table(
                ["Date", "Details", "Further Action", "Remarks", "Status"],
                [[
                    str(e.date_of_progress),
                    str(e.details_of_progress or "—")[:50],
                    str(e.further_action_to_be_taken or "—")[:40],
                    str(e.remarks or "—")[:30],
                    "✓ Done" if e.is_completed else "Pending",
                ] for e in progress],
                [2.5*cm, 5*cm, 4*cm, 3*cm, 2.5*cm]
            )
        else:
            elements.append(Paragraph("No progress entries.", styles['Normal']))
            elements.append(Spacer(1, 0.2*cm))

        # 4. Handovers
        section("4. Case Handovers")
        if handovers.exists():
            data_table(
                ["Timestamp", "From Officer", "To Officer", "Authorized By", "Reason"],
                [[
                    h.timestamp.strftime("%d %b %Y %H:%M") if h.timestamp else "—",
                    str(h.from_officer_username or "—"),
                    str(h.to_officer_username or "—"),
                    str(h.authorized_by or "—"),
                    str(h.reason or "—")[:40],
                ] for h in handovers],
                [3*cm, 3*cm, 3*cm, 3*cm, 5*cm]
            )
        else:
            elements.append(Paragraph("No handovers recorded.", styles['Normal']))
            elements.append(Spacer(1, 0.2*cm))

        # 5. Audit Logs
        section("5. Audit Log")
        if logs.exists():
            data_table(
                ["Timestamp", "Field Changed", "Old Value", "New Value", "Officer"],
                [[
                    l.timestamp.strftime("%d %b %Y %H:%M") if l.timestamp else "—",
                    str(l.field_changed or "—"),
                    str(l.old_value or "—")[:25],
                    str(l.new_value or "—")[:25],
                    str(l.updated_by or "—"),
                ] for l in logs],
                [3*cm, 3*cm, 3.5*cm, 3.5*cm, 4*cm]
            )
        else:
            elements.append(Paragraph("No audit logs recorded.", styles['Normal']))

        doc.build(elements)
        buffer.seek(0)

        filename = f"COATS_Case_{case.crime_number}.pdf"
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


# ── Case Report — CSV ─────────────────────────────────────────────
class CaseReportCSVView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({"error": "Case not found"}, status=404)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="COATS_Case_{case.crime_number}.csv"'
        writer = csv.writer(response)

        # Case Details
        writer.writerow(["=== CASE DETAILS ==="])
        writer.writerow(["Crime Number", case.crime_number])
        writer.writerow(["PS Limit", case.ps_limit or ""])
        writer.writerow(["Current Stage", case.current_stage])
        writer.writerow(["Date of Occurrence", case.date_of_occurrence])
        writer.writerow(["Date of Registration", case.date_of_registration])
        writer.writerow(["Branch", case.branch or ""])
        writer.writerow(["Section of Law", case.section_of_law or ""])
        writer.writerow(["Complainant", case.complainant_name or ""])
        writer.writerow(["Accused Details", case.accused_details or ""])
        writer.writerow(["Gist of Case", case.gist_of_case or ""])
        writer.writerow(["Action to be Taken", case.action_to_be_taken or ""])
        writer.writerow(["Assigned Officer", str(case.case_holding_officer) if case.case_holding_officer else ""])
        writer.writerow([])

        # Chain of Custody
        writer.writerow(["=== CHAIN OF CUSTODY ==="])
        writer.writerow(["Timestamp", "Action", "Officer", "Notes", "IP Address", "Blockchain TX"])
        for e in ChainOfCustody.objects.filter(case=case).order_by("timestamp"):
            writer.writerow([
                e.timestamp.strftime("%d %b %Y %H:%M") if e.timestamp else "",
                e.action or "",
                e.officer_username or "",
                e.notes or "",
                e.ip_address or "",
                e.blockchain_tx or "",
            ])
        writer.writerow([])

        # Progress
        writer.writerow(["=== INVESTIGATION PROGRESS ==="])
        writer.writerow(["Date", "Details", "Further Action", "Remarks", "Completed", "Reminder Date"])
        for e in CaseProgress.objects.filter(case=case).order_by("date_of_progress"):
            writer.writerow([
                e.date_of_progress,
                e.details_of_progress or "",
                e.further_action_to_be_taken or "",
                e.remarks or "",
                "Yes" if e.is_completed else "No",
                e.reminder_date or "",
            ])
        writer.writerow([])

        # Handovers
        writer.writerow(["=== CASE HANDOVERS ==="])
        writer.writerow(["Timestamp", "From Officer", "To Officer", "Authorized By", "Reason"])
        for h in CaseHandover.objects.filter(case=case).order_by("timestamp"):
            writer.writerow([
                h.timestamp.strftime("%d %b %Y %H:%M") if h.timestamp else "",
                h.from_officer_username or "",
                h.to_officer_username or "",
                str(h.authorized_by or ""),
                h.reason or "",
            ])
        writer.writerow([])

        # Audit Logs
        writer.writerow(["=== AUDIT LOG ==="])
        writer.writerow(["Timestamp", "Field Changed", "Old Value", "New Value", "Officer"])
        for l in CaseLog.objects.filter(case=case).order_by("timestamp"):
            writer.writerow([
                l.timestamp.strftime("%d %b %Y %H:%M") if l.timestamp else "",
                l.field_changed or "",
                l.old_value or "",
                l.new_value or "",
                str(l.updated_by or ""),
            ])

        return response


class CaseRecommendationView(APIView):
    permission_classes = [IsCaseOwner]

    def get(self, request, pk):
        try:
            current_case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({"error": "Case not found"}, status=404)

        # 1. Similarity by Accused Names
        accused_names = set()
        if current_case.accused_details:
            # Simple split by common delimiters
            import re
            parts = re.split(r'[,;\n\r]', current_case.accused_details)
            for p in parts:
                name = p.strip().lower()
                if len(name) > 3: # Ignore very short names/placeholders
                    accused_names.add(name)

        # 2. Similarity by Branch and Section of Law
        # We prioritize:
        # - Exact Accused Name match (High)
        # - Same Branch + Same Section of Law (Medium)
        
        related_cases = Case.objects.filter(
            ~Q(id=current_case.id)
        ).filter(
            Q(branch=current_case.branch, section_of_law=current_case.section_of_law) |
            Q(accused_details__icontains="") # Placeholder if no names
        )

        # If we have names, use them for a more targeted search
        if accused_names:
            name_query = Q()
            for name in accused_names:
                name_query |= Q(accused_details__icontains=name)
            
            # Combine queries: Either same branch/type OR name match
            related_cases = Case.objects.filter(
                ~Q(id=current_case.id)
            ).filter(
                Q(branch=current_case.branch, section_of_law=current_case.section_of_law) |
                name_query
            )

        # Sort: Most recently updated first for relevancy
        # In a real-world scenario, we might use a proper scoring algorithm
        related_cases = related_cases.order_by("-date_of_first_updation")[:5]

        serializer = CaseRecommendationSerializer(related_cases, many=True)
        return Response(serializer.data)


# ── Digital Evidence Vault ────────────────────────────────────────
class EvidenceListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get(self, request, pk):
        evidence = Evidence.objects.filter(case_id=pk)
        serializer = EvidenceSerializer(evidence, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request, pk):
        if request.user.role != "CASE":
            raise PermissionDenied("Only Case Officers can upload evidence.")

        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file uploaded"}, status=400)

        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({"error": "Case not found"}, status=404)

        # Compute SHA-256
        file_bytes = file.read()
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        file.seek(0)

        # Determine file type
        ext = file.name.rsplit(".", 1)[-1].lower() if "." in file.name else ""
        type_map = {
            "jpg": "IMAGE", "jpeg": "IMAGE", "png": "IMAGE", "gif": "IMAGE", "webp": "IMAGE",
            "mp4": "VIDEO", "avi": "VIDEO", "mov": "VIDEO", "mkv": "VIDEO",
            "pdf": "PDF",
            "doc": "DOCUMENT", "docx": "DOCUMENT", "txt": "DOCUMENT", "xls": "DOCUMENT", "xlsx": "DOCUMENT",
            "mp3": "AUDIO", "wav": "AUDIO", "ogg": "AUDIO",
        }
        file_type = type_map.get(ext, "OTHER")

        evidence = Evidence.objects.create(
            case=case,
            file=file,
            file_name=file.name,
            file_type=file_type,
            file_size=len(file_bytes),
            file_hash=file_hash,
            description=request.data.get("description", ""),
            uploaded_by=request.user,
            ip_address=get_client_ip(request),
        )

        # Blockchain anchor
        def _anchor():
            data = f"{evidence.case_id}{evidence.file_hash}{evidence.file_name}{evidence.uploaded_at}"
            log_hash = hashlib.sha256(data.encode()).hexdigest()
            result = blockchain._anchor(log_hash, str(case.id), case.crime_number)
            if "tx_hash" in result:
                Evidence.objects.filter(pk=evidence.pk).update(
                    blockchain_tx=result["tx_hash"],
                    blockchain_hash=result["log_hash"],
                    blockchain_block=result["block"],
                    blockchain_url=result["etherscan"],
                )
        threading.Thread(target=_anchor, daemon=True).start()

        # Record in chain of custody
        record_custody(
            case=case,
            user=request.user,
            action="UPDATED",
            reason=f"Evidence uploaded: {file.name}",
            notes=f"SHA-256: {file_hash}",
            ip_address=get_client_ip(request),
        )

        return Response(EvidenceSerializer(evidence, context={"request": request}).data, status=201)


# ── Witness Management ────────────────────────────────────────────
class WitnessListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        witnesses = Witness.objects.filter(case_id=pk)
        return Response(WitnessSerializer(witnesses, many=True).data)

    def post(self, request, pk):
        if request.user.role != "CASE":
            raise PermissionDenied("Only Case Officers can add witnesses.")

        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({"error": "Case not found"}, status=404)

        serializer = WitnessSerializer(data={**request.data, "case": str(pk)})
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        witness = serializer.save(added_by=request.user)

        # Blockchain anchor
        def _anchor():
            data = f"{witness.case_id}{witness.name}{witness.statement}{witness.added_at}"
            log_hash = hashlib.sha256(data.encode()).hexdigest()
            result = blockchain._anchor(log_hash, str(case.id), case.crime_number)
            if "tx_hash" in result:
                Witness.objects.filter(pk=witness.pk).update(
                    blockchain_tx=result["tx_hash"],
                    blockchain_hash=result["log_hash"],
                    blockchain_block=result["block"],
                    blockchain_url=result["etherscan"],
                )
        threading.Thread(target=_anchor, daemon=True).start()

        record_custody(
            case=case,
            user=request.user,
            action="UPDATED",
            reason=f"Witness added: {witness.name}",
            notes=f"Sec 164: {'Yes' if witness.is_section_164 else 'No'}",
            ip_address=get_client_ip(request),
        )

        return Response(WitnessSerializer(witness).data, status=201)


# ── Crime Hotspot Map Data ────────────────────────────────────────
# Approximate GPS coordinates for Tamil Nadu police station areas
PS_COORDINATES = {
    # Chennai
    "Adyar": [13.0012, 80.2565], "T.Nagar": [13.0418, 80.2341],
    "Anna Nagar": [13.0850, 80.2101], "Ambattur": [13.1143, 80.1548],
    "Perambur": [13.1120, 80.2330], "Mylapore": [13.0334, 80.2707],
    "Thiruvanmiyur": [12.9870, 80.2638], "Velachery": [12.9815, 80.2180],
    "Kodambakkam": [13.0520, 80.2240], "Guindy": [13.0067, 80.2206],
    "Nungambakkam": [13.0600, 80.2440], "Egmore": [13.0732, 80.2609],
    "Kilpauk": [13.0830, 80.2460], "Royapuram": [13.1070, 80.2940],
    "Tondiarpet": [13.1210, 80.2830], "Saidapet": [13.0220, 80.2280],
    "Alandur": [13.0010, 80.2030], "Chromepet": [12.9516, 80.1419],
    "Tambaram": [12.9249, 80.1000], "Porur": [13.0370, 80.1560],
    "Chennai North": [13.1100, 80.2800], "Chennai South": [12.9900, 80.2500],
    # Madurai
    "Madurai City": [9.9252, 78.1198], "Tiruchirappalli Fort": [10.8050, 78.6856],
    "Srirangam": [10.8616, 78.6900], "Dindigul Town": [10.3624, 77.9695],
    "Theni": [10.0104, 77.4768], "Sivaganga": [10.0675, 78.3641],
    "Ramanathapuram": [9.3639, 78.8395],
    # Coimbatore
    "Gandhipuram": [11.0168, 76.9558], "RS Puram": [11.0100, 76.9400],
    "Peelamedu": [11.0239, 77.0086], "Singanallur": [10.9954, 77.0348],
    "Saravanampatti": [11.0640, 77.0030], "Sulur": [11.0340, 77.1270],
    "Tiruppur North": [11.1085, 77.3411], "Erode Town": [11.3410, 77.7172],
    "Coimbatore East": [11.0060, 76.9780],
    # Branch-level fallbacks
    "HQ": [13.0827, 80.2707], "CNI": [13.0827, 80.2707],
    "MDU": [9.9252, 78.1198], "CMB": [11.0168, 76.9558],
}


class CrimeMapDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cases = Case.objects.select_related("case_holding_officer").all()
        result = []
        for case in cases:
            coords = PS_COORDINATES.get(case.ps_limit) or PS_COORDINATES.get(case.branch, [13.0, 80.0])
            # Add slight random offset so overlapping pins don't hide each other
            import random
            lat = coords[0] + random.uniform(-0.008, 0.008)
            lng = coords[1] + random.uniform(-0.008, 0.008)

            result.append({
                "id": str(case.id),
                "crime_number": case.crime_number,
                "section_of_law": case.section_of_law,
                "ps_limit": case.ps_limit,
                "branch": case.branch,
                "current_stage": case.current_stage,
                "complainant_name": case.complainant_name,
                "accused_details": (case.accused_details or "")[:80],
                "date_of_occurrence": str(case.date_of_occurrence),
                "lat": lat,
                "lng": lng,
            })
        return Response(result)


# ── Insider Threat Detection ──────────────────────────────────────
class InsiderThreatView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'SUPERVISOR' and not request.user.is_superuser:
            raise PermissionDenied("Unauthorized access to threat analysis.")
            
        users = User.objects.all()
        # SECURITY POLICY: Standard Supervisors only monitor Case Officers.
        # Only Master Admins (is_superuser) can monitor other Supervisors.
        if not request.user.is_superuser:
            users = users.filter(role='CASE')
            
        threats = []
        today = timezone.now()
        yesterday = today - timezone.timedelta(days=1)
        thirty_days_ago = today - timezone.timedelta(days=30)
        
        for u in users:
            score = 0
            reasons = []
            
            # 1. Time-Based Analysis (Midnight Access 11 PM - 5 AM)
            recent_custody = ChainOfCustody.objects.filter(
                officer=u, 
                timestamp__gte=yesterday
            )
            late_count = sum(1 for c in recent_custody if c.timestamp.hour in [23, 0, 1, 2, 3, 4])
            
            if late_count > 0:
                score += late_count * 2
                reasons.append(f"Late night access ({late_count} times)")
                
            # 2. Frequency & Volume Analysis
            recent_volume = recent_custody.count()
            month_volume = ChainOfCustody.objects.filter(
                officer=u, 
                timestamp__gte=thirty_days_ago, 
                timestamp__lt=yesterday
            ).count()
            
            baseline = max(month_volume / 30, 2)
            
            if recent_volume > baseline * 4 and recent_volume > 10:
                score += 5
                reasons.append(f"Abnormal high volume ({recent_volume} actions vs {baseline:.1f} avg)")
                
            # 3. Access Pattern Analysis (Out of Jurisdiction)
            if u.role == 'CASE' and u.branch:
                out_of_bounds = recent_custody.exclude(case__branch=u.branch).count()
                if out_of_bounds > 0:
                    score += out_of_bounds * 2
                    reasons.append(f"Out-of-jurisdiction access ({out_of_bounds} cases outside {u.branch})")
            
            if score >= 5:
                # ── Record to Backend Admin Page ──
                InsiderThreatAlert.objects.get_or_create(
                    user=u, score=score, 
                    reasons=", ".join(reasons)
                )

                threats.append({
                    "id": u.id,
                    "username": u.username,
                    "role": u.role,
                    "branch": u.branch,
                    "score": score,
                    "reasons": reasons
                })
                
        # Sort descending by risk score
        threats.sort(key=lambda x: x["score"], reverse=True)
        return Response(threats)
