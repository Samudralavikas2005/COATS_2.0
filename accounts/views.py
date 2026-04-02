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
        password   = request.data.get("password", "")
        google_token = request.data.get("google_token")
        timestamp  = str(datetime.datetime.utcnow())
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        user = None
        auth_method = "CREDENTIALS"

        # ── Step 1: Identification (Choice of Method) ───────────────
        
        # 🟢 Way A: Google OAuth Only
        if google_token and not password:
            auth_method = "GOOGLE"
            try:
                idinfo = id_token.verify_oauth2_token(
                    google_token, 
                    google_requests.Request(), 
                    audience="934642464309-shokqbicjqngv3eo0a927fu9vd7qcuu6.apps.googleusercontent.com"
                )
                email = idinfo.get('email')
                from .models import User
                user = User.objects.filter(google_email=email).first()
                if not user:
                    return Response({"detail": "No account associated with this Google email."}, status=status.HTTP_404_NOT_FOUND)
                username = user.username # For logging
            except Exception as e:
                return Response({"detail": f"Google Authentication failed: {str(e)}"}, status=status.HTTP_401_UNAUTHORIZED)

        # 🔵 Way B: Credentials Only
        elif username and password:
            user = authenticate(username=username, password=password)
            if not user:
                # Record failed login
                log = LoginAuditLog.objects.create(
                    username=username, ip_address=ip, success=False, user_agent=user_agent
                )
                def _anchor_failed():
                    result = blockchain.anchor_login(username, ip, timestamp, False)
                    if "tx_hash" in result:
                        LoginAuditLog.objects.filter(pk=log.pk).update(
                            blockchain_tx=result["tx_hash"], blockchain_hash=result["log_hash"],
                            blockchain_block=result["block"], blockchain_url=result["etherscan"]
                        )
                threading.Thread(target=_anchor_failed, daemon=True).start()
                return Response({"detail": "Invalid local credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        
        else:
            return Response({"detail": "Please provide either username/password or Google sign-in."}, status=status.HTTP_400_BAD_REQUEST)

        # ── Step 2: Setup MFA Intercept (First Login) ─────────────────────
        # If user hasn't set up questions yet, force them to do so.
        if not user.security_question_1:
            return Response({
                "setup_mfa_required": True,
                "username": user.username
            }, status=status.HTTP_200_OK)

        # ── Step 3: Geolocation MFA (Secondary Check) ─────────────────────
        # This remains mandatory for BOTH login methods if the location doesn't match.
        mfa_answer_1 = request.data.get("mfa_answer_1")
        mfa_answer_2 = request.data.get("mfa_answer_2")

        if mfa_answer_1 and mfa_answer_2:
            ans1_correct = user.security_answer_1 and check_password(mfa_answer_1.strip().lower(), user.security_answer_1)
            ans2_correct = user.security_answer_2 and check_password(mfa_answer_2.strip().lower(), user.security_answer_2)
            
            if not (ans1_correct and ans2_correct):
                log = LoginAuditLog.objects.create(
                    username=username, ip_address=ip, success=False, user_agent=user_agent
                )
                def _anchor_mfa_failed():
                    result = blockchain.anchor_login(username, ip, timestamp, False)
                    if "tx_hash" in result:
                        LoginAuditLog.objects.filter(pk=log.pk).update(
                            blockchain_tx=result["tx_hash"], blockchain_hash=result["log_hash"],
                            blockchain_block=result["block"], blockchain_url=result["etherscan"]
                        )
                threading.Thread(target=_anchor_mfa_failed, daemon=True).start()
                return Response({"detail": "Incorrect security answers. Access denied."}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            BRANCH_CITY_MAP = {'HQ': 'Chennai', 'CNI': 'Chennai', 'MDU': 'Madurai', 'CMB': 'Coimbatore'}
            expected_city = BRANCH_CITY_MAP.get(user.branch)
            
            if expected_city:
                # 🛡️ Bypass check for local development
                from django.conf import settings
                if settings.DEBUG:
                    print(f"DEBUG: Skipping geolocation MFA for {username} (DEBUG=True)")
                else:
                    try:
                        geo_url = 'http://ip-api.com/json/' if ip in ['127.0.0.1', 'localhost', '::1'] else f'http://ip-api.com/json/{ip}'
                        geo_res = requests.get(geo_url, timeout=5).json()
                        user_city = geo_res.get('city', '')
                        
                        # Case insensitive and suburb aware matching for Chennai
                        CHENNAI_SUBURBS = ["chennai", "madipakkam", "ambattur", "guindy", "taramani", "velachery", "adyar", "perungudi", "vengal", "thiruvallur"]
                        is_match = False
                        u_city_lower = user_city.lower()
                        e_city_lower = expected_city.lower()

                        if e_city_lower == "chennai":
                            is_match = any(sub in u_city_lower for sub in CHENNAI_SUBURBS)
                        else:
                            is_match = u_city_lower == e_city_lower

                        if user_city and not is_match:
                            print(f"WARN: Location mismatch for {username}. Found: {user_city}, Expected: {expected_city}")
                            return Response({
                                "mfa_required": True,
                                "questions": [
                                    user.security_question_1 or "What is your favorite color?",
                                    user.security_question_2 or "What is your pet name?"
                                ],
                                "username": user.username
                            }, status=status.HTTP_200_OK)
                    except Exception as e:
                        print(f"WARN: Geo-API failure: {str(e)}")
                        # Fail-safe: trigger MFA if location cannot be verified
                        return Response({
                            "mfa_required": True,
                            "questions": [
                                user.security_question_1 or "What is your favorite color?",
                                user.security_question_2 or "What is your pet name?"
                            ],
                            "username": user.username
                        }, status=status.HTTP_200_OK)

        # ── Step 4: Final Success & Tokens ───────────────────────────────
        log = LoginAuditLog.objects.create(
            username=username, ip_address=ip, success=True, user_agent=user_agent
        )

        def _anchor_success():
            result = blockchain.anchor_login(username, ip, timestamp, True)
            if "tx_hash" in result:
                LoginAuditLog.objects.filter(pk=log.pk).update(
                    blockchain_tx=result["tx_hash"], blockchain_hash=result["log_hash"],
                    blockchain_block=result["block"], blockchain_url=result["etherscan"]
                )
        threading.Thread(target=_anchor_success, daemon=True).start()

        # Generate tokens
        if auth_method == "GOOGLE":
            refresh = CustomTokenObtainPairSerializer.get_token(user)
            # 🔐 Manually ensure access token also gets our custom claims
            refresh.access_token['role']     = user.role
            refresh.access_token['branch']   = user.branch
            refresh.access_token['username'] = user.username
            
            token_data = {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        else:
            # Re-initialize serializer to get tokens for valid user
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid()
            token_data = serializer.validated_data

        return Response(token_data, status=status.HTTP_200_OK)


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
        if not all([username, password, q1, a1, q2, a2]):
            return Response({"detail": "Username, Password, and Security Questions are required."}, status=status.HTTP_400_BAD_REQUEST)

        if google_token:
            try:
                idinfo = id_token.verify_oauth2_token(google_token, google_requests.Request(), audience="934642464309-shokqbicjqngv3eo0a927fu9vd7qcuu6.apps.googleusercontent.com")
                google_email = idinfo.get('email')
                if not google_email:
                    raise ValueError("No email in token")
            except Exception as e:
                return Response({"detail": f"Invalid Google token: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            google_email = None

        user = authenticate(username=username, password=password)
        if not user:
            return Response({"detail": "Invalid credentials. Cannot setup MFA."}, status=status.HTTP_401_UNAUTHORIZED)

        user.security_question_1 = q1.strip()
        user.security_answer_1 = make_password(a1.strip().lower())
        user.security_question_2 = q2.strip()
        user.security_answer_2 = make_password(a2.strip().lower())
        if google_email:
            user.google_email = google_email
        user.save()

        return Response({"detail": "MFA setup complete. Please login again."}, status=status.HTTP_200_OK)
