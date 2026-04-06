"""Authentication use-cases for login, registration, and token-ready user views."""

from app.core.security import create_access_token, hash_password, verify_password
from app.domain.constants import REGISTERABLE_ROLES
from app.infrastructure.repositories.role_repository import RoleRepository
from app.infrastructure.repositories.user_repository import UserRepository


class AuthService:
    @staticmethod
    def sanitize_user(user: dict) -> dict:
        """Shape database user records into the frontend-facing auth payload."""

        return {
            "id": user["id"],
            "email": user["email"],
            "firstName": user["first_name"],
            "lastName": user.get("last_name"),
            "phone": user.get("contact_number"),
            "role": user.get("role"),
        }

    @staticmethod
    def login(email: str, password: str):
        """Validate credentials and return the same auth contract used by the React app."""

        user = UserRepository.find_by_email(email.strip().lower())
        if not user or not verify_password(password, user.get("password_hash")):
            raise ValueError("Invalid email or password")
        token = create_access_token(
            {
                "id": user["id"],
                "email": user["email"],
                "first_name": user["first_name"],
                "last_name": user.get("last_name"),
                "role": user.get("role"),
            }
        )
        return {"token": token, "user": AuthService.sanitize_user(user)}

    @staticmethod
    def register(payload: dict):
        """Create a new non-admin user and issue a JWT immediately after registration."""

        role_name = payload.get("role")
        if role_name not in REGISTERABLE_ROLES:
            raise ValueError("Invalid role")
        existing = UserRepository.find_by_email(payload["email"].strip().lower())
        if existing:
            raise FileExistsError("Email already exists")
        role = RoleRepository.get_by_name(role_name)
        if not role:
            raise ValueError("Role not found")
        user = UserRepository.create(
            {
                "first_name": payload["firstName"],
                "last_name": payload.get("lastName"),
                "email": payload["email"].strip().lower(),
                "contact_number": payload.get("phone"),
                "password_hash": hash_password(payload["password"]),
                "role_id": role["id"],
            }
        )
        token = create_access_token(
            {
                "id": user["id"],
                "email": user["email"],
                "first_name": user["first_name"],
                "last_name": user.get("last_name"),
                "role": user.get("role"),
            }
        )
        return {"token": token, "user": AuthService.sanitize_user(user)}
