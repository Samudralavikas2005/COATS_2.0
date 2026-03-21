import threading
import datetime
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework import status

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
