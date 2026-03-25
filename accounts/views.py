import threading
import datetime
import requests
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .serializers import CustomTokenObtainPairSerializer
from .models import LoginAuditLog
from blockchain.service import blockchain


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        ip         = get_client_ip(request)
        username   = request.data.get("username", "")
        timestamp  = str(datetime.datetime.utcnow())
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            # ── Record failed login ───────────────────────────────
            log = LoginAuditLog.objects.create(
                username=username,
                ip_address=ip,
                success=False,
                user_agent=user_agent,
            )

            # ── Anchor in background ──────────────────────────────
            def _anchor_failed():
                result = blockchain.anchor_login(username, ip, timestamp, False)
                if "tx_hash" in result:
                    LoginAuditLog.objects.filter(pk=log.pk).update(
                        blockchain_tx=result["tx_hash"],
                        blockchain_hash=result["log_hash"],
                        blockchain_block=result["block"],
                        blockchain_url=result["etherscan"],
                    )
            threading.Thread(target=_anchor_failed, daemon=True).start()

            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # ── Setup MFA Intercept (First Login) ─────────────────────
        user = serializer.user
        if not user.security_question_1 or not user.google_email:
            return Response({
                "setup_mfa_required": True,
                "username": user.username
            }, status=status.HTTP_200_OK)

        # ── Global Mandatory Google OAuth Verification ────────────
        google_token = request.data.get("google_token")
        if not google_token:
            return Response({"detail": "Google Sign-In is required to authenticate."}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            idinfo = id_token.verify_oauth2_token(google_token, google_requests.Request(), audience="934642464309-shokqbicjqngv3eo0a927fu9vd7qcuu6.apps.googleusercontent.com")
            if idinfo.get('email') != user.google_email:
                raise ValueError("Authorized user mismatch")
        except Exception as e:
            # Record failed login due to OAuth violation
            log = LoginAuditLog.objects.create(
                username=username,
                ip_address=ip,
                success=False,
                user_agent=user_agent,
            )
            def _anchor_mfa_failed_oauth():
                result = blockchain.anchor_login(username, ip, timestamp, False)
                if "tx_hash" in result:
                    LoginAuditLog.objects.filter(pk=log.pk).update(
                        blockchain_tx=result["tx_hash"], blockchain_hash=result["log_hash"],
                        blockchain_block=result["block"], blockchain_url=result["etherscan"]
                    )
            threading.Thread(target=_anchor_mfa_failed_oauth, daemon=True).start()
            return Response(
                {"detail": "Invalid or mismatched Google Authentication. Access denied."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # ── Geolocation MFA (Secondary Check) ─────────────────────
        mfa_answer_1 = request.data.get("mfa_answer_1")
        mfa_answer_2 = request.data.get("mfa_answer_2")

        if mfa_answer_1 and mfa_answer_2:
            ans1_correct = user.security_answer_1 and check_password(mfa_answer_1.strip().lower(), user.security_answer_1)
            ans2_correct = user.security_answer_2 and check_password(mfa_answer_2.strip().lower(), user.security_answer_2)
            
            if not (ans1_correct and ans2_correct):
                # Record failed login due to MFA Questions
                log = LoginAuditLog.objects.create(
                    username=username,
                    ip_address=ip,
                    success=False,
                    user_agent=user_agent,
                )
                def _anchor_mfa_failed():
                    result = blockchain.anchor_login(username, ip, timestamp, False)
                    if "tx_hash" in result:
                        LoginAuditLog.objects.filter(pk=log.pk).update(
                            blockchain_tx=result["tx_hash"], blockchain_hash=result["log_hash"],
                            blockchain_block=result["block"], blockchain_url=result["etherscan"]
                        )
                threading.Thread(target=_anchor_mfa_failed, daemon=True).start()
                return Response(
                    {"detail": "Incorrect security answers. Access denied."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        else:
            BRANCH_CITY_MAP = {
                'HQ': 'Chennai',
                'CNI': 'Chennai',
                'MDU': 'Madurai',
                'CMB': 'Coimbatore'
            }
            expected_city = BRANCH_CITY_MAP.get(user.branch)
            if expected_city:
                try:
                    geo_url = 'http://ip-api.com/json/' if ip in ['127.0.0.1', 'localhost', '::1'] else f'http://ip-api.com/json/{ip}'
                    geo_res = requests.get(geo_url, timeout=5).json()
                    user_city = geo_res.get('city')
                    
                    if user_city and user_city != expected_city:
                        return Response({
                            "mfa_required": True,
                            "questions": [
                                user.security_question_1 or "What is your mother's maiden name?",
                                user.security_question_2 or "What was the name of your first pet?"
                            ],
                            "username": user.username
                        }, status=status.HTTP_200_OK)
                except Exception:
                    # Fallback to MFA on error
                    return Response({
                        "mfa_required": True,
                        "questions": [
                            user.security_question_1 or "What is your mother's maiden name?",
                            user.security_question_2 or "What was the name of your first pet?"
                        ],
                        "username": user.username
                    }, status=status.HTTP_200_OK)

        # ── Record successful login ───────────────────────────────
        log = LoginAuditLog.objects.create(
            username=username,
            ip_address=ip,
            success=True,
            user_agent=user_agent,
        )

        # ── Anchor in background ──────────────────────────────────
        def _anchor_success():
            result = blockchain.anchor_login(username, ip, timestamp, True)
            if "tx_hash" in result:
                LoginAuditLog.objects.filter(pk=log.pk).update(
                    blockchain_tx=result["tx_hash"],
                    blockchain_hash=result["log_hash"],
                    blockchain_block=result["block"],
                    blockchain_url=result["etherscan"],
                )
        threading.Thread(target=_anchor_success, daemon=True).start()

        return Response(
            serializer.validated_data,
            status=status.HTTP_200_OK
        )


class SetupMFAView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        password = request.data.get("password")
        q1 = request.data.get("question_1")
        a1 = request.data.get("answer_1")
        q2 = request.data.get("question_2")
        a2 = request.data.get("answer_2")
        google_token = request.data.get("google_token")

        if not all([username, password, q1, a1, q2, a2, google_token]):
            return Response({"detail": "All fields including Google Token are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            idinfo = id_token.verify_oauth2_token(google_token, google_requests.Request(), audience="934642464309-shokqbicjqngv3eo0a927fu9vd7qcuu6.apps.googleusercontent.com")
            google_email = idinfo.get('email')
            if not google_email:
                raise ValueError("No email in token")
        except Exception as e:
            return Response({"detail": f"Invalid Google token: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if not user:
            return Response({"detail": "Invalid credentials. Cannot setup MFA."}, status=status.HTTP_401_UNAUTHORIZED)

        user.security_question_1 = q1.strip()
        user.security_answer_1 = make_password(a1.strip().lower())
        user.security_question_2 = q2.strip()
        user.security_answer_2 = make_password(a2.strip().lower())
        user.google_email = google_email
        user.save()

        return Response({"detail": "MFA setup complete. Please login again."}, status=status.HTTP_200_OK)
